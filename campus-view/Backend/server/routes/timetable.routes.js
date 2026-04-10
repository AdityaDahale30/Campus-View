import express from "express";
import db from "../db.js";

const router = express.Router();

/* ================= GET FULL TIMETABLE ================= */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM timetable");
    res.json(rows);
  } catch (err) {
    console.log("GET TIMETABLE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= UPDATE TIMETABLE ================= */
router.put("/update/:id", async (req, res) => {
  const { subject, teacher } = req.body;
  const { id } = req.params;

  try {
    await db.query(
      `UPDATE timetable
       SET prev_subject = subject,
           prev_teacher = teacher,
           subject = ?,
           teacher = ?,
           isEdited = 1
       WHERE id = ?`,
      [subject, teacher, id]
    );

    res.json({
      success: true,
      message: "Updated successfully",
    });
  } catch (err) {
    console.log("UPDATE TIMETABLE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ================= UNDO TIMETABLE ================= */
router.put("/undo/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(
      `UPDATE timetable
       SET subject = prev_subject,
           teacher = prev_teacher,
           prev_subject = NULL,
           prev_teacher = NULL,
           isEdited = 0
       WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Undo successful",
    });
  } catch (err) {
    console.log("UNDO TIMETABLE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ================= CURRENT LECTURE FOR STUDENT ================= */
router.get("/current-lecture/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    const [students] = await db.query(
      `SELECT * FROM students WHERE enrollment = ?`,
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const student = students[0];

    const today = new Date();
    const dayName = today.toLocaleString("en-US", { weekday: "long" });
    const currentTime = today.toTimeString().slice(0, 5);
    const todayDate = today.toISOString().slice(0, 10);

    const normalize = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    const normalizeYear = (value) => {
      const year = String(value || "").trim().toLowerCase();

      if (year === "1" || year === "1st" || year === "first" || year === "fy") {
        return "1st";
      }
      if (year === "2" || year === "2nd" || year === "second" || year === "sy") {
        return "2nd";
      }
      if (year === "3" || year === "3rd" || year === "third" || year === "ty") {
        return "3rd";
      }

      return String(value || "").trim();
    };

    const studentYear = normalizeYear(student.year);
    const studentDepartment = normalize(student.department);
   const studentClassName = String(
  student.batch || student.class || ""
)
  .trim()
  .toUpperCase()
  .split("_")
  .pop();   // 🔥 FIX

    const [rows] = await db.query(
      `
      SELECT *
      FROM timetable
      WHERE LOWER(TRIM(day)) = LOWER(TRIM(?))
        AND LOWER(TRIM(year)) = LOWER(TRIM(?))
        AND LOWER(TRIM(department)) = LOWER(TRIM(?))
       AND (
  UPPER(TRIM(className)) = UPPER(TRIM(?))
  OR UPPER(TRIM(className)) LIKE CONCAT('%_', UPPER(TRIM(?)))
)
      `,
      [dayName, studentYear, studentDepartment, studentClassName, studentClassName]
    );

    console.log("🔥 dayName:", dayName);
    console.log("🔥 currentTime:", currentTime);
    console.log("🔥 studentYear:", studentYear);
    console.log("🔥 studentDepartment:", studentDepartment);
    console.log("🔥 studentClassName:", studentClassName);

    rows.forEach((row) => {
      console.log("➡️ row:", {
        id: row.id,
        day: row.day,
        year: row.year,
        department: row.department,
        className: row.className,
        time: row.time,
        subject: row.subject,
      });
    });

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "No timetable found for today",
      });
    }

    const isCurrentTimeInSlot = (slot, now) => {
      if (!slot) return false;

      const parts = String(slot).trim().split("-");
      if (parts.length !== 2) return false;

      const fixTime = (t) => {
        const [h = "00", m = "00"] = String(t).trim().split(":");
        return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
      };

      const start = fixTime(parts[0]);
      const end = fixTime(parts[1]);

      console.log("⏰ Checking slot:", { start, end, now });

      return now >= start && now <= end;
    };

    const lecture = rows.find((row) => isCurrentTimeInSlot(row.time, currentTime));

    console.log("🔥 matched lecture:", lecture);

    if (!lecture) {
      return res.json({
        success: false,
        message: "No timetable found for current lecture",
      });
    }

    if (
      !lecture.subject ||
      ["off", "recess", "break"].includes(String(lecture.subject).trim().toLowerCase()) ||
      lecture.is_break === 1
    ) {
      return res.json({
        success: false,
        message: "OFF/BREAK lecture",
      });
    }

    const [startRaw, endRaw] = String(lecture.time).split("-");

    const fixTimeWithSeconds = (t) => {
      const [h = "00", m = "00"] = String(t).trim().split(":");
      return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`;
    };

    const lectureStart = `${todayDate} ${fixTimeWithSeconds(startRaw)}`;
    const lectureEnd = `${todayDate} ${fixTimeWithSeconds(endRaw)}`;

    res.json({
      success: true,
      lecture: {
        timetable_id: lecture.id,
        lecture_date: todayDate,
        day_name: dayName,
        lecture_number: lecture.lecture_number || 0,
        subject: lecture.subject,
        teacher: lecture.teacher,
        lecture_start: lectureStart,
        lecture_end: lectureEnd,
      },
    });
  } catch (err) {
    console.log("🔥 Current lecture error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/*================================================================================================*/
router.post("/mark", async (req, res) => {
  try {
    const {
      timetable_id,
      faculty_id,
      lecture_date,
      status,
    } = req.body;

    // ✅ CHECK EXISTING ENTRY (FIXED TABLE)
    const [existing] = await db.query(
      `
      SELECT status FROM lecture_records
      WHERE timetable_id = ?
        AND faculty_id = ?
        AND DATE(lecture_date) = DATE(?)
      `,
      [timetable_id, faculty_id, lecture_date]
    );

    // 🔥 IF ALREADY EXISTS
    if (existing.length > 0) {
      return res.json({
        success: false,
        message: `Already marked as ${existing[0].status}`,
      });
    }

    // ✅ INSERT INTO SAME TABLE
 await db.query(
  `
  INSERT INTO lecture_records
  (
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
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  [
    timetable_id,
    faculty_id,
    req.body.faculty_name,
    req.body.department,
    req.body.year,
    req.body.class_name,
    req.body.subject,
    lecture_date,
    req.body.day_name,
    req.body.lecture_number,
    req.body.time_slot,
    status
  ]
);

    return res.json({
      success: true,
      message: "Lecture marked successfully",
    });

  } catch (err) {
    console.log("MARK ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;