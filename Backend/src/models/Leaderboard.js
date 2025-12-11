import mongoose from "mongoose";

const leaderboardSchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  timeTakenSec: { type: Number, required: true }, // 🟦 important
  finishedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Leaderboard", leaderboardSchema);
