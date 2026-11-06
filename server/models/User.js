import mongoose from "mongoose";

const preferencesSchema = new mongoose.Schema(
  {
    sleepSchedule: { type: String, enum: ["early", "flexible", "night"], default: "flexible" },
    foodHabits: { type: String, enum: ["veg", "eggetarian", "nonveg"], default: "veg" },
    cleanliness: { type: Number, min: 1, max: 5, default: 3 },
    noiseTolerance: { type: Number, min: 1, max: 5, default: 3 },
    studyHabits: { type: String, enum: ["silent", "mixed", "social"], default: "mixed" },
    guestFrequency: { type: String, enum: ["rarely", "sometimes", "often"], default: "sometimes" },
    smoking: { type: String, enum: ["never", "outside", "indoors"], default: "never" },
    pets: { type: String, enum: ["love", "okay", "avoid"], default: "okay" },
    choreStyle: { type: String, enum: ["together", "schedule", "flexible"], default: "schedule" },
    cookingFrequency: { type: String, enum: ["rarely", "sometimes", "often"], default: "sometimes" },
    budgetMin: { type: Number, default: 3000 },
    budgetMax: { type: Number, default: 8000 },
    location: { type: String, default: "" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    preferences: { type: preferencesSchema, default: () => ({}) },
    profileComplete: { type: Boolean, default: false },
    movingOutDate: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
