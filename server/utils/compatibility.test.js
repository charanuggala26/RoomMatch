import assert from "node:assert/strict";
import { computeCompatibility } from "./compatibility.js";

const base = {
  sleepSchedule: "night",
  foodHabits: "veg",
  cleanliness: 4,
  noiseTolerance: 3,
  studyHabits: "mixed",
  guestFrequency: "sometimes",
  smoking: "never",
  pets: "okay",
  choreStyle: "schedule",
  cookingFrequency: "sometimes",
  budgetMin: 4000,
  budgetMax: 8000,
  location: "Tirupati",
};

// Identical preferences -> perfect score
const same = computeCompatibility(base, { ...base });
assert.equal(same.score, 100);
assert.equal(same.breakdown.length, 12);
assert.equal(same.breakdown.reduce((sum, factor) => sum + factor.weight, 0), 100);

// Opposite preferences -> low score, with clashes flagged
const opposite = computeCompatibility(base, {
  sleepSchedule: "early",
  foodHabits: "nonveg",
  cleanliness: 1,
  noiseTolerance: 5,
  studyHabits: "social",
  guestFrequency: "often",
  smoking: "indoors",
  pets: "avoid",
  choreStyle: "flexible",
  cookingFrequency: "often",
  budgetMin: 15000,
  budgetMax: 20000,
  location: "Hyderabad",
});
assert.ok(opposite.score < 30, `expected low score, got ${opposite.score}`);
assert.ok(opposite.breakdown.every((f) => f.verdict === "clash"));

// Symmetry: score(a,b) === score(b,a)
const b = { ...base, sleepSchedule: "early", cleanliness: 2, budgetMin: 6000, budgetMax: 12000 };
assert.equal(computeCompatibility(base, b).score, computeCompatibility(b, base).score);

const legacy = { ...base };
delete legacy.guestFrequency;
delete legacy.smoking;
delete legacy.pets;
delete legacy.choreStyle;
delete legacy.cookingFrequency;
assert.equal(computeCompatibility(legacy, legacy).score, 100);
assert.ok(computeCompatibility(legacy, { ...legacy, smoking: "indoors" }).score < 100);

console.log("compatibility tests passed:", { same: same.score, opposite: opposite.score });
