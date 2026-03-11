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
        tls: { rejectUnauthorized: false },
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
