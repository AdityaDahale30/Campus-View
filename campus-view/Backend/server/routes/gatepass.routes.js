import express from "express";
import db from "../db.js";

console.log("✅ gatepass.routes.js loaded");

const router = express.Router();

/* ==========================================
   SUBMIT GATE PASS (STUDENT + FACULTY)
========================================== */
router.post("/gate_pass", async (req, res) => {
  try {
    const {
      student_name,
      enrollment_no,
      class_name,
      department,
      reason,
      exit_time,
      exit_date,
      requester_id,
      requester_role
    } = req.body;

    if (!student_name || !reason || !exit_time || !exit_date || !requester_id) {
      return res.status(400).json({
        message: "Required fields are missing"
      });
    }

    const [existing] = await db.query(
      "SELECT id FROM gate_pass WHERE requester_id=? AND status='Pending'",
      [requester_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "You already have a pending request"
      });
    }

    let approver_id = null;
    let approver_name = "";
    let approver_role = "";

    if (requester_role === "student") {
      const [rows] = await db.query(
        `SELECT tg_faculty_id, class_teacher_faculty_id
         FROM faculty
         WHERE id=? LIMIT 1`,
        [requester_id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Student not found" });
      }

      const tg_faculty_id = rows[0].tg_faculty_id;
      const class_teacher_faculty_id = rows[0].class_teacher_faculty_id;

      let tgUser = null;
      let ctUser = null;

      if (tg_faculty_id) {
        const [tgRows] = await db.query(
          `SELECT id, name, gatepass_available
           FROM faculty
           WHERE id=? LIMIT 1`,
          [tg_faculty_id]
        );
        if (tgRows.length > 0) tgUser = tgRows[0];
      }

      if (class_teacher_faculty_id) {
        const [ctRows] = await db.query(
          `SELECT id, name, gatepass_available
           FROM faculty
           WHERE id=? LIMIT 1`,
          [class_teacher_faculty_id]
        );
        if (ctRows.length > 0) ctUser = ctRows[0];
      }

      if (tgUser && Number(tgUser.gatepass_available) === 1) {
        approver_id = tgUser.id;
        approver_name = tgUser.name;
        approver_role = "TG";
      } else if (ctUser && Number(ctUser.gatepass_available) === 1) {
        approver_id = ctUser.id;
        approver_name = ctUser.name;
        approver_role = "Class Teacher";
      } else {
        return res.status(400).json({
          message: "Neither TG nor Class Teacher is available"
        });
      }
    } else if (requester_role === "faculty") {
      const [rows] = await db.query(
        "SELECT department FROM faculty WHERE id=? LIMIT 1",
        [requester_id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Faculty not found" });
      }

      const dept = rows[0].department;

 const [hodRows] = await db.query(
  "SELECT id, name FROM hods WHERE department=? LIMIT 1",
  [dept]
);

      if (hodRows.length === 0) {
        return res.status(400).json({
          message: "HOD not found for department"
        });
      }

      approver_id = hodRows[0].id;
      approver_name = hodRows[0].name;
      approver_role = "HOD";
    } else {
      return res.status(400).json({
        message: "Invalid requester role"
      });
    }

    await db.query(
      `INSERT INTO gate_pass
      (
        student_name,
        enrollment_no,
        class_name,
        department,
        reason,
        exit_time,
        exit_date,
        requester_id,
        requester_role,
        approver_id,
        approver_name,
        approver_role,
        status
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        student_name,
        enrollment_no,
        class_name,
        department,
        reason,
        exit_time,
        exit_date,
        requester_id,
        requester_role,
        approver_id,
        approver_name,
        approver_role,
        "Pending"
      ]
    );

    res.json({
      success: true,
      message: "Gate pass submitted successfully",
      approver_name,
      approver_role
    });
  } catch (error) {
    console.log("❌ Gate Pass Submit Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   MY REQUESTS
========================================== */
router.get("/my-gate_pass/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM gate_pass WHERE requester_id=? ORDER BY id DESC",
      [req.params.id]
    );

    res.json(rows);
  } catch (error) {
    console.log("❌ My Gate Pass Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   TG / CLASS TEACHER REQUESTS
========================================== */
router.get("/tg-requests/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM gate_pass
WHERE approver_id=? 
AND requester_role='student'
ORDER BY id DESC`,
      [req.params.id]
    );

    res.json(rows);
  } catch (error) {
    console.log("❌ TG/Class Teacher Requests Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   HOD REQUESTS
========================================== */
router.get("/hod-requests/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM gate_pass
WHERE approver_id=? 
AND requester_role='faculty'
ORDER BY id DESC`,
      [req.params.id]
    );

    res.json(rows);
  } catch (error) {
    console.log("❌ HOD Requests Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   UPDATE STATUS
========================================== */
router.put("/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;   // ✅ FIX HERE

    console.log("CLICKED:", id, status); // ✅ now works

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    await db.query(
      "UPDATE gate_pass SET status=? WHERE id=?",
      [status, id]   // ✅ use id properly
    );

    res.json({ success: true, message: `Request ${status}` });

  } catch (error) {
    console.log("❌ Update Status Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   GET FACULTY AVAILABILITY
========================================== */
router.get("/faculty-availability/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, gatepass_available FROM faculty WHERE id=? LIMIT 1",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    res.json({
      success: true,
      faculty: rows[0]
    });
  } catch (error) {
    console.log("❌ Faculty Availability Fetch Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   UPDATE FACULTY AVAILABILITY
========================================== */
router.put("/faculty-availability/:id", async (req, res) => {
  try {
    const { gatepass_available } = req.body;

    if (![0, 1, "0", "1"].includes(gatepass_available)) {
      return res.status(400).json({
        message: "gatepass_available must be 0 or 1"
      });
    }

    const newValue = Number(gatepass_available);

    const [result] = await db.query(
      "UPDATE faculty SET gatepass_available=? WHERE id=?",
      [newValue, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    res.json({
      success: true,
      message:
        newValue === 1
          ? "You are now available for gate pass approvals"
          : "You are now unavailable for gate pass approvals",
      gatepass_available: newValue
    });
  } catch (error) {
    console.log("❌ Faculty Availability Update Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   GET STUDENT APPROVER PREVIEW
========================================== */
router.get("/student-approver/:id", async (req, res) => {
  try {
    const [studentRows] = await db.query(
      `SELECT tg_faculty_id, class_teacher_faculty_id
       FROM faculty
       WHERE id=? LIMIT 1`,   // ✅ FIXED HERE
      [req.params.id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const tg_faculty_id = studentRows[0].tg_faculty_id;
    const class_teacher_faculty_id = studentRows[0].class_teacher_faculty_id;

    let tg_name = "";
    let class_teacher_name = "";
    let tg_available = 0;
    let class_teacher_available = 0;
    let active_approver_name = "";
    let active_approver_role = "";
    /* ================= TG ================= */
    if (tg_faculty_id) {
      const [tgRows] = await db.query(
        `SELECT name, gatepass_available
         FROM faculty
         WHERE id=? LIMIT 1`,
        [tg_faculty_id]
      );

      if (tgRows.length > 0) {
        tg_name = tgRows[0].name;
        tg_available = Number(tgRows[0].gatepass_available);
      }
    }

    /* ================= CLASS TEACHER ================= */
    if (class_teacher_faculty_id) {
      const [ctRows] = await db.query(
        `SELECT name, gatepass_available
         FROM faculty
         WHERE id=? LIMIT 1`,
        [class_teacher_faculty_id]
      );

      if (ctRows.length > 0) {
        class_teacher_name = ctRows[0].name;
        class_teacher_available = Number(ctRows[0].gatepass_available);
      }
    }

    /* ================= PRIORITY LOGIC ================= */
    if (tg_name && tg_available === 1) {
      active_approver_name = tg_name;
      active_approver_role = "TG";
    } else if (class_teacher_name && class_teacher_available === 1) {
      active_approver_name = class_teacher_name;
      active_approver_role = "Class Teacher";
    }

    res.json({
      success: true,
      tg_name,
      class_teacher_name,
      tg_available,
      class_teacher_available,
      active_approver_name,
      active_approver_role
    });

  } catch (error) {
    console.log("❌ Student Approver Preview Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ==========================================
   TEST ROUTE
========================================== */
router.get("/test-gatepass", (req, res) => {
  res.json({ message: "gatepass route working" });
});

/* ==========================================
   GET FACULTY HOD PREVIEW
========================================== */
router.get("/faculty-hod/:id", async (req, res) => {
  try {
    const [facultyRows] = await db.query(
      "SELECT department FROM faculty WHERE id=? LIMIT 1",
      [req.params.id]
    );

    if (facultyRows.length === 0) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const dept = facultyRows[0].department;
const [hodRows] = await db.query(
  "SELECT id, name FROM hods WHERE department=? LIMIT 1",
  [dept]
);

    if (hodRows.length === 0) {
      return res.status(404).json({ message: "HOD not found" });
    }

    res.json({
      success: true,
      hod_id: hodRows[0].id,
      hod_name: hodRows[0].name,
    });

  } catch (error) {
    console.log("❌ Faculty HOD Preview Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/gatepass/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM gate_pass WHERE id=?",
      [req.params.id]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});


export default router;