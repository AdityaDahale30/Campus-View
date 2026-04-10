import express from "express";
import db from "../db.js";

const router = express.Router();

/* STORE ROAMING DETECTION */
router.post("/roaming-detect", async (req, res) => {
  const { student_id, camera_location } = req.body;

  try {
    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: "student_id is required",
      });
    }

    await db.query(
      `
      INSERT INTO roaming_logs (student_id, camera_location)
      VALUES (?, ?)
      `,
      [student_id, camera_location || "campus_camera"]
    );

    res.json({
      success: true,
      message: "Roaming detection stored successfully",
    });
  } catch (err) {
    console.log("Roaming detect error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;