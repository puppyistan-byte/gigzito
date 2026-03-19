import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "@workspace/db";
import { sendPasswordResetEmail } from "../lib/mailer.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

/* ─────────────────────────────────────────────
   POST /api/auth/forgot-password
   Public — always returns ok (no email enumeration)
───────────────────────────────────────────── */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ message: "Email is required" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (rows.length > 0) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await pool.query(
        `UPDATE users
         SET "passwordResetToken" = $1, "passwordResetExpiresAt" = $2
         WHERE id = $3`,
        [token, expiresAt, rows[0].id]
      );

      await sendPasswordResetEmail(email.trim().toLowerCase(), token);
    }

    // Always return ok — prevents email enumeration
    res.json({ ok: true });
  } catch (err) {
    console.error("forgot-password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ─────────────────────────────────────────────
   POST /api/auth/reset-password
   Public — validates token, updates password
───────────────────────────────────────────── */
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body ?? {};
  if (!token || !password) {
    res.status(400).json({ message: "Token and new password are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id FROM users
       WHERE "passwordResetToken" = $1
         AND "passwordResetExpiresAt" > NOW()
       LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      res.status(400).json({ message: "Reset link is invalid or has expired" });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);

    await pool.query(
      `UPDATE users
       SET password = $1, "passwordResetToken" = NULL, "passwordResetExpiresAt" = NULL
       WHERE id = $2`,
      [hashed, rows[0].id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("reset-password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ─────────────────────────────────────────────
   POST /api/auth/change-password
   Authenticated — verifies current password
───────────────────────────────────────────── */
router.post("/change-password", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { currentPassword, newPassword } = req.body ?? {};

  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: "Current and new password are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ message: "New password must be at least 8 characters" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT password FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) {
      res.status(401).json({ message: "Current password is incorrect" });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashed, userId]);

    res.json({ ok: true });
  } catch (err) {
    console.error("change-password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ─────────────────────────────────────────────
   POST /api/auth/mfa/reset
   Authenticated — disables MFA for user
───────────────────────────────────────────── */
router.post("/mfa/reset", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  try {
    await pool.query(
      `UPDATE users
       SET "mfaEnabled" = false, "mfaSecret" = NULL
       WHERE id = $1`,
      [userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("mfa-reset error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
