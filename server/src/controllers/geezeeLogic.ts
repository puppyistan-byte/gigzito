import { Request, Response } from 'express';
import pool from '../db'; 

export const sendInquiry = async (req: Request, res: Response) => {
  const { senderId, receiverId, type } = req.body;
  try {
    await pool.query(
      'INSERT INTO flame_inquiries (sender_id, receiver_id, intent_type, status) VALUES ($1, $2, $3, $4)',
      [senderId, receiverId, type, 'pending']
    );
    res.status(200).json({ success: true, message: 'Flame Ignited' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Vault Connection Failed' });
  }
};
