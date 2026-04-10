import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../../config/db.js";

const router = express.Router();

/* =========================================================
   STUDENT LOGIN (WITH JWT AUTH)
========================================================= */

router.post("/student-login", async (req, res) => {
  try {
    const { enrollment_no, name, password, department } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM students WHERE enrollment_no = ? AND name = ? AND department = ?",
      [enrollment_no, name, department]
    );

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "Student not found"
      });
    }

    const student = rows[0];

    // ✅ Compare hashed password
    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      return res.json({
        success: false,
        message: "Invalid password"
      });
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      {
        id: student.id,
        enrollment_no: student.enrollment_no,
        role: "student"
      },
      "SECRET_KEY",
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      student
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});


/* =========================================================
   GET STUDENT BY ENROLLMENT (PROTECTED ROUTE)
========================================================= */

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Token missing"
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, "SECRET_KEY", (err, decoded) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }

    req.user = decoded;
    next();
  });
};


/* 🔒 Protected Route */
router.get("/student/:enrollment_no", verifyToken, async (req, res) => {
  try {
    const { enrollment_no } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM students WHERE enrollment_no = ?",
      [enrollment_no]
    );

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({
      success: true,
      student: rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});


export default router;