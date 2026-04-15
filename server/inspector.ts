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
  Buffer.from("\x7fELF"),           // Linux ELF executable
];
// Windows PE (MZ) only at byte 0
const PE_HEADER = Buffer.from([0x4D, 0x5A]);

export interface InspectionResult {
  pass: boolean;
  reason?: string;
  detectedType?: string;
}

export function inspectFileSync(filePath: string, declaredMime: string): InspectionResult {
  if (!fs.existsSync(filePath)) return { pass: false, reason: "File not found after upload" };

  const stat = fs.statSync(filePath);
  if (stat.size === 0) return { pass: false, reason: "Empty file — zero bytes" };

  // Read first 512 bytes for magic byte + contraband checks
  const fd = fs.openSync(filePath, "r");
  const header = Buffer.alloc(512);
  const bytesRead = fs.readSync(fd, header, 0, 512, 0);
  fs.closeSync(fd);
  const head = header.slice(0, bytesRead);

  // Windows PE executable at offset 0
  if (head.slice(0, 2).equals(PE_HEADER)) {
    return { pass: false, reason: "Windows executable disguised as media — contraband" };
  }

  // Scan for contraband code patterns
  for (const pattern of CONTRABAND) {
    if (head.indexOf(pattern) !== -1) {
      return { pass: false, reason: `Contraband signature detected: ${pattern.toString().replace(/[^\x20-\x7E]/g, "?")}` };
    }
  }

  // Magic byte verification
  const category = declaredMime.split("/")[0]; // "image" | "video" | "audio" | "application"
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

  // If we detected a type and it's in a DIFFERENT category — decline
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
  // Unknown type but passes contraband check — allow (be permissive for exotic codecs)

  return { pass: true, detectedType: detectedType ?? declaredMime };
}

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
