import express from "express";
import db from "../db.js";

const router = express.Router();

/* =========================================================== MANUAL MARK ============================================================ */

router.post("/mark-bunk", async (req, res) => {
  const {
    student_id,
    timetable_id,
    lecture_date,
    day_name,
    lecture_number,
    subject,
    teacher,
    status,
  } = req.body;

  try {
    if (!student_id || !timetable_id || !lecture_date || !subject || !status) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (subject.trim().toLowerCase() === "off") {
      return res.json({
        success: false,
        message: "OFF lecture not counted",
      });
    }

    await db.query(
      `
      INSERT INTO bunk_records
      (student_id, timetable_id, lecture_date, day_name, lecture_number, subject, teacher, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      status = VALUES(status)
      `,
      [
        student_id,
        timetable_id,
        lecture_date,
        day_name,
        lecture_number,
        subject,
        teacher || "",
        status,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("Mark bunk error:", err);
    res.status(500).json({ success: false });
  }
});

/* ========================================================= AUTO EVALUATE =========================================================== */

router.post("/evaluate-lecture-bunk", async (req, res) => {
  const {
    student_id,
    timetable_id,
    lecture_date,
    day_name,
    lecture_number,
    subject,
    teacher,
    lecture_start,
    lecture_end,
  } = req.body;

  try {
    if (!student_id || !lecture_start || !lecture_end) {
      return res.status(400).json({ success: false });
    }

    // 🔥 Ignore OFF lecture
    if (subject && subject.trim().toLowerCase() === "off") {
      return res.json({ success: true, status: "ignored" });
    }

    const [rows] = await db.query(
      `
      SELECT COUNT(*) AS detections
      FROM roaming_logs
      WHERE student_id = ?
      AND detected_at BETWEEN ? AND ?
      `,
      [student_id, lecture_start, lecture_end]
    );

    const detections = rows[0]?.detections || 0;

    // 🔥 MAIN LOGIC
    const status = detections > 0 ? "bunk" : "present";

    await db.query(
      `
      INSERT INTO bunk_records
      (student_id, timetable_id, lecture_date, day_name, lecture_number, subject, teacher, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      status = VALUES(status)
      `,
      [
        student_id,
        timetable_id,
        lecture_date,
        day_name,
        lecture_number,
        subject,
        teacher || "",
        status,
      ]
    );

    res.json({
      success: true,
      status,
      detections,
    });

  } catch (err) {
    console.log("Evaluate error:", err);
    res.status(500).json({ success: false });
  }
});

/* =========================================================== GET ALL RECORDS ======================================================= */

router.get("/bunk/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const [rows] = await db.query(
      `
      SELECT * FROM bunk_records
      WHERE student_id = ?
      ORDER BY lecture_date DESC, id DESC
      `,
      [studentId]
    );

    res.json({
      success: true,
      records: rows,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================== WEEKLY GRAPH ============================================================= */

router.get("/bunk/student/:studentId/weekly", async (req, res) => {
  try {
    const { studentId } = req.params;

    const [rows] = await db.query(
      `
      SELECT LOWER(day_name) AS day_name, COUNT(*) AS bunk_count
      FROM bunk_records
      WHERE student_id = ?
      AND status = 'bunk'
      GROUP BY LOWER(day_name)
      `,
      [studentId]
    );

    res.json({
      success: true,
      weeklyData: rows,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

export default router;