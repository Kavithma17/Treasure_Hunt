import express from "express";
import Leaderboard from "../models/Leaderboard.js";

const router = express.Router();

// 🟦 Save time taken
router.post("/submit", async (req, res) => {
  try {
    const { playerName, timeTakenSec } = req.body;

    if (!playerName || timeTakenSec === undefined) {
      return res.status(400).json({ error: "Missing playerName or timeTakenSec" });
    }

    const entry = await Leaderboard.create({
      playerName,
      timeTakenSec,
    });

    res.json({ message: "Time saved", entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟦 Fetch leaderboard sorted by FASTEST time
router.get("/", async (req, res) => {
  try {
    const board = await Leaderboard.find()
      .sort({ timeTakenSec: 1 })   // 🟦 lowest time = #1
      .limit(20);

    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
