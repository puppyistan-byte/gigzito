import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM ?? "Gigzito <noreply@gigzito.com>";

const DEV_MODE = !SMTP_HOST;

const BYPASS_EMAILS = new Set<string>();

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (DEV_MODE) {
      transporter = nodemailer.createTransport({ jsonTransport: true });
    } else {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        ...(SMTP_USER && SMTP_PASS ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
        tls: { rejectUnauthorized: true },
      });
    }
  }
  return transporter;
}

export interface SendMfaCodeResult {
  devMode: boolean;
  previewCode?: string;
}

export async function sendTriageNotification(
  toEmail: string,
  providerName: string,
  listingTitle: string,
  reason: string,
): Promise<{ devMode: boolean }> {
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid #222;">
      <img src="https://gigzito.com/gigzito-logo-v3.png" alt="Gigzito" style="height:32px;margin-bottom:24px;" />
      <h2 style="color:#f59e0b;font-size:20px;margin:0 0 8px;">Listing Pulled from Rotation</h2>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">Hi ${providerName},</p>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">
        Your listing has been moved out of the Gigzito video feed by our moderation team and placed in the 
        <strong style="color:#fff;">GigCard Directory</strong> for static ads.
      </p>
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
        <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px;">Listing</p>
        <p style="color:#fff;font-size:15px;font-weight:600;margin:0 0 12px;">${listingTitle}</p>
        <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px;">Reason</p>
        <p style="color:#f59e0b;font-size:13px;margin:0;">${reason}</p>
      </div>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">
        Gigzito's video feed is designed for short-form video content only. If your listing contains a 
        static image or non-video media, it will appear in the GigCard business directory instead.
      </p>
      <p style="color:#aaa;font-size:14px;margin:0 0 4px;">
        You can re-submit a video version at any time via your provider dashboard.
      </p>
      <hr style="border:none;border-top:1px solid #222;margin:24px 0;" />
      <p style="color:#555;font-size:12px;margin:0;">Questions? Reply to this email or visit gigzito.com/support.</p>
    </div>
  `;

  if (DEV_MODE) {
    console.log("\n");
    console.log("=".repeat(60));
    console.log("  [DEV MODE] Triage notification for:", toEmail);
    console.log("  Listing:", listingTitle);
    console.log("  Reason:", reason);
    console.log("=".repeat(60));
    console.log("\n");
    return { devMode: true };
  }

  await getTransporter().sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject: `Your Gigzito listing "${listingTitle}" has been moved to GigCard Directory`,
    html,
    text: `Hi ${providerName}, your listing "${listingTitle}" has been moved out of the video feed. Reason: ${reason}. It now appears in the GigCard business directory.`,
  });

  return { devMode: false };
}

export async function sendContentDisabledNotification(
  toEmail: string,
  providerName: string,
  listingTitle: string,
  reason: string,
): Promise<{ devMode: boolean }> {
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid #222;">
      <img src="https://gigzito.com/gigzito-logo-v3.png" alt="Gigzito" style="height:32px;margin-bottom:24px;" />
      <h2 style="color:#f59e0b;font-size:20px;margin:0 0 8px;">Your Video Has Been Disabled</h2>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">Hi ${providerName},</p>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">
        Our moderation team has temporarily disabled the following video from the Gigzito feed.
      </p>
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
        <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px;">Listing</p>
        <p style="color:#fff;font-size:15px;font-weight:600;margin:0 0 12px;">${listingTitle}</p>
        <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px;">Reason</p>
        <p style="color:#f59e0b;font-size:13px;margin:0;">${reason}</p>
      </div>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">
        If you believe this was made in error, please reach out to our support team. You may re-submit content that complies with our community guidelines via your provider dashboard.
      </p>
      <a href="https://gigzito.com/provider/me" style="display:inline-block;background:#ff2b2b;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:999px;text-decoration:none;margin-bottom:24px;">Go to Dashboard</a>
      <hr style="border:none;border-top:1px solid #222;margin:24px 0;" />
      <p style="color:#555;font-size:12px;margin:0;">Questions? Reply to this email or visit gigzito.com/support.</p>
    </div>
  `;

  if (DEV_MODE) {
    console.log("\n" + "=".repeat(60));
    console.log("  [DEV MODE] Content disabled notification for:", toEmail);
    console.log("  Listing:", listingTitle);
    console.log("  Reason:", reason);
    console.log("=".repeat(60) + "\n");
    return { devMode: true };
  }

  await getTransporter().sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject: `Your Gigzito video "${listingTitle}" has been disabled`,
    html,
    text: `Hi ${providerName}, your listing "${listingTitle}" has been disabled. Reason: ${reason}. Log in to your dashboard at gigzito.com/provider/me for more details.`,
  });
  return { devMode: false };
}

