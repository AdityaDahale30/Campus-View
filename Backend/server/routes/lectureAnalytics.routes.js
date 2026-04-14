import express from "express";
import db from "../db.js";

const router = express.Router();

/* MARK / UPDATE LECTURE */


router.post("/mark", async (req, res) => {

  console.log("🔥 API HIT");
console.log("BODY:", req.body);
  const {
    timetable_id,
    faculty_id,
    faculty_name,
    department,
    year,
    class_name,
    subject,
    lecture_date,
    day_name,
    lecture_number,
    time_slot,
    status,
    remark,
    marked_by
  } = req.body;

  try {
    if (!timetable_id || !faculty_id || !lecture_date || !status) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    console.log("CHECK DATA:", {
  timetable_id,
  faculty_id,
  lecture_date,
  status
});

await db.query(
  `INSERT INTO lecture_records
  (timetable_id, faculty_id, faculty_name, department, year, class_name, subject, lecture_date, day_name, lecture_number, time_slot, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    faculty_id = VALUES(faculty_id),
    faculty_name = VALUES(faculty_name),
    department = VALUES(department),
    year = VALUES(year),
    class_name = VALUES(class_name),
    subject = VALUES(subject),
    day_name = VALUES(day_name),
    lecture_number = VALUES(lecture_number),
    time_slot = VALUES(time_slot),
    status = VALUES(status)`,
  [
    timetable_id,
    faculty_id,
    faculty_name,
    department,
    year,
    class_name,
    subject,
    lecture_date,
    day_name,
    lecture_number,
    time_slot,
    status
  ]
);

    res.json({ success: true, message: "Lecture updated" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

/*====================================================================================================================*/

router.get("/faculty-summary/:facultyId", async (req, res) => {
  const { facultyId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT
        COUNT(CASE WHEN status='taken' THEN 1 END) AS taken,
        COUNT(CASE WHEN status='leave' THEN 1 END) AS leave_count,
        COUNT(CASE WHEN status='off' THEN 1 END) AS off_count
      FROM lecture_records
      WHERE faculty_id = ?`,
      [facultyId]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});
/*=============================================================================================================================*/

router.get("/department-summary", async (req, res) => {
  const { department } = req.query;

  try {
    let query = `
      SELECT
        faculty_id,
        faculty_name,
        department,
        COUNT(CASE WHEN status = 'taken' THEN 1 END) AS taken,
        COUNT(CASE WHEN status = 'leave' THEN 1 END) AS leave_count,
        COUNT(CASE WHEN status = 'off' THEN 1 END) AS off_count
      FROM lecture_records
    `;

    let params = [];

    if (department) {
      query += ` WHERE department = ? `;
      params.push(department);
    }

    query += `
      GROUP BY faculty_id, faculty_name, department
      ORDER BY faculty_name ASC
    `;

    const [rows] = await db.query(query, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.log("Department summary error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
/*========================================================================================================================*/

router.get("/records", async (req, res) => {
  const { faculty_id, department } = req.query;

  try {
    let query = "SELECT * FROM lecture_records WHERE 1=1";
    let params = [];

    if (faculty_id) {
      query += " AND faculty_id=?";
      params.push(faculty_id);
    }

    if (department) {
      query += " AND department=?";
      params.push(department);
    }

    query += " ORDER BY lecture_date DESC";

    const [rows] = await db.query(query, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/*=========================================================================================================================*/

router.get("/weekly", async (req, res) => {
  const { faculty_id } = req.query;

  try {
    const [rows] = await db.query(
      `SELECT 
        day_name,
        COUNT(*) as count
      FROM lecture_records
      WHERE faculty_id = ?
      GROUP BY day_name`,
      [faculty_id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.log("Weekly error:", err);
    res.status(500).json({ success: false });
  }
});

/*============================================================================================================================*/

router.get("/weekly-department", async (req, res) => {
  const { department } = req.query;

  try {
    let query = `
      SELECT day_name, COUNT(*) AS count
      FROM lecture_records
    `;
    const params = [];

    if (department) {
      query += ` WHERE department = ? `;
      params.push(department);
    }

    query += ` GROUP BY day_name `;

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.log("Weekly department error:", err);
    res.status(500).json({ success: false });
  }
});

/*====================================================================================================================*/

router.get("/monthly", async (req, res) => {
  const { faculty_id, department } = req.query;

  try {
    let query = `
      SELECT DATE_FORMAT(lecture_date, '%Y-%m') AS month,
             COUNT(CASE WHEN status='taken' THEN 1 END) AS taken,
             COUNT(CASE WHEN status='leave' THEN 1 END) AS leave_count,
             COUNT(CASE WHEN status='off' THEN 1 END) AS off_count
      FROM lecture_records
      WHERE 1=1
    `;
    const params = [];

    if (faculty_id) {
      query += ` AND faculty_id = ? `;
      params.push(faculty_id);
    }

    if (department) {
      query += ` AND department = ? `;
      params.push(department);
    }

    query += ` GROUP BY DATE_FORMAT(lecture_date, '%Y-%m') ORDER BY month ASC `;

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.log("Monthly analytics error:", err);
    res.status(500).json({ success: false });
  }
});

export default router;