import mongoose from "mongoose";

// A "settle up" payment: `from` paid `to` in real life.
const settlementSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0.01 },
  },
  { timestamps: true }
);

export default mongoose.model("Settlement", settlementSchema);
