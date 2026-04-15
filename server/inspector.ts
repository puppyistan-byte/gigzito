import fs from "fs";
import path from "path";

// ── Magic byte signatures (first bytes that identify real file types) ─────────
const MAGIC: Record<string, Array<{ bytes: number[]; offset: number }>> = {
  "image/jpeg":     [{ bytes: [0xFF, 0xD8, 0xFF], offset: 0 }],
  "image/png":      [{ bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], offset: 0 }],
  "image/gif":      [{ bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 }],
  "image/webp":     [{ bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
  "image/bmp":      [{ bytes: [0x42, 0x4D], offset: 0 }],
  "image/tiff":     [{ bytes: [0x49, 0x49, 0x2A, 0x00], offset: 0 }, { bytes: [0x4D, 0x4D, 0x00, 0x2A], offset: 0 }],
  "video/mp4":      [{ bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }],
  "video/quicktime":[{ bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, { bytes: [0x6D, 0x6F, 0x6F, 0x76], offset: 4 }],
  "video/webm":     [{ bytes: [0x1A, 0x45, 0xDF, 0xA3], offset: 0 }],
  "video/avi":      [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }],
  "audio/mpeg":     [{ bytes: [0x49, 0x44, 0x33], offset: 0 }, { bytes: [0xFF, 0xFB], offset: 0 }, { bytes: [0xFF, 0xF3], offset: 0 }],
  "audio/wav":      [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }],
  "audio/ogg":      [{ bytes: [0x4F, 0x67, 0x67, 0x53], offset: 0 }],
  "audio/flac":     [{ bytes: [0x66, 0x4C, 0x61, 0x43], offset: 0 }],
  "audio/aac":      [{ bytes: [0xFF, 0xF1], offset: 0 }, { bytes: [0xFF, 0xF9], offset: 0 }],
  "audio/m4a":      [{ bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }],
  "application/pdf":[{ bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 }],
};

// ── Contraband signatures — instant decline ────────────────────────────────────
const CONTRABAND: Buffer[] = [
  Buffer.from("<?php"),
  Buffer.from("<?PHP"),
  Buffer.from("<script"),
  Buffer.from("<SCRIPT"),
  Buffer.from("eval(base64_decode"),
  Buffer.from("system("),
  Buffer.from("exec("),
  Buffer.from("shell_exec("),
  Buffer.from("passthru("),
  Buffer.from("\x7fELF"),
];
const PE_HEADER = Buffer.from([0x4D, 0x5A]);

export interface InspectionResult {
  pass: boolean;
  reason?: string;
  detectedType?: string;
  aiCategories?: string[];
}

// ── Layer 1: Magic bytes + contraband signatures (synchronous, instant) ────────
export function inspectFileSync(filePath: string, declaredMime: string): InspectionResult {
  if (!fs.existsSync(filePath)) return { pass: false, reason: "File not found after upload" };

  const stat = fs.statSync(filePath);
  if (stat.size === 0) return { pass: false, reason: "Empty file — zero bytes" };

  const fd = fs.openSync(filePath, "r");
  const header = Buffer.alloc(512);
  const bytesRead = fs.readSync(fd, header, 0, 512, 0);
  fs.closeSync(fd);
  const head = header.slice(0, bytesRead);

  if (head.slice(0, 2).equals(PE_HEADER)) {
    return { pass: false, reason: "Windows executable disguised as media — contraband" };
  }

  for (const pattern of CONTRABAND) {
    if (head.indexOf(pattern) !== -1) {
      return { pass: false, reason: `Contraband signature detected: ${pattern.toString().replace(/[^\x20-\x7E]/g, "?")}` };
    }
  }

  const category = declaredMime.split("/")[0];
  let detectedType: string | null = null;

  for (const [mimeType, sigs] of Object.entries(MAGIC)) {
    for (const sig of sigs) {
      const slice = head.slice(sig.offset, sig.offset + sig.bytes.length);
      if (slice.length === sig.bytes.length && slice.every((b, i) => b === sig.bytes[i])) {
        detectedType = mimeType;
        break;
      }
    }
    if (detectedType) break;
  }

  if (detectedType) {
    const detectedCategory = detectedType.split("/")[0];
    if (detectedCategory !== category) {
      return {
        pass: false,
        reason: `File type mismatch: declared ${declaredMime} but detected ${detectedType}`,
        detectedType,
      };
    }
  }

  return { pass: true, detectedType: detectedType ?? declaredMime };
}

