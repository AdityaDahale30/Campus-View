import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db.js";
import fs from "fs";

const router = express.Router();


/* ================= HELPERS ================= */

const getTableByRole = (role) => {
  if (role === "student") return "students";

  if (
    role === "faculty" ||
    role === "faculty_class_teacher" ||
    role === "faculty_teacher_guardian" ||
    role === "hod_faculty"
  ) {
    return "faculty";
  }

  if (role === "hod") return "hods";
  if (role === "principal") return "principals";

  return null;
};

const getLoginFieldsByRole = (role) => {
  if (role === "student") {
    return `
      id,
      name,
      role,
      year,
      department,
      batch,
      tg_name,
      enrollment,
      profile_image,
      gatepass_available,
      password
    `;
  }

  if (
    role === "faculty" ||
    role === "faculty_class_teacher" ||
    role === "faculty_teacher_guardian" ||
    role === "hod_faculty"
  ) {
    return `
      id,
      name,
      role,
      year,
      department,
      batch,
      profile_image,
      gatepass_available,
      password
    `;
  }

  if (role === "hod") {
    return `
      id,
      name,
      role,
      department,
      profile_image,
      password
    `;
  }

  if (role === "principal") {
    return `
      id,
      name,
      role,
      profile_image,
      password
    `;
  }

  return "*";
};

const sanitizeUser = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

/* ================= LOGIN ================= */

router.post("/login", async (req, res) => {
  try {
    const { name, password, role } = req.body;

    const table = getTableByRole(role);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const fields = getLoginFieldsByRole(role);

    const [results] = await db.query(
      `SELECT ${fields} FROM ${table} WHERE name = ? AND role = ?`,
      [name, role]
    );

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const user = results[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Wrong password",
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, table },
      "campusview_secret",
      { expiresIn: "1d" }
    );

 const safeUser = sanitizeUser(user);

return res.json({
  success: true,
  token,
  user: {
    ...safeUser,

    // 🔥 IMPORTANT FIX (ADD THESE)
    userClass: safeUser.batch || "", 
    userYear: safeUser.year || "",
    userDepartment: safeUser.department || "",

    // optional (already exists but safe)
    enrollment: safeUser.enrollment || safeUser.enrollment_no || ""
  }
});

  } catch (err) {
    console.error("🔥 LOGIN ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

const validatePassword = (password) => {
  if (!password) return "Password is required";

  if (password.length < 8 || password.length > 16) {
    return "Password must be 8 to 16 characters long";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least 1 uppercase letter";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least 1 lowercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least 1 number";
  }

  if (!/[@#$%&*!]/.test(password)) {
    return "Password must contain at least 1 special character (@ # $ % & * !)";
  }

  if (/\s/.test(password)) {
    return "Password must not contain spaces";
  }

  const blockedPasswords = [
    "123456",
    "12345678",
    "password",
    "admin",
    "qwerty",
    "welcome",
    "campusview",
  ];

  if (blockedPasswords.includes(password.toLowerCase())) {
    return "This password is too common. Please choose a stronger password";
  }

  return null;
};
/* ================= REGISTER ================= */

router.post("/api/register", async (req, res) => {
  try {

    // ✅ 1. GET DATA FROM BODY
    const {
      name,
      role,
      enrollment,
      year,
      department,
      batch,
      tg_name,
      password,
      profile_image
    } = req.body;

    /* ================= 🔥 ADD YOUR CHECKS HERE ================= */

    // ✅ CHECK 1: enrollment duplicate (students)
    if (role === "student") {
      const [existing] = await db.query(
        "SELECT id FROM students WHERE enrollment = ?",
        [enrollment]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: "User already exists with this enrollment ❌"
        });
      }
    }

    // ✅ CHECK 2: name duplicate (faculty / hod)
    if (role !== "student") {
      const [existingUser] = await db.query(`
        SELECT id FROM faculty WHERE name = ?
        UNION
        SELECT id FROM hods WHERE name = ?
      `, [name, name]);

      if (existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          message: "User already registered ❌"
        });
      }
    }

    /* ================= 🔐 PASSWORD HASH ================= */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* ================= ✅ INSERT USER ================= */

    if (role === "student") {
      await db.query(
        `INSERT INTO students (name, enrollment, year, department, batch, tg_name, password, profile_image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, enrollment, year, department, batch, tg_name, hashedPassword, profile_image]
      );
    }

    else if (role.includes("faculty")) {
      await db.query(
        `INSERT INTO faculty (name, role, department, password)
         VALUES (?, ?, ?, ?)`,
        [name, role, department, hashedPassword]
      );
    }

    else if (role === "hod" || role === "hod_faculty") {
      await db.query(
        `INSERT INTO hods (name, role, department, password)
         VALUES (?, ?, ?, ?)`,
        [name, role, department, hashedPassword]
      );
    }

    else if (role === "principal") {
      await db.query(
        `INSERT INTO principals (name, role, password)
         VALUES (?, ?, ?)`,
        [name, role, hashedPassword]
      );
    }

    /* ================= SUCCESS ================= */
    return res.json({
      success: true,
      message: "User registered successfully ✅"
    });

  } catch (err) {

    // 🔥 HANDLE DUPLICATE ERROR (FINAL SAFETY)
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "User already exists ❌"
      });
    }

    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// 🔥 SEARCH USERS API
router.get("/search-users", async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const likeQuery = `${query}%`;

    const [students] = await db.query(
      `SELECT id, name, 'student' AS role
       FROM students
       WHERE name LIKE ?
       LIMIT 5`,
      [likeQuery]
    );

    const [faculty] = await db.query(
      `SELECT id, name, 'faculty' AS role
       FROM faculty
       WHERE name LIKE ?
       LIMIT 5`,
      [likeQuery]
    );

    const [hods] = await db.query(
      `SELECT id, name, 'hod' AS role
       FROM hods
       WHERE name LIKE ?
       LIMIT 5`,
      [likeQuery]
    );

    const [principals] = await db.query(
      `SELECT id, name, 'principal' AS role
       FROM principals
       WHERE name LIKE ?
       LIMIT 5`,
      [likeQuery]
    );

    const results = [...students, ...faculty, ...hods, ...principals];

    res.json(results);
  } catch (err) {
    console.log("search-users error:", err);
    res.status(500).json([]);
  }
});

export default router;