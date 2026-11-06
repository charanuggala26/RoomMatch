import mongoose from "mongoose";

export const CATEGORIES = ["rent", "electricity", "wifi", "grocery", "shared", "other"];

const expenseSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, default: "other" },
    amount: { type: Number, required: true, min: 0.01 },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Who owes how much for this expense (shares sum to amount)
    splits: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        share: { type: Number, required: true, min: 0 },
      },
    ],
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);
