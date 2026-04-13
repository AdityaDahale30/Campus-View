import express from "express";
import db from "../db.js";

const router = express.Router();

/* GET STUDENT BADGE BY ENROLLMENT */
router.get("/student-badge/:enrollmentNo", async (req, res) => {
  const { enrollmentNo } = req.params;

  try {
    const [students] = await db.query(
      "SELECT id FROM students WHERE enrollment = ?",
      [enrollmentNo]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const studentId = students[0].id;

    const [rows] = await db.query(
      `
      SELECT 
        COUNT(*) AS totalLectures,
        SUM(CASE WHEN status = 'bunk' THEN 1 ELSE 0 END) AS bunkLectures
      FROM bunk_records
      WHERE student_id = ?
      AND YEARWEEK(lecture_date, 1) = YEARWEEK(CURDATE(), 1)
      `,
      [studentId]
    );

    const totalLectures = rows[0]?.totalLectures || 0;
    const bunkLectures = rows[0]?.bunkLectures || 0;

    const bunkPercent =
      totalLectures > 0 ? (bunkLectures / totalLectures) * 100 : 0;


let badge = "gold";

if (bunkPercent > 25) {
  badge = "bronze";
} else if (bunkPercent > 10) {
  badge = "silver";
}

    res.json({
      success: true,
      totalLectures,
      bunkLectures,
      bunkPercent: Number(bunkPercent.toFixed(2)),
      badge,
    });
  } catch (err) {
    console.log("Badge route error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;