// ── Layer 2: Rocco — AI Vision content scan (async, images only) ───────────────
// Uses OpenAI GPT-4o-mini Vision. Falls back to PASS if API key not configured.
// Scans for: explicit nudity, violence/gore, hate symbols, drug content, weapons,
//            child safety violations, and other prohibited material.
export async function roccoScan(filePath: string, mimeType: string): Promise<InspectionResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Only scan image files with Rocco — video/audio handled by BIF scanner
  if (!mimeType.startsWith("image/")) {
    return { pass: true, reason: "Non-image: Rocco defers to BIF for AV content" };
  }

  if (!apiKey) {
    console.log("[Rocco] OPENAI_API_KEY not set — passing image without AI scan");
    return { pass: true, reason: "AI scan skipped: no API key configured" };
  }

  let base64Image: string;
  try {
    const imageBuffer = fs.readFileSync(filePath);
    // Cap at 4MB base64 to stay under OpenAI limits
    if (imageBuffer.length > 4 * 1024 * 1024) {
      console.log("[Rocco] Image too large for full scan — scanning first 4MB slice");
    }
    base64Image = imageBuffer.slice(0, 4 * 1024 * 1024).toString("base64");
  } catch (e) {
    console.error("[Rocco] Failed to read file for AI scan:", e);
    return { pass: true, reason: "AI scan skipped: file read error" };
  }

  const prompt = `You are Rocco, a strict content moderation AI for a social commerce platform.
Analyze this image and determine if it should be BLOCKED.

BLOCK if the image contains ANY of:
- Explicit nudity or sexual content
- Graphic violence or gore
- Hate symbols (Nazi imagery, KKK, etc.)
- Drug paraphernalia or drug use
- Weapons in a threatening context
- Content involving minors in any inappropriate way
- Spam or deceptive/fraudulent imagery
- Content that violates US federal law

PASS if it is a legitimate business, product, profile photo, artwork, or general content.

Respond ONLY with valid JSON, no markdown:
{"pass": true, "reason": "Clean business/personal content"} 
or
{"pass": false, "reason": "Specific violation found", "categories": ["nudity", "violence", etc]}`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: "low" },
            },
            { type: "text", text: prompt },
          ],
        }],
        max_tokens: 120,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      console.warn(`[Rocco] OpenAI API error ${resp.status} — passing without AI scan`);
      return { pass: true, reason: "AI scan skipped: API error" };
    }

    const data = await resp.json() as any;
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    let verdict: any;
    try {
      verdict = JSON.parse(content);
    } catch {
      // Try to extract JSON from response if wrapped in text
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { verdict = JSON.parse(match[0]); } catch { verdict = null; }
      }
    }

    if (!verdict || typeof verdict.pass !== "boolean") {
      console.warn(`[Rocco] Unparseable AI response: ${content} — passing`);
      return { pass: true, reason: "AI scan inconclusive — passed" };
    }

    if (!verdict.pass) {
      console.warn(`[Rocco] BLOCKED: ${verdict.reason} | categories: ${(verdict.categories ?? []).join(", ")}`);
      return {
        pass: false,
        reason: `Rocco blocked this image: ${verdict.reason}`,
        aiCategories: verdict.categories ?? [],
      };
    }

    console.log(`[Rocco] PASS: ${verdict.reason}`);
    return { pass: true, detectedType: mimeType, aiCategories: [] };

  } catch (e: any) {
    if (e?.name === "TimeoutError") {
      console.warn("[Rocco] AI scan timed out (10s) — passing");
    } else {
      console.error("[Rocco] Unexpected error during AI scan:", e);
    }
    return { pass: true, reason: "AI scan skipped: timeout/error" };
  }
}

// ── Utilities ──────────────────────────────────────────────────────────────────
export function moveToFinalDest(quarantinePath: string, finalDir: string, filename: string): string {
  const finalPath = path.join(finalDir, filename);
  fs.mkdirSync(finalDir, { recursive: true });
  fs.renameSync(quarantinePath, finalPath);
  return finalPath;
}

export function destroyContraband(filePath: string, reason: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.warn(`[Inspector] CONTRABAND DESTROYED: ${path.basename(filePath)} — ${reason}`);
    }
  } catch (e) {
    console.error(`[Inspector] Failed to destroy contraband at ${filePath}:`, e);
  }
}
