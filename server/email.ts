import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM ?? "Gigzito <noreply@gigzito.com>";

const DEV_MODE = !SMTP_HOST || !SMTP_USER || !SMTP_PASS;

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
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
    }
  }
  return transporter;
}

export interface SendMfaCodeResult {
  devMode: boolean;
  previewCode?: string;
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

  if (DEV_MODE) {
    console.log("\n");
    console.log("=".repeat(60));
    console.log("  [DEV MODE] MFA Code for:", toEmail);
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
