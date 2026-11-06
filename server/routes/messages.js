import { Router } from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
import Message from "../models/Message.js";

const router = Router();
router.use(auth);
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get("/contacts", wrap(async (req, res) => {
  const sent = await Message.distinct("to", { from: req.user._id });
  const received = await Message.distinct("from", { to: req.user._id });
  const ids = [...new Set([...sent, ...received].map(String))];
  const users = await User.find({ _id: { $in: ids } }).select("name email");
  res.json({ contacts: users });
}));

router.get("/:userId", wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ message: "Invalid contact" });
  const other = await User.findById(req.params.userId).select("name email");
  if (!other) return res.status(404).json({ message: "User not found" });
  const messages = await Message.find({
    $or: [
      { from: req.user._id, to: other._id },
      { from: other._id, to: req.user._id },
    ],
  }).sort({ createdAt: 1 }).limit(300);
  await Message.updateMany({ from: other._id, to: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ contact: other, messages });
}));

router.post("/:userId", wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ message: "Invalid contact" });
  const body = String(req.body.body || "").trim();
  if (!body || body.length > 4000) return res.status(400).json({ message: "Message must be between 1 and 4000 characters" });
  const other = await User.findById(req.params.userId);
  if (!other) return res.status(404).json({ message: "User not found" });
  const message = await Message.create({ from: req.user._id, to: other._id, body });
  res.status(201).json({ message });
}));

router.post("/:userId/email", wrap(async (req, res) => {
  if (!process.env.BREVO_API_KEY) return res.status(503).json({ message: "Email is not configured yet. Add BREVO_API_KEY to server/.env." });
  if (!process.env.BREVO_SENDER_EMAIL) return res.status(503).json({ message: "Set BREVO_SENDER_EMAIL in server/.env before sending email." });
  const other = await User.findById(req.params.userId).select("name email");
  if (!other) return res.status(404).json({ message: "User not found" });
  const subject = String(req.body.subject || "").trim().slice(0, 160);
  const content = String(req.body.message || "").trim().slice(0, 5000);
  if (!subject || !content) return res.status(400).json({ message: "Email subject and message are required" });
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "accept": "application/json", "api-key": process.env.BREVO_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || "RoomMatch", email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: other.email, name: other.name }],
      replyTo: { email: req.user.email, name: req.user.name },
      subject,
      textContent: `${content}\n\nReply directly to ${req.user.email} to contact ${req.user.name}.`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Brevo send failed:", response.status, detail);
    return res.status(502).json({ message: "Brevo could not send the email. Check your API key and verified sender." });
  }
  res.json({ ok: true });
}));

export default router;
