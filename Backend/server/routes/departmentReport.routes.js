import express from "express";
import db from "../db.js";

const router = express.Router();

/* ================= PRINCIPAL SUMMARY ================= */
router.get("/summary", async (req, res) => {
  try {
    const [departments] = await db.query(
      "SELECT COUNT(DISTINCT department) AS totalDepartments FROM students"
    );

    const [lectures] = await db.query(
      "SELECT COUNT(*) AS totalLectures FROM timetable"
    );

    const [bunks] = await db.query(
      "SELECT COUNT(*) AS totalBunks FROM bunk_records WHERE status = 'bunk'"
    );

    const [present] = await db.query(
      "SELECT COUNT(*) AS totalPresent FROM bunk_records WHERE status = 'present'"
    );

    const totalBunks = Number(bunks[0]?.totalBunks || 0);
    const totalPresent = Number(present[0]?.totalPresent || 0);
    const totalRecords = totalBunks + totalPresent;

    const bunkPercentage =
      totalRecords > 0 ? ((totalBunks / totalRecords) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        totalDepartments: Number(departments[0]?.totalDepartments || 0),
        totalLectures: Number(lectures[0]?.totalLectures || 0),
        totalBunks,
        totalPresent,
        bunkPercentage,
      },
    });
  } catch (err) {
    console.log("Department summary error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ================= DEPARTMENT WISE BUNK REPORT ================= */
router.get("/bunk-report", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        s.department,
        COUNT(CASE WHEN b.status = 'bunk' THEN 1 END) AS total_bunk,
        COUNT(CASE WHEN b.status = 'present' THEN 1 END) AS total_present
      FROM bunk_records b
      INNER JOIN students s ON b.student_id = s.id
      GROUP BY s.department
      ORDER BY s.department ASC
    `);

    const data = rows.map((row) => {
      const bunk = Number(row.total_bunk || 0);
      const present = Number(row.total_present || 0);
      const total = bunk + present;

      return {
        department: row.department,
        bunk,
        present,
        percentage: total > 0 ? ((bunk / total) * 100).toFixed(1) : 0,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.log("Department bunk report error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ================= DEPARTMENT WISE LECTURE REPORT ================= */
router.get("/lecture-report", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        department,
        COUNT(*) AS total_lectures,
        SUM(CASE WHEN LOWER(TRIM(subject)) = 'off' THEN 1 ELSE 0 END) AS off_lectures,
        SUM(CASE WHEN isEdited = 1 THEN 1 ELSE 0 END) AS edited_lectures
      FROM timetable
      GROUP BY department
      ORDER BY department ASC
    `);

    const data = rows.map((row) => ({
      department: row.department,
      total_lectures: Number(row.total_lectures || 0),
      off_lectures: Number(row.off_lectures || 0),
      edited_lectures: Number(row.edited_lectures || 0),
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.log("Department lecture report error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ================= FACULTY REPORT ================= */
router.get("/faculty-report", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        teacher,
        department,
        COUNT(*) AS total_lectures,
        SUM(CASE WHEN isEdited = 1 THEN 1 ELSE 0 END) AS edited_lectures,
        SUM(CASE WHEN LOWER(TRIM(subject)) = 'off' THEN 1 ELSE 0 END) AS off_lectures
      FROM timetable
      WHERE teacher IS NOT NULL
        AND TRIM(teacher) <> ''
        AND TRIM(teacher) <> '-'
      GROUP BY teacher, department
      ORDER BY department ASC, teacher ASC
    `);

    const data = rows.map((row) => ({
      teacher: row.teacher,
      department: row.department,
      total_lectures: Number(row.total_lectures || 0),
      edited_lectures: Number(row.edited_lectures || 0),
      off_lectures: Number(row.off_lectures || 0),
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.log("Faculty report error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ================= HEALTH CHECK (DEBUG) ================= */
router.get("/test", (req, res) => {
  res.json({ message: "Department Report API Working ✅" });
});


/* ================= ALL DEPARTMENTS ================= */
router.get("/departments", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DISTINCT department FROM students ORDER BY department ASC"
    );

    res.json({
      success: true,
      data: rows.map((row) => row.department),
    });
  } catch (err) {
    console.log("Departments fetch error:", err);
    res.status(500).json({ success: false });
  }
});
export default router;