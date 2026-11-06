// Compatibility engine. Every factor returns a similarity in [0, 1];
// the final score is the weighted sum, and the per-factor breakdown is what
// powers the "Why are we compatible?" feature.

const WEIGHTS = {
  // Practical deal-breakers carry the most influence in shared housing.
  smoking: 14,
  foodHabits: 13,
  cleanliness: 13,
  budget: 13,
  pets: 10,
  guestFrequency: 9,
  location: 8,
  sleepSchedule: 6,
  noiseTolerance: 5,
  studyHabits: 3,
  choreStyle: 3,
  cookingFrequency: 3,
};

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0);

const LABELS = {
  sleepSchedule: "Sleep schedule",
  cleanliness: "Cleanliness",
  foodHabits: "Food habits",
  noiseTolerance: "Noise tolerance",
  studyHabits: "Study habits",
  guestFrequency: "Guests",
  smoking: "Smoking",
  pets: "Pets",
  choreStyle: "Chores",
  cookingFrequency: "Kitchen habits",
  budget: "Budget",
  location: "Location",
};

const SLEEP = { early: 0, flexible: 1, night: 2 };
const STUDY = { silent: 0, mixed: 1, social: 2 };
const GUESTS = { rarely: 0, sometimes: 1, often: 2 };
const SMOKING = { never: 0, outside: 1, indoors: 2 };
const PETS = { love: 0, okay: 1, avoid: 2 };
const CHORES = { together: 0, schedule: 1, flexible: 2 };
const COOKING = { rarely: 0, sometimes: 1, often: 2 };
// veg <-> nonveg is the hardest clash (shared kitchen, utensils)
const FOOD_SIM = {
  "veg|veg": 1,
  "eggetarian|eggetarian": 1,
  "nonveg|nonveg": 1,
  "veg|eggetarian": 0.6,
  "eggetarian|nonveg": 0.8,
  "veg|nonveg": 0.3,
};

const clamp = (n) => Math.max(0, Math.min(1, n));
const ordinalSim = (map, a, b) => 1 - Math.abs(map[a] - map[b]) / 2;
const scaleSim = (a, b) => 1 - Math.abs(a - b) / 4; // 1..5 scales

function foodSim(a, b) {
  return FOOD_SIM[`${a}|${b}`] ?? FOOD_SIM[`${b}|${a}`] ?? 0.5;
}

function budgetSim(a, b) {
  const lo = Math.max(a.budgetMin, b.budgetMin);
  const hi = Math.min(a.budgetMax, b.budgetMax);
  if (hi >= lo) {
    const smaller = Math.min(a.budgetMax - a.budgetMin, b.budgetMax - b.budgetMin) || 1;
    return clamp(0.5 + 0.5 * ((hi - lo) / smaller)); // any overlap is at least 50%
  }
  // No overlap: penalise by gap relative to the cheaper budget's ceiling
  const gap = lo - hi;
  const base = Math.min(a.budgetMax, b.budgetMax) || 1;
  return clamp(0.5 - gap / base);
}

function locationSim(a, b) {
  const x = (a || "").trim().toLowerCase();
  const y = (b || "").trim().toLowerCase();
  if (!x || !y) return 0.5; // unknown -> neutral
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.7;
  return 0;
}

function verdict(sim) {
  if (sim >= 0.85) return "great";
  if (sim >= 0.55) return "okay";
  return "clash";
}

const display = {
  sleepSchedule: (v) => ({ early: "Early bird", flexible: "Flexible", night: "Night owl" }[v]),
  foodHabits: (v) => ({ veg: "Vegetarian", eggetarian: "Eggetarian", nonveg: "Non-veg" }[v]),
  studyHabits: (v) => ({ silent: "Needs silence", mixed: "Mixed", social: "Group / social" }[v]),
  guestFrequency: (v) => ({ rarely: "Rarely", sometimes: "Sometimes", often: "Often" }[v]),
  smoking: (v) => ({ never: "Non-smoker", outside: "Outside only", indoors: "Smokes indoors" }[v]),
  pets: (v) => ({ love: "Loves pets", okay: "Pets are okay", avoid: "Prefers no pets" }[v]),
  choreStyle: (v) => ({ together: "Clean together", schedule: "Set rota", flexible: "As needed" }[v]),
  cookingFrequency: (v) => ({ rarely: "Rarely cooks", sometimes: "Cooks sometimes", often: "Cooks often" }[v]),
  cleanliness: (v) => `${v}/5`,
  noiseTolerance: (v) => `${v}/5`,
  location: (v) => v || "Not set",
};