export async function sendContentDeletedNotification(
  toEmail: string,
  providerName: string,
  listingTitle: string,
  reason: string,
): Promise<{ devMode: boolean }> {
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid #222;">
      <img src="https://gigzito.com/gigzito-logo-v3.png" alt="Gigzito" style="height:32px;margin-bottom:24px;" />
      <h2 style="color:#ef4444;font-size:20px;margin:0 0 8px;">Your Video Has Been Removed</h2>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">Hi ${providerName},</p>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">
        Our moderation team has permanently removed the following listing from Gigzito.
      </p>
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
        <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px;">Listing</p>
        <p style="color:#fff;font-size:15px;font-weight:600;margin:0 0 12px;">${listingTitle}</p>
        <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px;">Reason</p>
        <p style="color:#ef4444;font-size:13px;margin:0;">${reason}</p>
      </div>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">
        This action is permanent. If you believe this was made in error, please contact our support team. You may submit new content that complies with our community guidelines.
      </p>
      <a href="https://gigzito.com/provider/new" style="display:inline-block;background:#ff2b2b;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:999px;text-decoration:none;margin-bottom:24px;">Submit New Video</a>
      <hr style="border:none;border-top:1px solid #222;margin:24px 0;" />
      <p style="color:#555;font-size:12px;margin:0;">Questions? Reply to this email or visit gigzito.com/support.</p>
    </div>
  `;

  if (DEV_MODE) {
    console.log("\n" + "=".repeat(60));
    console.log("  [DEV MODE] Content deleted notification for:", toEmail);
    console.log("  Listing:", listingTitle);
    console.log("  Reason:", reason);
    console.log("=".repeat(60) + "\n");
    return { devMode: true };
  }

  await getTransporter().sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject: `Your Gigzito video "${listingTitle}" has been permanently removed`,
    html,
    text: `Hi ${providerName}, your listing "${listingTitle}" has been permanently removed. Reason: ${reason}. Visit gigzito.com/provider/new to submit new content.`,
  });
  return { devMode: false };
}

export async function sendVerificationEmail(toEmail: string, verifyUrl: string): Promise<{ devMode: boolean; verifyUrl?: string }> {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid #222;">
      <img src="https://gigzito.com/gigzito-logo-v3.png" alt="Gigzito" style="height:32px;margin-bottom:24px;" />
      <h2 style="color:#fff;font-size:20px;margin:0 0 8px;">Verify your email</h2>
      <p style="color:#888;font-size:14px;margin:0 0 24px;">Click the button below to confirm your Gigzito account. This link expires in 24 hours.</p>
      <a href="${verifyUrl}" style="display:inline-block;background:#ff2b2b;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:999px;text-decoration:none;margin-bottom:24px;">Verify Email</a>
      <p style="color:#555;font-size:12px;margin:0;">If you didn't create a Gigzito account, you can safely ignore this email.</p>
    </div>
  `;

  // Bypass emails (e.g. admin) are always auto-verified
  if (BYPASS_EMAILS.has(toEmail.toLowerCase())) {
    console.log("\n" + "=".repeat(60));
    console.log("  [BYPASS] Auto-verified:", toEmail);
    console.log("=".repeat(60) + "\n");
    return { devMode: true };
  }

  // Dev mode: no SMTP configured — show link on screen so testing still works,
  // but DO NOT auto-verify (user must still click the link)
  if (DEV_MODE) {
    console.log("\n" + "=".repeat(60));
    console.log("  [DEV MODE] Verification link for:", toEmail);
    console.log("  URL:", verifyUrl);
    console.log("=".repeat(60) + "\n");
    return { devMode: true, verifyUrl };
  }

  await getTransporter().sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject: "Verify your Gigzito account",
    html,
    text: `Verify your Gigzito account by visiting: ${verifyUrl}`,
  });

  return { devMode: false };
}

