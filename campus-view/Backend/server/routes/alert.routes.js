import express from "express";
import db from "../db.js";

const router = express.Router();

/* ================= TEST MODE (FOR DEVELOPMENT) ================= */
const TEST_MODE = true;

/* =========================================================
   CREATE ALERT
========================================================= */
router.post("/create-alert", async (req, res) => {
  try {
    const { student_id, message } = req.body;

    if (!student_id || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    const [studentRows] = await db.query(
      "SELECT name FROM students WHERE id = ?",
      [student_id]
    );

    const studentName = studentRows[0]?.name || "Unknown";

    const [result] = await db.query(
      `
      INSERT INTO alerts 
      (student_id, student_name, faculty_name, faculty_role, title, message, subject, lecture_number, lecture_date, detected_at, camera_location, is_read, faculty_read, tg_read, hod_read)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 0, 0, 0, 0)
      `,
      [
        student_id,
        studentName,
        "Auto System",
        "system",
        "Roaming Alert",
        message,
        "-",
        0,
        new Date().toISOString().slice(0, 10),
        "unknown_location",
      ]
    );

    const alertId = result.insertId;

    console.log("✅ Alert inserted, ID:", alertId);

    await processAlert(alertId);

    res.json({
      success: true,
      message: "Alert created",
    });

  } catch (err) {
    console.log("❌ Alert error:", err);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* =========================================================
   📱 SMS FUNCTION (SIMULATION)
========================================================= */
async function sendSMS(phone, message) {
  try {
    console.log("📱 SMS SENT TO:", phone);
    console.log("📩 MESSAGE:", message);

    await db.query(
      `INSERT INTO sms_logs (phone_number, message) VALUES (?, ?)`,
      [phone, message]
    );

  } catch (err) {
    console.log("❌ SMS error:", err);
  }
}

/* =========================================================
   🔥 MAIN PROCESS FUNCTION
========================================================= */
async function processAlert(alertId) {
  try {
    console.log("🔥 processAlert CALLED");
    console.log("🚀 Processing alert:", alertId);

    const [alertRows] = await db.query(
      "SELECT * FROM alerts WHERE id = ?",
      [alertId]
    );

    const alert = alertRows[0];
    if (!alert) return;

    const [studentRows] = await db.query(
      "SELECT * FROM students WHERE id = ?",
      [alert.student_id]
    );

    const student = studentRows[0];
    if (!student) return;

    console.log("🎓 Student:", student.name);

    const now = new Date();

    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    const startTime = 8 * 60 + 30;
    const endTime = 15 * 60 + 30;

    if (!TEST_MODE && (currentTimeInMinutes < startTime || currentTimeInMinutes > endTime)) {
      console.log("⏰ Outside college hours → Alert ignored");
      return;
    }

    let dayName = new Date().toLocaleString("en-US", {
      weekday: "long",
    });

    if (TEST_MODE) dayName = "Monday";

    const normalize = (value) =>
      String(value || "").trim().toLowerCase().replace(/\s+/g, "_");

    const normalizeYear = (value) => {
      const year = String(value || "").toLowerCase();
      if (year.includes("1")) return "1st";
      if (year.includes("2")) return "2nd";
      if (year.includes("3")) return "3rd";
      return year;
    };

    const studentYear = normalizeYear(student.year);
    const studentDepartment = normalize(student.department);
    const studentClassName = String(
      student.batch || student.class || student.className || ""
    ).trim().toUpperCase().split("_").pop();

    const [ttRows] = await db.query(
      `
      SELECT * FROM timetable
      WHERE LOWER(TRIM(day)) = LOWER(TRIM(?))
      AND LOWER(TRIM(year)) LIKE CONCAT('%', LOWER(TRIM(?)), '%')
      AND LOWER(TRIM(department)) = LOWER(TRIM(?))
      AND (
        UPPER(TRIM(className)) = UPPER(TRIM(?))
        OR UPPER(TRIM(className)) LIKE ?
      )
      `,
      [dayName, studentYear, studentDepartment, studentClassName, `%${studentClassName}`]
    );

    if (ttRows.length === 0) {
      ttRows.push({
        subject: "Unknown",
        teacher: "Auto",
        lecture_number: 0,
        time: "00:00-23:59"
      });
    }

    let currentLecture = null;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const toMinutes = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    for (let row of ttRows) {
      if (!row.time) continue;
      const [start, end] = row.time.split("-");
      if (currentMinutes >= toMinutes(start) && currentMinutes <= toMinutes(end)) {
        currentLecture = row;
        break;
      }
    }

    if (!currentLecture) currentLecture = ttRows[0];

    const [facultyRows] = await db.query(
      `
      SELECT * FROM faculty 
      WHERE LOWER(REPLACE(name, '.', '')) LIKE CONCAT('%', LOWER(REPLACE(?, '.', '')), '%')
      LIMIT 1
      `,
      [currentLecture.teacher]
    );

    let faculty = facultyRows[0] || {
      id: null,
      name: "Unknown",
      phone: null
    };

    const tg_id = student.tg_faculty_id || faculty?.id || 1;
    const tg_name = student.tg_name || "Unknown";

    const [hodRows] = await db.query(
      "SELECT * FROM hods WHERE LOWER(TRIM(department)) = LOWER(TRIM(?)) LIMIT 1",
      [student.department]
    );

    const hod = hodRows[0] || null;

    /* ================= CLASS TEACHER ================= */
    let classTeacherId = null;

    if (student.class_teacher_name) {
      const [ctRows] = await db.query(
        `
    SELECT id FROM faculty 
    WHERE LOWER(REPLACE(name, '.', '')) = LOWER(REPLACE(?, '.', ''))
    LIMIT 1
    `,
        [student.class_teacher_name]
      );

      classTeacherId = ctRows[0]?.id || null;
    }

    console.log("👨‍🏫 Class Teacher ID:", classTeacherId);

    await db.query(
      `
      UPDATE alerts SET
        faculty_id = ?,
        faculty_name = ?,
        faculty_role = 'faculty',
        tg_id = ?,
        tg_name = ?,
        hod_id = ?,
        hod_name = ?,
        subject = ?,
        lecture_number = ?,
        message = ?,
        class_teacher_id = ?
      WHERE id = ?
      `,
      [
        faculty?.id ?? tg_id ?? 1,
        faculty?.name || tg_name,
        tg_id,
        tg_name,
        hod?.id || null,
        hod?.name || "Unknown",
        currentLecture.subject || "-",
        currentLecture.lecture_number || 0,
        alert.message,
        classTeacherId,
        alertId,
      ]
    );

    console.log("✅ Alert updated successfully");

    /* ================= DEBUG SMS ================= */
    console.log("📞 Faculty phone:", faculty?.phone);
    console.log("📩 Alert message:", alert.message);


    const facultyPhone = faculty?.phone || "9999999999";

    const smsText = `🚨 Alert: ${student.name} is roaming during ${currentLecture.subject}`;
    await sendSMS(facultyPhone, smsText);

  } catch (err) {
    console.log("❌ processAlert error:", err);
  }
}

/* =========================================================
   GET ALERTS
========================================================= */
router.get("/:userId/:role", async (req, res) => {
  try {
    const { userId, role } = req.params;

    let rows = [];

    if (role === "faculty" || role === "faculty_class_teacher") {
     const [data] = await db.query(
  `
  SELECT a.*, s.year
  FROM alerts a
  JOIN students s ON a.student_id = s.id
  WHERE (
    a.faculty_id = ? 
    OR a.tg_id = ?
    OR a.class_teacher_id = ?
  )
  ORDER BY a.detected_at DESC
  `,
  [userId, userId, userId]
);
      rows = data;
    }

    else if (role === "faculty_teacher_guardian") {
   const [data] = await db.query(
  `
  SELECT a.*, s.year
  FROM alerts a
  JOIN students s ON a.student_id = s.id
  WHERE a.tg_id = ?
  ORDER BY a.detected_at DESC
  `,
  [userId]
);
      rows = data;
    }

    else if (role === "hod") {
   const [data] = await db.query(
  `
  SELECT a.*, s.year
  FROM alerts a
  JOIN students s ON a.student_id = s.id
  WHERE a.hod_id = ?
  ORDER BY a.detected_at DESC
  `,
  [userId]
);
      rows = data;
    }

    res.json(rows || []);

  } catch (err) {
    console.log("❌ Fetch alerts error:", err);
    res.status(500).json([]);
  }
});

/* =========================================================
   UNREAD COUNT
========================================================= */
router.get("/unread/:userId/:role", async (req, res) => {
  try {
    const { userId, role } = req.params;

    let count = 0;

    if (role === "faculty" || role === "faculty_class_teacher") {
      const [rows] = await db.query(
        `
        SELECT COUNT(*) as total FROM alerts
        WHERE (
          faculty_id = ? 
          OR tg_id = ?
          OR class_teacher_id = ?
        )
        AND faculty_read = 0
        `,
        [userId, userId, userId]
      );
      count = rows[0].total;
    }

    else if (role === "faculty_teacher_guardian") {
      const [rows] = await db.query(
        `SELECT COUNT(*) as total FROM alerts WHERE tg_id = ? AND tg_read = 0`,
        [userId]
      );
      count = rows[0].total;
    }

    else if (role === "hod") {
      const [rows] = await db.query(
        `SELECT COUNT(*) as total FROM alerts WHERE hod_id = ? AND hod_read = 0`,
        [userId]
      );
      count = rows[0].total;
    }

    res.json({ count });

  } catch (err) {
    console.log("❌ Alert count error:", err);
    res.json({ count: 0 });
  }
});

/* =========================================================
   MARK READ
========================================================= */
router.put("/mark-read/:id/:role", async (req, res) => {
  try {
    const { id, role } = req.params;

    let query = "";

    if (role === "faculty" || role === "faculty_class_teacher") {
      query = "UPDATE alerts SET faculty_read = 1 WHERE id = ?";
    }
    else if (role === "faculty_teacher_guardian") {
      query = "UPDATE alerts SET tg_read = 1 WHERE id = ?";
    }
    else if (role === "hod") {
      query = "UPDATE alerts SET hod_read = 1 WHERE id = ?";
    }

    await db.query(query, [id]);

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

export default router;