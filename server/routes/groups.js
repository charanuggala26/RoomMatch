import { Router } from "express";
import mongoose from "mongoose";
import Group from "../models/Group.js";
import User from "../models/User.js";
import Expense, { CATEGORIES } from "../models/Expense.js";
import Settlement from "../models/Settlement.js";
import auth from "../middleware/auth.js";
import { computeCompatibility } from "../utils/compatibility.js";
import { computeBalances, equalSplit } from "../utils/balances.js";
import { emitGroup, emitUser } from "../realtime.js";

const router = Router();
router.use(auth);

const fail = (res, status, message) => res.status(status).json({ message });

// Load the group and make sure the caller belongs to it
async function loadGroup(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Group not found");
  const group = await Group.findById(req.params.id).populate("members", "name email preferences profileComplete");
  if (!group) return fail(res, 404, "Group not found");
  if (!group.members.some((m) => m._id.equals(req.user._id))) return fail(res, 403, "You are not in this group");
  req.group = group;
  next();
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---- Groups ----
router.get("/", wrap(async (req, res) => {
  const groups = await Group.find({ members: req.user._id }).populate("members", "name email");
  res.json({ groups });
}));

router.post("/", wrap(async (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) return fail(res, 400, "Group name is required");
  const group = await Group.create({ name, members: [req.user._id], createdBy: req.user._id });
  res.status(201).json({ group });
}));

router.post("/join", wrap(async (req, res) => {
  const code = (req.body.inviteCode || "").trim().toUpperCase();
  const group = await Group.findOne({ inviteCode: code });
  if (!group) return fail(res, 404, "Invalid invite code");
  if (!group.members.some((m) => m.equals(req.user._id))) {
    group.members.push(req.user._id);
    await group.save();
    emitGroup(group._id, { type: "member:joined", by: req.user.name });
  }
  res.json({ group });
}));

router.get("/:id", loadGroup, wrap(async (req, res) => {
  const { group } = req;
  const memberIds = group.members.map((m) => m._id);
  const [expenses, settlements] = await Promise.all([
    Expense.find({ group: group._id }).sort({ date: -1, createdAt: -1 }),
    Settlement.find({ group: group._id }).sort({ createdAt: -1 }),
  ]);
  const { balances, transfers } = computeBalances(memberIds, expenses, settlements);

  // Pairwise compatibility inside the group
  const pairs = [];
  const ms = group.members.filter((m) => m.profileComplete);
  for (let i = 0; i < ms.length; i++) {
    for (let j = i + 1; j < ms.length; j++) {
      pairs.push({
        a: ms[i]._id,
        b: ms[j]._id,
        score: computeCompatibility(ms[i].preferences, ms[j].preferences).score,
      });
    }
  }

  const totalsByCategory = {};
  for (const e of expenses) totalsByCategory[e.category] = (totalsByCategory[e.category] || 0) + e.amount;

  res.json({
    group: {
      id: group._id,
      name: group.name,
      inviteCode: group.inviteCode,
      members: group.members.map((m) => ({ id: m._id, name: m.name, email: m.email })),
    },
    expenses,
    settlements,
    balances,
    transfers,
    pairs,
    totalsByCategory,
  });
}));

// Add a member directly by email (e.g. someone you matched with)
router.post("/:id/members", loadGroup, wrap(async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || "").toLowerCase() });
  if (!user) return fail(res, 404, "No user with that email");
  if (!req.group.members.some((m) => m._id.equals(user._id))) {
    req.group.members.push(user._id);
    await req.group.save();
    emitGroup(req.group._id, { type: "member:joined", by: user.name });
    emitUser(user._id, { groupId: String(req.group._id) });
  }
  res.json({ ok: true });
}));

// ---- Expenses ----
router.post("/:id/expenses", loadGroup, wrap(async (req, res) => {
  const { title, category, amount, paidBy, splitType = "equal", splitBetween, customShares, date } = req.body;
  const total = Number(amount);
  if (!title || !(total > 0)) return fail(res, 400, "Title and a positive amount are required");
  if (category && !CATEGORIES.includes(category)) return fail(res, 400, "Invalid category");

  const memberIds = req.group.members.map((m) => String(m._id));
  const payer = paidBy || String(req.user._id);
  if (!memberIds.includes(String(payer))) return fail(res, 400, "Payer must be a group member");

  let splits;
  if (splitType === "custom") {
    splits = (customShares || []).map((s) => ({ user: s.user, share: Number(s.share) }));
    const sum = splits.reduce((a, s) => a + s.share, 0);
    if (!splits.length || splits.some((s) => !memberIds.includes(String(s.user)) || !(s.share >= 0))) {
      return fail(res, 400, "Invalid custom shares");
    }
    if (Math.abs(sum - total) > 0.01) return fail(res, 400, `Shares add up to ${sum}, but the amount is ${total}`);
  } else {
    const people = (splitBetween && splitBetween.length ? splitBetween : memberIds).map(String);
    if (people.some((p) => !memberIds.includes(p))) return fail(res, 400, "Split includes a non-member");
    splits = equalSplit(total, people);
  }

  const expense = await Expense.create({
    group: req.group._id,
    title: title.trim(),
    category: category || "other",
    amount: total,
    paidBy: payer,
    splits,
    date: date || Date.now(),
  });
  emitGroup(req.group._id, { type: "expense:added", by: req.user.name, title: expense.title, amount: expense.amount });
  res.status(201).json({ expense });
}));

router.delete("/:id/expenses/:expenseId", loadGroup, wrap(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.expenseId, group: req.group._id });
  if (!expense) return fail(res, 404, "Expense not found");
  const isOwner = String(expense.paidBy) === String(req.user._id);
  const isCreator = String(req.group.createdBy) === String(req.user._id);
  if (!isOwner && !isCreator) return fail(res, 403, "Only the payer or group creator can delete this");
  await expense.deleteOne();
  emitGroup(req.group._id, { type: "expense:deleted", by: req.user.name, title: expense.title, amount: expense.amount });
  res.json({ ok: true });
}));

// ---- Settle up ----
router.post("/:id/settlements", loadGroup, wrap(async (req, res) => {
  const { to, amount } = req.body;
  const value = Number(amount);
  const memberIds = req.group.members.map((m) => String(m._id));
  if (!memberIds.includes(String(to)) || String(to) === String(req.user._id)) return fail(res, 400, "Invalid recipient");
  if (!(value > 0)) return fail(res, 400, "Amount must be positive");
  const settlement = await Settlement.create({ group: req.group._id, from: req.user._id, to, amount: value });
  const recipient = req.group.members.find((m) => String(m._id) === String(to));
  emitGroup(req.group._id, { type: "settlement:added", by: req.user.name, to: recipient?.name, amount: value });
  res.status(201).json({ settlement });
}));

export default router;