export async function sendAdInquiryNotification(opts: {
  toEmail: string;
  advertiserUsername: string;
  viewerName: string;
  viewerEmail: string | undefined | null;
  viewerMessage: string;
  viewerUsername: string | null | undefined;
  viewerCity: string | null | undefined;
  viewerState: string | null | undefined;
  viewerCountry: string | null | undefined;
  adTitle: string;
}): Promise<{ devMode: boolean }> {
  const geoLine = [opts.viewerCity, opts.viewerState, opts.viewerCountry].filter(Boolean).join(", ");
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid #222;">
      <img src="https://gigzito.com/gigzito-logo-v3.png" alt="Gigzito" style="height:32px;margin-bottom:24px;" />
      <h2 style="color:#ff2b2b;font-size:20px;margin:0 0 8px;">New Ad Inquiry</h2>
      <p style="color:#aaa;font-size:14px;margin:0 0 20px;">Someone responded to your sponsor ad on Gigzito.</p>
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
        <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px;">Ad</p>
        <p style="color:#fff;font-size:15px;font-weight:600;margin:0 0 14px;">${opts.adTitle}</p>
        <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px;">From</p>
        <p style="color:#fff;font-size:14px;margin:0 0 2px;">${opts.viewerName}${opts.viewerUsername ? ` (@${opts.viewerUsername})` : ""}</p>
        ${opts.viewerEmail ? `<p style="color:#888;font-size:13px;margin:0 0 14px;">${opts.viewerEmail}</p>` : "<br/>"}
        ${geoLine ? `<p style="color:#888;font-size:12px;margin:0 0 14px;">📍 ${geoLine}</p>` : ""}
        <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px;">Message</p>
        <p style="color:#fff;font-size:14px;margin:0;">${opts.viewerMessage}</p>
      </div>
      <a href="https://gigzito.com/provider/me" style="display:inline-block;background:#ff2b2b;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:999px;text-decoration:none;margin-bottom:24px;">View in Dashboard</a>
      <hr style="border:none;border-top:1px solid #222;margin:24px 0;" />
      <p style="color:#555;font-size:12px;margin:0;">Reply directly to ${opts.viewerEmail ?? "the inquirer"} or check your Inquiries inbox at gigzito.com/provider/me.</p>
    </div>
  `;

  if (DEV_MODE) {
    console.log("\n" + "=".repeat(60));
    console.log("  [DEV MODE] Ad inquiry notification for:", opts.toEmail);
    console.log("  Ad:", opts.adTitle);
    console.log("  From:", opts.viewerName, opts.viewerEmail ?? "");
    console.log("  Message:", opts.viewerMessage);
    console.log("=".repeat(60) + "\n");
    return { devMode: true };
  }

  await getTransporter().sendMail({
    from: SMTP_FROM,
    to: opts.toEmail,
    subject: `New inquiry on your Gigzito ad "${opts.adTitle}"`,
    html,
    text: `New inquiry from ${opts.viewerName}${opts.viewerEmail ? ` (${opts.viewerEmail})` : ""}: ${opts.viewerMessage}. View at gigzito.com/provider/me`,
  });

  return { devMode: false };
}

export async function sendAudienceBroadcast(opts: {
  toEmail: string;
  senderName: string;
  subject: string;
  body: string;
}): Promise<{ devMode: boolean }> {
  const html = `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid #222;">
      <img src="https://gigzito.com/gigzito-logo-v3.png" alt="Gigzito" style="height:32px;margin-bottom:24px;" />
      <p style="color:#888;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em;">Message from ${opts.senderName}</p>
      <h2 style="color:#fff;font-size:20px;margin:0 0 20px;">${opts.subject}</h2>
      <div style="background:#111;border:1px solid #222;border-radius:10px;padding:20px;margin-bottom:24px;color:#ccc;font-size:14px;line-height:1.7;white-space:pre-wrap;">${opts.body}</div>
      <hr style="border:none;border-top:1px solid #222;margin:24px 0;" />
      <p style="color:#444;font-size:11px;margin:0;">You received this because you opted in via a Gigzito provider listing. To unsubscribe, reply with "unsubscribe".</p>
    </div>
  `;

  if (DEV_MODE) {
    console.log("\n" + "=".repeat(60));
    console.log("  [DEV MODE] Audience broadcast for:", opts.toEmail);
    console.log("  From:", opts.senderName);
    console.log("  Subject:", opts.subject);
    console.log("  Body:", opts.body.substring(0, 100));
    console.log("=".repeat(60) + "\n");
    return { devMode: true };
  }

  await getTransporter().sendMail({
    from: SMTP_FROM,
    to: opts.toEmail,
    subject: `${opts.subject} — via Gigzito`,
    html,
    text: `${opts.senderName}: ${opts.subject}\n\n${opts.body}`,
  });

  return { devMode: false };
}

export async function sendGZMusicAnnouncement(opts: {
  toEmail: string;
  senderName: string;
  trackTitle: string;
  trackArtist: string;
  trackGenre: string;
  coverUrl?: string | null;
  message?: string | null;
  fileUrl?: string | null;
  downloadEnabled?: boolean;
  listenUrl?: string;
}): Promise<{ devMode: boolean }> {
  const listenUrl = opts.listenUrl ?? "https://gigzito.com/gz-music";
  const coverBlock = opts.coverUrl
    ? `<img src="${opts.coverUrl}" alt="Cover Art" style="width:100%;max-width:220px;border-radius:10px;margin:0 auto 20px;display:block;border:1px solid #222;" />`
    : `<div style="width:100%;max-width:220px;height:100px;background:#111;border-radius:10px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;color:#ff7a00;font-size:28px;border:1px solid #2a2a2a;">🎵</div>`;
  const downloadLine = opts.downloadEnabled && opts.fileUrl
    ? `<a href="https://gigzito.com${opts.fileUrl}" style="display:inline-block;margin-top:8px;padding:8px 16px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;color:#aaa;font-size:12px;text-decoration:none;">⬇ Download Track</a>`
    : "";
  const msgBlock = opts.message
    ? `<div style="background:#111;border:1px solid #222;border-radius:10px;padding:16px;margin:16px 0;color:#ccc;font-size:14px;line-height:1.7;white-space:pre-wrap;">${opts.message}</div>`
    : "";
  const html = `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid #222;">
      <img src="https://gigzito.com/gigzito-logo-v3.png" alt="Gigzito" style="height:30px;margin-bottom:24px;" />
      <p style="color:#ff7a00;font-size:11px;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:.08em;">🎵 New Track on GZMusic</p>
      <h2 style="color:#fff;font-size:22px;margin:0 0 4px;">${opts.trackTitle}</h2>
      <p style="color:#888;font-size:14px;margin:0 0 24px;">by ${opts.trackArtist}${opts.trackGenre ? ` · ${opts.trackGenre}` : ""}</p>
      ${coverBlock}
      ${msgBlock}
      <a href="${listenUrl}" style="display:block;text-align:center;padding:14px 24px;background:linear-gradient(135deg,#ff7a00,#cc5200);color:#fff;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;margin-top:4px;">🎧 Listen on GZ100</a>
      ${downloadLine}
      <hr style="border:none;border-top:1px solid #1e1e1e;margin:28px 0;" />
      <p style="color:#333;font-size:11px;margin:0;">Announced by ${opts.senderName} via Gigzito GZMusic. To unsubscribe, reply "unsubscribe".</p>
    </div>
  `;
  if (DEV_MODE) {
    console.log("\n" + "=".repeat(60));
    console.log("  [DEV MODE] GZMusic announcement to:", opts.toEmail);
    console.log("  Track:", opts.trackTitle, "by", opts.trackArtist);
    console.log("=".repeat(60) + "\n");
    return { devMode: true };
  }
  await getTransporter().sendMail({
    from: SMTP_FROM,
    to: opts.toEmail,
    subject: `New Track: "${opts.trackTitle}" by ${opts.trackArtist} — via Gigzito GZMusic`,
    html,
    text: `${opts.senderName} just dropped a new track on GZMusic!\n\n${opts.trackTitle} by ${opts.trackArtist}\nGenre: ${opts.trackGenre}\n\nListen: ${listenUrl}`,
  });
  return { devMode: false };
}

export async function sendEmail(opts: { toEmail: string; subject: string; html: string; text?: string }): Promise<{ devMode: boolean }> {
  if (DEV_MODE) {
    console.log("\n" + "=".repeat(60));
    console.log("  [DEV MODE] sendEmail to:", opts.toEmail);
    console.log("  Subject:", opts.subject);
    console.log("=".repeat(60) + "\n");
    return { devMode: true };
  }
  await getTransporter().sendMail({
    from: SMTP_FROM,
    to: opts.toEmail,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? opts.subject,
  });
  return { devMode: false };
}

export async function sendMassNotification(opts: {
  toEmail: string;
  toName: string;
  subject: string;
  message: string;
}): Promise<{ devMode: boolean }> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#1a0000 0%,#0a0a0a 100%);border:1px solid #2a0000;border-radius:20px 20px 0 0;padding:36px 40px 28px;text-align:center;">
    <div style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#ff2b2b;margin-bottom:4px;">GIGZITO</div>
    <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:4px;">Platform Update</div>
  </td></tr>

  <!-- FROM BADGE -->
  <tr><td style="background:#0d0d0d;border-left:1px solid #1a1a1a;border-right:1px solid #1a1a1a;padding:24px 40px 0;">
    <div style="display:inline-block;background:#ff2b2b18;border:1px solid #ff2b2b30;border-radius:999px;padding:6px 16px;margin-bottom:20px;">
      <span style="font-size:11px;color:#ff2b2b;font-weight:700;text-transform:uppercase;letter-spacing:2px;">From Gigzito Webmaster</span>
    </div>
  </td></tr>

  <!-- SUBJECT -->
  <tr><td style="background:#0d0d0d;border-left:1px solid #1a1a1a;border-right:1px solid #1a1a1a;padding:4px 40px 24px;">
    <h1 style="font-size:26px;font-weight:900;color:#fff;margin:0 0 8px;line-height:1.25;">${opts.subject}</h1>
    ${opts.toName ? `<p style="color:#555;font-size:13px;margin:0;">Hi ${opts.toName},</p>` : ""}
  </td></tr>

  <!-- MESSAGE BODY -->
  <tr><td style="background:#0a0a0a;border-left:1px solid #1a1a1a;border-right:1px solid #1a1a1a;padding:28px 40px;">
    <div style="background:#111;border:1px solid #222;border-radius:12px;padding:24px 28px;color:#ccc;font-size:15px;line-height:1.8;white-space:pre-wrap;">${opts.message.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:linear-gradient(135deg,#1a0000 0%,#0a0a0a 100%);border:1px solid #2a0000;border-radius:0 0 20px 20px;padding:28px 40px;text-align:center;">
    <a href="https://gigzito.com" style="display:inline-block;background:#ff2b2b;color:#fff;font-weight:700;font-size:14px;padding:12px 32px;border-radius:999px;text-decoration:none;margin-bottom:20px;">
      Visit Gigzito →
    </a>
    <p style="color:#444;font-size:11px;margin:0;">
      Sent by Gigzito Webmaster · <a href="https://gigzito.com" style="color:#555;text-decoration:none;">gigzito.com</a>
    </p>
    <p style="color:#333;font-size:10px;margin:8px 0 0;">You are receiving this as a registered Gigzito member. To unsubscribe, reply with "unsubscribe".</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  if (DEV_MODE) {
    console.log("\n" + "=".repeat(60));
    console.log("  [DEV MODE] Mass notification to:", opts.toEmail);
    console.log("  Subject:", opts.subject);
    console.log("  Preview:", opts.message.substring(0, 80));
    console.log("=".repeat(60) + "\n");
    return { devMode: true };
  }

  await getTransporter().sendMail({
    from: `Gigzito Webmaster <${SMTP_USER ?? "noreply@gigzito.com"}>`,
    to: opts.toEmail,
    subject: opts.subject,
    html,
    text: `${opts.subject}\n\n${opts.message}\n\n— Gigzito Webmaster`,
  });

  return { devMode: false };
}

export async function sendInvitationEmail(opts: {
  senderName: string;
  senderEmail: string;
  targetName: string;
  targetEmail: string;
  landingUrl: string;
}): Promise<{ devMode: boolean }> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#1a0000 0%,#0a0a0a 100%);border:1px solid #2a0000;border-radius:20px 20px 0 0;padding:40px 40px 32px;text-align:center;">
    <div style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#ff2b2b;margin-bottom:6px;">GIGZITO</div>
    <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:4px;">Social Commerce Platform</div>
  </td></tr>

  <!-- PERSONAL NOTE -->
  <tr><td style="background:#0d0d0d;border-left:1px solid #1a1a1a;border-right:1px solid #1a1a1a;padding:32px 40px;">
    <div style="background:#ff2b2b18;border:1px solid #ff2b2b30;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
      <div style="font-size:11px;color:#ff2b2b;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Personal Invitation</div>
      <div style="font-size:16px;color:#fff;font-weight:600;">
        ${opts.senderName} <span style="color:#666;font-weight:400;">( ${opts.senderEmail} )</span> invited you to Gigzito.
      </div>
    </div>
    <h1 style="font-size:32px;font-weight:900;color:#fff;margin:0 0 12px;line-height:1.2;">
      Hi ${opts.targetName},<br>
      <span style="color:#ff2b2b;">You're in.</span>
    </h1>
    <p style="color:#aaa;font-size:16px;line-height:1.7;margin:0 0 24px;">
      ${opts.senderName} thinks you belong in an ecosystem where creators, consumers, and businesses grow together in one place. They're probably right.
    </p>
    <p style="color:#777;font-size:14px;line-height:1.7;margin:0;">
      Gigzito is the first platform that combines TikTok-style video discovery, live broadcasting, digital identity cards, geo-triggered promotions, flash deals, and real engagement analytics — all in one connected system designed so that <strong style="color:#fff;">every participant's success feeds someone else's growth.</strong>
    </p>
  </td></tr>

  <!-- FEATURE BLOCKS -->
  <tr><td style="background:#0a0a0a;border-left:1px solid #1a1a1a;border-right:1px solid #1a1a1a;padding:8px 40px 28px;">
    <div style="font-size:11px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:20px;">What's Inside</div>

    <!-- Feature rows -->
    ${[
      { color:"#ff2b2b", emoji:"📹", title:"The Video Feed", body:"A TikTok-style vertical scroll where creators and businesses publish short-form video to be discovered. Your story, on an open stage." },
      { color:"#3b82f6", emoji:"📺", title:"Zito TV — Live Broadcasting", body:"Go live or relay your stream from another platform. Gigzito captures your engagement metrics either way, giving you insight no other platform offers." },
      { color:"#a855f7", emoji:"🃏", title:"GeeZee Cards — Your Digital Identity", body:"A personal intro card, creator profile, and consumer advantage card all in one. Listed in the GeeZee Rolodex so others can find and connect with you." },
      { color:"#f59e0b", emoji:"⚡", title:"GigJack Flash Events", body:"Time-locked, seat-limited experiences. Live bookings, skill sessions, and flash deals that vanish when the clock hits zero. The community that moves fast wins." },
      { color:"#22c55e", emoji:"📍", title:"Geo Push Campaigns", body:"Walking near a partner business? Your phone knows. Members receive exclusive real-time offers triggered by location. Foot traffic becomes customers." },
      { color:"#ff2b2b", emoji:"📊", title:"GZMetrics — Real Analytics", body:"Watch time, returning viewers, audience demographics, CTA clicks. Intelligence that creates strategy, not just vanity numbers." },
    ].map(f => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr>
      <td width="44" valign="top" style="padding-top:2px;">
        <div style="width:36px;height:36px;background:${f.color}20;border:1px solid ${f.color}40;border-radius:10px;text-align:center;line-height:36px;font-size:16px;">${f.emoji}</div>
      </td>
      <td style="padding-left:14px;">
        <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:3px;">${f.title}</div>
        <div style="font-size:13px;color:#777;line-height:1.6;">${f.body}</div>
      </td>
    </tr>
    </table>`).join("")}
  </td></tr>

  <!-- TIERS -->
  <tr><td style="background:#0d0d0d;border-left:1px solid #1a1a1a;border-right:1px solid #1a1a1a;padding:28px 40px;">
    <div style="font-size:11px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:20px;">Membership Tiers</div>
    <table width="100%" cellpadding="0" cellspacing="0">
    ${[
      { name:"GZLurker", price:"Free", color:"#9ca3af", desc:"Full feed access, GeeZee Card, flash coupons, geo offers, ZitoTV." },
      { name:"GZMarketer", price:"$12/mo", color:"#3b82f6", desc:"+ Video listings, Audience Aggregator, broadcast tools, GZMetrics." },
      { name:"GZMarketerPro", price:"$15/mo", color:"#a855f7", desc:"+ GigJack Events, All Eyes On Me slots, ZitoTV presenter access." },
      { name:"GZBusiness", price:"$25/mo", color:"#f59e0b", desc:"+ GZFlash Ad Center, Geo Push Campaigns, Preemptive Marketing, sponsor placements." },
    ].map(t => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;">
        <table width="100%"><tr>
          <td><div style="font-size:13px;font-weight:700;color:${t.color};">${t.name}</div><div style="font-size:12px;color:#666;margin-top:2px;">${t.desc}</div></td>
          <td align="right" style="white-space:nowrap;"><div style="font-size:14px;font-weight:900;color:#fff;">${t.price}</div></td>
        </tr></table>
      </td>
    </tr>`).join("")}
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="background:linear-gradient(135deg,#1a0000 0%,#0a0a0a 100%);border:1px solid #2a0000;border-radius:0 0 20px 20px;padding:36px 40px;text-align:center;">
    <p style="color:#888;font-size:14px;margin:0 0 24px;">Start free. No credit card. Join the ecosystem that gives you an unfair advantage.</p>
    <a href="${opts.landingUrl}" style="display:inline-block;background:#ff2b2b;color:#fff;font-weight:900;font-size:16px;padding:16px 40px;border-radius:999px;text-decoration:none;letter-spacing:.3px;">
      Claim Your Invitation →
    </a>
    <p style="color:#444;font-size:11px;margin:28px 0 0;">
      Invited by ${opts.senderName} · Sent by Gigzito Marketing · <a href="https://gigzito.com" style="color:#555;text-decoration:none;">gigzito.com</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  if (DEV_MODE) {
    console.log("\n" + "=".repeat(60));
    console.log("  [DEV MODE] Invitation email to:", opts.targetEmail);
    console.log("  From:", opts.senderName, `<${opts.senderEmail}>`);
    console.log("  Landing URL:", opts.landingUrl);
    console.log("=".repeat(60) + "\n");
    return { devMode: true };
  }

  await getTransporter().sendMail({
    from: SMTP_FROM,
    to: opts.targetEmail,
    subject: `${opts.senderName} invited you to Gigzito — The Ecosystem That Gives You an Unfair Advantage`,
    html,
    text: `Hi ${opts.targetName},\n\n${opts.senderName} (${opts.senderEmail}) has personally invited you to join Gigzito — a social commerce platform combining video discovery, live broadcasting, digital identity, geo-triggered promotions, and flash deals in one ecosystem.\n\nSee the full invitation and join free at:\n${opts.landingUrl}\n\n— Gigzito Marketing`,
  });

  return { devMode: false };
}

export async function sendMfaCode(toEmail: string, code: string): Promise<SendMfaCodeResult> {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:12px;border:1px solid #222;">
      <img src="https://gigzito.com/gigzito-logo-v3.png" alt="Gigzito" style="height:32px;margin-bottom:24px;" />
      <h2 style="color:#fff;font-size:20px;margin:0 0 8px;">Verify your login</h2>
      <p style="color:#888;font-size:14px;margin:0 0 24px;">Enter the code below to complete your sign-in. It expires in 10 minutes.</p>
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
        <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#ff2b2b;">${code}</span>
      </div>
      <p style="color:#555;font-size:12px;margin:0;">If you didn't request this code, you can safely ignore this email.</p>
    </div>
  `;

  if (DEV_MODE || BYPASS_EMAILS.has(toEmail.toLowerCase())) {
    console.log("\n");
    console.log("=".repeat(60));
    console.log("  [BYPASS] MFA Code for:", toEmail);
    console.log("  Code:", code);
    console.log("=".repeat(60));
    console.log("\n");
    return { devMode: true, previewCode: code };
  }

  await getTransporter().sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject: `${code} — Your Gigzito verification code`,
    html,
    text: `Your Gigzito verification code is: ${code}. It expires in 10 minutes.`,
  });

  return { devMode: false };
}