function note(key, sim, a, b) {
  const v = verdict(sim);
  const msg = {
    sleepSchedule: {
      great: "You keep similar hours, so lights-out and alarms won't clash.",
      okay: "Slightly different sleep timings; manageable with some courtesy.",
      clash: "One of you sleeps early and the other late. Expect disturbances.",
    },
    cleanliness: {
      great: "You have the same standard of tidiness.",
      okay: "A small gap in cleanliness; agree on a cleaning rota.",
      clash: "Very different cleanliness standards, a common source of conflict.",
    },
    foodHabits: {
      great: "Your food habits line up, which makes a shared kitchen easy.",
      okay: "Mostly compatible diets; set kitchen ground rules.",
      clash: "Vegetarian vs non-veg can cause friction over cooking and utensils.",
    },
    noiseTolerance: {
      great: "You tolerate a similar level of noise.",
      okay: "Some difference in noise comfort; headphones will help.",
      clash: "One of you is much more sensitive to noise than the other.",
    },
    studyHabits: {
      great: "Your study styles fit together.",
      okay: "Study styles differ a little; a quiet-hours agreement helps.",
      clash: "Silent study vs a social study style will need clear boundaries.",
    },
    guestFrequency: {
      great: "You have similar expectations about having people over.",
      okay: "Agree on notice and shared-space rules for guests.",
      clash: "You differ on how often guests should visit; set boundaries early.",
    },
    smoking: {
      great: "Your smoking preferences are aligned.",
      okay: "Clarify where smoking is allowed before moving in.",
      clash: "Smoking preferences may affect comfort and shared-space rules.",
    },
    pets: {
      great: "You have similar comfort levels around pets.",
      okay: "Discuss pet care, shared areas and any allergies.",
      clash: "You have different pet preferences; resolve this before choosing a home.",
    },
    choreStyle: {
      great: "You prefer a similar approach to household chores.",
      okay: "A simple cleaning rota can bridge your different styles.",
      clash: "Agree on responsibilities to avoid an uneven share of housework.",
    },
    cookingFrequency: {
      great: "Your kitchen use is likely to fit well together.",
      okay: "Coordinate meal prep and shared kitchen time.",
      clash: "Different cooking routines may need kitchen schedules and storage rules.",
    },
    budget: {
      great: "Your budgets overlap comfortably.",
      okay: "Budgets overlap partly; the shared rent range is narrow.",
      clash: "Your budget ranges don't overlap, so rent may be a problem.",
    },
    location: {
      great: "You want the same area.",
      okay: "Your preferred areas are close or partly overlap.",
      clash: "You prefer different locations.",
    },
  };
  return msg[key][v];
}

export function computeCompatibility(a, b) {
  const preferences = (p) => ({
    guestFrequency: p.guestFrequency || "sometimes",
    smoking: p.smoking || "never",
    pets: p.pets || "okay",
    choreStyle: p.choreStyle || "schedule",
    cookingFrequency: p.cookingFrequency || "sometimes",
    ...p,
  });
  a = preferences(a);
  b = preferences(b);

  const sims = {
    sleepSchedule: ordinalSim(SLEEP, a.sleepSchedule, b.sleepSchedule),
    cleanliness: scaleSim(a.cleanliness, b.cleanliness),
    foodHabits: foodSim(a.foodHabits, b.foodHabits),
    noiseTolerance: scaleSim(a.noiseTolerance, b.noiseTolerance),
    studyHabits: ordinalSim(STUDY, a.studyHabits, b.studyHabits),
    guestFrequency: ordinalSim(GUESTS, a.guestFrequency, b.guestFrequency),
    smoking: ordinalSim(SMOKING, a.smoking, b.smoking),
    pets: ordinalSim(PETS, a.pets, b.pets),
    choreStyle: ordinalSim(CHORES, a.choreStyle, b.choreStyle),
    cookingFrequency: ordinalSim(COOKING, a.cookingFrequency, b.cookingFrequency),
    budget: budgetSim(a, b),
    location: locationSim(a.location, b.location),
  };

  const breakdown = Object.keys(WEIGHTS).map((key) => {
    const similarity = clamp(sims[key]);
    const isBudget = key === "budget";
    return {
      key,
      label: LABELS[key],
      weight: WEIGHTS[key],
      similarity: Math.round(similarity * 100) / 100,
      points: Math.round(similarity * WEIGHTS[key] * 10) / 10,
      verdict: verdict(similarity),
      yours: isBudget ? `₹${a.budgetMin}–₹${a.budgetMax}` : display[key](a[key]),
      theirs: isBudget ? `₹${b.budgetMin}–₹${b.budgetMax}` : display[key](b[key]),
      note: note(key, similarity, a, b),
    };
  });

  const score = Math.round((breakdown.reduce((sum, f) => sum + f.points, 0) / TOTAL_WEIGHT) * 100);
  return { score, breakdown };
}
