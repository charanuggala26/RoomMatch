import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = Router();

const sign = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  preferences: u.preferences,
  profileComplete: u.profileComplete,
  movingOutDate: u.movingOutDate,
});

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ message: "Email already registered" });
    }
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get("/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

router.put("/preferences", auth, async (req, res, next) => {
  try {
    const p = req.body;
    const budgetMin = Number(p.budgetMin);
    const budgetMax = Number(p.budgetMax);
    if (!(budgetMin >= 0) || !(budgetMax >= budgetMin)) {
      return res.status(400).json({ message: "Budget max must be greater than or equal to budget min" });
    }
    req.user.preferences = {
      sleepSchedule: p.sleepSchedule,
      foodHabits: p.foodHabits,
      cleanliness: Number(p.cleanliness),
      noiseTolerance: Number(p.noiseTolerance),
      studyHabits: p.studyHabits,
      guestFrequency: p.guestFrequency || "sometimes",
      smoking: p.smoking || "never",
      pets: p.pets || "okay",
      choreStyle: p.choreStyle || "schedule",
      cookingFrequency: p.cookingFrequency || "sometimes",
      budgetMin,
      budgetMax,
      location: (p.location || "").trim(),
      movingOutDate: p.movingOutDate ? new Date(p.movingOutDate) : null,
    };
    req.user.movingOutDate = p.movingOutDate ? new Date(p.movingOutDate) : null;
    req.user.profileComplete = true;
    await req.user.save(); // schema enums/min/max validate the rest
    res.json({ user: publicUser(req.user) });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
    next(err);
  }
});

export default router;