export async function sendGroupInviteEmail(opts: {
  toEmail: string;
  groupName: string;
  inviterName: string;
  joinUrl: string;
  isNewUser: boolean;
}): Promise<{ devMode: boolean }> {
  const { toEmail, groupName, inviterName, joinUrl, isNewUser } = opts;
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;color:#e0e0e0}
.wrap{max-width:520px;margin:0 auto;padding:32px 16px}
.logo{font-size:28px;font-weight:900;color:#ff3333;letter-spacing:-1px;margin-bottom:4px}
.sub{font-size:12px;color:#555;margin-bottom:32px}
.card{background:#141414;border:1px solid #222;border-radius:12px;padding:28px}
h2{margin:0 0 8px;font-size:20px;color:#fff}
p{margin:12px 0;font-size:14px;line-height:1.6;color:#aaa}
.btn{display:inline-block;margin-top:20px;padding:13px 28px;background:#ff3333;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px}
.footer{margin-top:24px;font-size:11px;color:#444;text-align:center}
</style></head><body>
<div class="wrap">
  <div class="logo">Gigzito</div>
  <div class="sub">Getcho Gig On</div>
  <div class="card">
    <h2>You've been invited to join <span style="color:#ff3333">${groupName}</span></h2>
    <p><strong style="color:#fff">${inviterName}</strong> invited you to join their private group on Gigzito.</p>
    ${isNewUser ? `<p>You'll need to create a free Gigzito account first — it only takes a minute. Once you sign up, you'll be taken straight into the group.</p>` : `<p>Click below to accept your invitation and join the group.</p>`}
    <a href="${joinUrl}" class="btn">${isNewUser ? "Create Account & Join Group" : "Accept Invitation"}</a>
  </div>
  <div class="footer">This invite expires in 7 days. If you didn't expect this email, you can ignore it.</div>
</div>
</body></html>`;
  return sendEmail({ toEmail, subject: `${inviterName} invited you to ${groupName} on Gigzito`, html });
}
