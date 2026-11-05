import mongoose from "mongoose";
import crypto from "crypto";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    inviteCode: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(3).toString("hex").toUpperCase(),
    },
  },
  { timestamps: true }
);

export default mongoose.model("Group", groupSchema);
