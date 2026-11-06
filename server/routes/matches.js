import { Router } from "express";
import User from "../models/User.js";
import Group from "../models/Group.js";
import auth from "../middleware/auth.js";
import { computeCompatibility } from "../utils/compatibility.js";

const router = Router();
router.use(auth);

const needProfile = (req, res) => {
  if (!req.user.profileComplete) {
    res.status(400).json({ message: "Complete your preferences first" });
    return true;
  }
  return false;
};

// Ranked list of other users by compatibility
router.get("/", async (req, res, next) => {
  try {
    if (needProfile(req, res)) return;
    const activeGroups = await Group.find({ members: req.user._id }).select("members");
    const myGroupIds = activeGroups.map((g) => String(g._id));
    const today = new Date();
    const others = await User.find({
      _id: { $ne: req.user._id },
      profileComplete: true,
    }).select("-password");
    const occupied = await Group.find({ members: { $in: others.map((o) => o._id) } }).select("members");
    const inHome = new Set(occupied.flatMap((g) => g.members.map((id) => String(id))));
    const ninetyDays = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const ownMovingOut = req.user.movingOutDate && new Date(req.user.movingOutDate) >= today && new Date(req.user.movingOutDate) <= ninetyDays;
    if (myGroupIds.length && !ownMovingOut) {
      return res.json({ matches: [], blockedByHome: true, message: "Set your moving-out date in Preferences to discover future roommates." });
    }
    const matches = others
      .map((o) => {
        const { score, breakdown } = computeCompatibility(req.user.preferences, o.preferences);
        return {
          id: o._id,
          name: o.name,
          email: o.email,
          location: o.preferences.location,
          availableFrom: o.movingOutDate,
          score,
          strengths: breakdown.filter((f) => f.verdict === "great").map((f) => f.label),
          concerns: breakdown.filter((f) => f.verdict === "clash").map((f) => f.label),
        };
      })
      .filter((m) => {
        if (!inHome.has(String(m.id))) return true;
        const candidate = others.find((o) => String(o._id) === String(m.id));
        return Boolean(candidate?.movingOutDate && new Date(candidate.movingOutDate) >= today && new Date(candidate.movingOutDate) <= ninetyDays);
      })
      .sort((a, b) => b.score - a.score);
    res.json({ matches });
  } catch (err) {
    next(err);
  }
});

// "Why are we compatible?" - full per-preference breakdown for one user
router.get("/:userId/explain", async (req, res, next) => {
  try {
    if (needProfile(req, res)) return;
    const other = await User.findById(req.params.userId).select("-password");
    if (!other || !other.profileComplete) return res.status(404).json({ message: "User not found" });
    const { score, breakdown } = computeCompatibility(req.user.preferences, other.preferences);
    const sorted = [...breakdown].sort((a, b) => b.similarity - a.similarity);
    res.json({
      user: { id: other._id, name: other.name },
      score,
      breakdown,
      strengths: sorted.filter((f) => f.verdict === "great").map((f) => f.label),
      concerns: sorted.filter((f) => f.verdict === "clash").map((f) => f.label),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
