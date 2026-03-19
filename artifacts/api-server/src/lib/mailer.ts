import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM = "Gigzito <noreply@gigzito.com>",
} = process.env;

const devMode = !SMTP_HOST || !SMTP_USER || !SMTP_PASS;

const transporter = devMode
  ? null
  : nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `https://gigzito.com/reset-password?token=${token}`;

  if (devMode || !transporter) {
    console.log("\n=== PASSWORD RESET (DEV MODE) ===");
    console.log(`To: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log("================================\n");
    return;
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: "Reset your Gigzito password",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0d0d0d;color:#fff;border-radius:16px">
        <img src="https://gigzito.com/assets/logo.png" alt="Gigzito" style="height:40px;margin-bottom:24px"/>
        <h2 style="color:#fff;margin:0 0 8px">Reset your password</h2>
        <p style="color:#888;font-size:15px;line-height:1.6;margin:0 0 24px">
          We received a request to reset the password for your Gigzito account.
          Click the button below to choose a new password. This link expires in <strong style="color:#fff">1 hour</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#9933FF;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;margin-bottom:24px">
          Reset Password
        </a>
        <p style="color:#555;font-size:13px;margin:0">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
      </div>
    `,
  });
}
