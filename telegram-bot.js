import axios from "axios";
import os from "os";
import fs from "fs";

const TOKEN = "8741716806:AAHM8snR6y0t7YlIQIoC9ApierS60UwE8PQ".trim();
const BASE = `https://api.telegram.org/bot${TOKEN}`;
const ADMIN_ID = 1753989947;
const BIF_API = "http://localhost:8000/scan";

let lastUpdate = 0;

async function send(chatId, text) {
  try { await axios.post(`${BASE}/sendMessage`, { chat_id: chatId, text: text, parse_mode: "Markdown" }); } catch (e) {}
}

async function bifScan(msg) {
  try {
    const fileId = msg.video?.file_id || msg.photo?.pop()?.file_id || msg.document?.file_id;
    if (!fileId) return;
    
    const fileInfo = await axios.get(`${BASE}/getFile?file_id=${fileId}`);
    const filePath = fileInfo.data.result.file_path;
    const response = await axios({ url: `https://api.telegram.org/file/bot${TOKEN}/${filePath}`, method: 'GET', responseType: 'arraybuffer' });
    const localPath = `/opt/gigzito/uploads/${fileId}.jpg`;
    
    fs.writeFileSync(localPath, response.data);
    const scan = await axios.post(BIF_API, { file_path: localPath });
    const scores = scan.data.scores;
    
    if (scores.porn > 0.8 || scores.hentai > 0.8) {
      await send(ADMIN_ID, `💌 *Bif Love Note*\n👤 *User:* ${msg.from?.first_name || "Unknown"}\n🚫 *Status:* BLOCKED\n📊 *Score:* ${Math.round(scores.porn * 100)}%`);
      await axios.post(`${BASE}/deleteMessage`, { chat_id: msg.chat.id, message_id: msg.message_id });
    }
  } catch (err) { console.log("Bif Error:", err.message); }
}

async function checkUpdates() {
  try {
    const res = await axios.get(`${BASE}/getUpdates`, { params: { offset: lastUpdate + 1, timeout: 20 } });
    for (const u of res.data.result || []) {
      lastUpdate = u.update_id;
      if (!u.message) continue;
      if (u.message.text) {
        if (u.message.text.startsWith("/ping")) await send(u.message.chat.id, "✅ Bif is active in Oregon.");
      } else {
        await bifScan(u.message);
      }
    }
  } catch (e) {}
  setTimeout(checkUpdates, 3000);
}

checkUpdates();
console.log("Sentry Bot Online.");
