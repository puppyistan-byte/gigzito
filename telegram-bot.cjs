const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const DIRECTIVE_FORWARD_CHAT_ID =
  process.env.DIRECTIVE_FORWARD_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "";
const PORT = parseInt(process.env.BOT_PORT || "3001", 10);

const DIRECTIVE_STORE = process.env.DIRECTIVE_STORE || "/opt/gigzito/directives.json";
const DEPLOY_CMD =
  process.env.DEPLOY_CMD ||
  "cd /opt/gigzito && git pull origin main && npm run build && pm2 restart gigzito";
const LOG_CMD =
  process.env.LOG_CMD || "pm2 logs gigzito --lines 40 --nostream";

if (!BOT_TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

if (!ALLOWED_CHAT_ID) {
  console.error("Missing TELEGRAM_CHAT_ID");
  process.exit(1);
}

let lastUpdateId = 0;

function ensureDirectiveStore() {
  const dir = path.dirname(DIRECTIVE_STORE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DIRECTIVE_STORE)) {
    fs.writeFileSync(
      DIRECTIVE_STORE,
      JSON.stringify({ nextId: 1, directives: [] }, null, 2),
      "utf8"
    );
  }
}

function loadDirectiveStore() {
  ensureDirectiveStore();
  return JSON.parse(fs.readFileSync(DIRECTIVE_STORE, "utf8"));
}

