import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, required: true, trim: true, maxlength: 4000 },
  readAt: { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ from: 1, to: 1, createdAt: 1 });
export default mongoose.model("Message", messageSchema);
