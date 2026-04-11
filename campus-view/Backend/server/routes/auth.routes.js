import express from "express";
import bcrypt from "bcrypt";
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

const sanitizeUser = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

/* ================= LOGIN ================= */

router.post("/login", async (req, res) => {
  try {
    console.log("🔥 LOGIN BODY:", req.body);

    // ✅ SAFE extraction (NO CRASH)
    const name = req.body?.name || "";
    const role = req.body?.role || "";

    if (!name || !role) {
      return res.status(400).json({
        success: false,
        message: "Name or role missing",
      });
    }

    let table = "";

    if (role === "student") table = "students";
    else if (role.includes("faculty")) table = "faculty";
    else if (role === "hod") table = "hods";
    else if (role === "principal") table = "principals";

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    console.log("🔍 Searching in table:", table);

    const [rows] = await db.query(
      `SELECT * FROM ${table} WHERE LOWER(name) LIKE LOWER(?) LIMIT 1`,
      [`%${name}%`]
    );

    console.log("📦 DB RESULT:", rows);

    if (!rows || rows.length === 0) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    const user = rows[0];

    return res.json({
      success: true,
      user: sanitizeUser(user),
    });

  } catch (error) {
    console.log("🔥 LOGIN ERROR FULL:", error); // VERY IMPORTANT

    return res.status(500).json({
      success: false,
      message: error.message || "Server crashed",
    });
  }
});

/* ================= PASSWORD VALIDATION ================= */

const validatePassword = (password) => {
  if (!password) return "Password is required";
  if (password.length < 8 || password.length > 16)
    return "Password must be 8 to 16 characters long";
  if (!/[A-Z]/.test(password))
    return "Password must contain at least 1 uppercase letter";
  if (!/[a-z]/.test(password))
    return "Password must contain at least 1 lowercase letter";
  if (!/[0-9]/.test(password))
    return "Password must contain at least 1 number";
  if (!/[@#$%&*!]/.test(password))
    return "Password must contain at least 1 special character";
  if (/\s/.test(password))
    return "Password must not contain spaces";

  return null;
};

/* ================= REGISTER ================= */

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      role,
      year,
      department,
      batch,
      tg_name,
      enrollment,
      password,
    } = req.body;

    const passwordError = validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

  let profile_image = null;

// 🔥 TEMP DISABLE IMAGE (IMPORTANT FOR RENDER)

    const table = getTableByRole(role);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid role selected",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (role === "student") {
      const [existing] = await db.query(
        "SELECT id FROM students WHERE enrollment = ?",
        [enrollment]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Enrollment already exists",
        });
      }

      await db.query(
        `INSERT INTO students 
        (name, role, year, department, batch, tg_name, enrollment, password, profile_image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, role, year, department, batch, tg_name, enrollment, hashedPassword, profile_image]
      );

    } else if (role.includes("faculty")) {
      await db.query(
        `INSERT INTO faculty
        (name, role, year, department, batch, password, profile_image)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, role, year, department, batch, hashedPassword, profile_image]
      );

    } else if (role === "hod") {
      await db.query(
        `INSERT INTO hods
        (name, role, department, password, profile_image)
        VALUES (?, ?, ?, ?, ?)`,
        [name, role, department, hashedPassword, profile_image]
      );

    } else if (role === "principal") {
      await db.query(
        `INSERT INTO principals
        (name, role, password, profile_image)
        VALUES (?, ?, ?, ?)`,
        [name, role, hashedPassword, profile_image]
      );
    }

    return res.status(201).json({
      success: true,
      message: "Registration Successful",
    });

  } catch (err) {
    console.log("REGISTER ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;