function saveDirectiveStore(data) {
  fs.writeFileSync(DIRECTIVE_STORE, JSON.stringify(data, null, 2), "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function telegramRequest(method, payload = {}) {
  const postData = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${BOT_TOKEN}/${method}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            if (!parsed.ok) {
              reject(new Error(`Telegram API error on ${method}: ${body}`));
              return;
            }
            resolve(parsed.result);
          } catch (err) {
            reject(new Error(`Invalid Telegram response on ${method}: ${body}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function sendMessage(chatId, text, extra = {}) {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: extra.parse_mode || undefined,
    disable_web_page_preview: true,
  });
}

function runShell(command, timeoutMs = 120000) {
  return new Promise((resolve) => {
    exec(
      command,
      {
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024 * 4,
        shell: "/bin/bash",
      },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error && typeof error.code === "number" ? error.code : 0,
          stdout: stdout || "",
          stderr: stderr || "",
          error: error ? error.message : "",
        });
      }
    );
  });
}

function trimOutput(text, max = 3500) {
  const clean = (text || "").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max) + "\n...[truncated]";
}

function parseDirective(text) {
  const firstSpace = text.indexOf(" ");
  if (firstSpace === -1) return "";
  return text.slice(firstSpace + 1).trim();
}

function formatDirectiveSummary(d) {
  return [
    `#${d.id} [${d.status}]`,
    `Created: ${d.createdAt}`,
    `Owner: ${d.owner}`,
    `Delegate: ${d.delegate}`,
    `Priority: ${d.priority}`,
    `Text: ${d.text}`,
  ].join("\n");
}

async function createDirective(rawText, fromUser) {
  const store = loadDirectiveStore();
  const directive = {
    id: store.nextId++,
    text: rawText,
    owner: "Max",
    delegate: "Development Lead",
    priority: "high",
    status: "queued",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    createdBy: {
      id: fromUser?.id || null,
      username: fromUser?.username || "",
      firstName: fromUser?.first_name || "",
      lastName: fromUser?.last_name || "",
    },
  };

  store.directives.unshift(directive);
  saveDirectiveStore(store);

  let forwarded = false;
  if (DIRECTIVE_FORWARD_CHAT_ID) {
    try {
      await sendMessage(
        DIRECTIVE_FORWARD_CHAT_ID,
        `MAX DIRECTIVE LOGGED\n\n${formatDirectiveSummary(directive)}`
      );
      forwarded = true;
    } catch (err) {
      console.error("Failed to forward directive:", err.message);
    }
  }

  return { directive, forwarded };
}

function listRecentDirectives(limit = 5) {
  const store = loadDirectiveStore();
  return store.directives.slice(0, limit);
}

function updateDirectiveStatus(id, status) {
  const store = loadDirectiveStore();
  const directive = store.directives.find((d) => d.id === id);
  if (!directive) return null;
  directive.status = status;
  directive.updatedAt = nowIso();
  saveDirectiveStore(store);
  return directive;
}

async function handleCommand(message) {
  const chatId = String(message.chat.id);
  const text = (message.text || "").trim();
  const from = message.from || {};

  if (chatId !== String(ALLOWED_CHAT_ID)) {
    await sendMessage(chatId, "Unauthorized chat.");
    return;
  }

  if (text === "/start" || text === "/help") {
    await sendMessage(
      chatId,
      [
        "Max online.",
        "",
        "Commands:",
        "/ping",
        "/logs",
        "/deploy",
        "/directive <text>",
        "/directives",
        "/directive_status <id> <queued|delegated|in_progress|done>",
      ].join("\n")
    );
    return;
  }

  if (text === "/ping") {
    await sendMessage(chatId, "pong");
    return;
  }

  if (text === "/logs") {
    await sendMessage(chatId, "Fetching latest Gigzito logs...");
    const result = await runShell(LOG_CMD, 30000);
    const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
    await sendMessage(
      chatId,
      `LOGS\n\n${trimOutput(combined || "No log output returned.")}`
    );
    return;
  }

  if (text === "/deploy") {
    await sendMessage(chatId, "Starting production deploy...");
    const result = await runShell(DEPLOY_CMD, 10 * 60 * 1000);
    const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
    const status = result.ok ? "DEPLOY COMPLETE" : `DEPLOY FAILED (code ${result.code})`;
    await sendMessage(chatId, `${status}\n\n${trimOutput(combined || result.error)}`);
    return;
  }

  if (text.startsWith("/directive ")) {
    const directiveText = parseDirective(text);
    if (!directiveText) {
      await sendMessage(chatId, "Usage: /directive <text>");
      return;
    }

    const { directive, forwarded } = await createDirective(directiveText, from);

    await sendMessage(
      chatId,
      [
        "Directive received and logged.",
        `ID: ${directive.id}`,
        `Status: ${directive.status}`,
        `Forwarded: ${forwarded ? "yes" : "no"}`,
      ].join("\n")
    );
    return;
  }

  if (text === "/directives") {
    const items = listRecentDirectives(5);
    if (!items.length) {
      await sendMessage(chatId, "No directives logged.");
      return;
    }

    const body = items
      .map((d) => `#${d.id} [${d.status}] ${d.text}`)
      .join("\n\n");

    await sendMessage(chatId, `Recent directives:\n\n${body}`);
    return;
  }

  if (text.startsWith("/directive_status ")) {
    const parts = text.split(/\s+/);
    if (parts.length < 3) {
      await sendMessage(
        chatId,
        "Usage: /directive_status <id> <queued|delegated|in_progress|done>"
      );
      return;
    }

    const id = Number(parts[1]);
    const status = parts[2].trim();

    if (!Number.isInteger(id)) {
      await sendMessage(chatId, "Directive ID must be a number.");
      return;
    }

    const allowed = new Set(["queued", "delegated", "in_progress", "done"]);
    if (!allowed.has(status)) {
      await sendMessage(chatId, "Invalid status.");
      return;
    }

    const updated = updateDirectiveStatus(id, status);
    if (!updated) {
      await sendMessage(chatId, `Directive #${id} not found.`);
      return;
    }

    await sendMessage(chatId, `Directive #${id} updated to ${status}.`);
    return;
  }

  await sendMessage(chatId, "Unknown command. Try /help");
}

async function pollUpdates() {
  try {
    const result = await telegramRequest("getUpdates", {
      offset: lastUpdateId + 1,
      timeout: 25,
      allowed_updates: ["message"],
    });

    for (const update of result) {
      lastUpdateId = update.update_id;
      if (update.message && update.message.text) {
        try {
          await handleCommand(update.message);
        } catch (err) {
          console.error("Command handling error:", err);
          const safeChatId = update.message?.chat?.id;
          if (safeChatId) {
            try {
              await sendMessage(String(safeChatId), `Command error: ${err.message}`);
            } catch (_) {}
          }
        }
      }
    }
  } catch (err) {
    console.error("Polling error:", err.message);
  } finally {
    setTimeout(pollUpdates, 1000);
  }
}

http
  .createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "max-bot" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Max bot is online.\n");
  })
  .listen(PORT, () => {
    console.log(`Max bot listening on port ${PORT}`);
    ensureDirectiveStore();
    pollUpdates();
  });
