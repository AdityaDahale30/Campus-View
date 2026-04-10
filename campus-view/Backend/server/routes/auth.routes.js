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

const sanitizeUser = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

/* ================= LOGIN ================= */

router.post("/login", async (req, res) => {
  try {
    const { name, password, role } = req.body;

    // ✅ VALIDATION
    if (!name || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing login fields",
      });
    }

    let table = "";

    if (role === "student") table = "students";
    else if (role && role.includes("faculty")) table = "faculty";
    else if (role === "hod") table = "hods";
    else if (role === "principal") table = "principals";

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    console.log("LOGIN INPUT:", { name, role });

    // ✅ NAME BASED LOGIN
    const query = `SELECT * FROM ${table} WHERE name = ?`;
    const [rows] = await db.query(query, [name]);

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    const user = rows[0];

    console.log("Entered password:", password);
    console.log("DB password:", user.password);

    if (!user.password) {
      return res.status(500).json({
        success: false,
        message: "Password missing in DB",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({
        success: false,
        message: "Invalid password",
      });
    }

    return res.json({
      success: true,
      user: sanitizeUser(user),
    });

  } catch (error) {
    console.log("🔥 LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* ================= PASSWORD VALIDATION ================= */

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
    return "This password is too common.";
  }

  return null;
};

/* ================= REGISTER ================= */

router.post("/register", async (req, res) => {
  console.log("🔥 REGISTER ROUTE HIT");

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

  if (req.body.profile_image) {
    const base64Data = req.body.profile_image;
    const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);

    if (!matches) {
      return res.status(400).json({
        success: false,
        message: "Invalid image format",
      });
    }

    const ext = matches[1].split("/")[1];
    const buffer = Buffer.from(matches[2], "base64");

    let folder = "students";

    if (role.includes("faculty")) folder = "faculty";
    else if (role === "hod") folder = "hods";
    else if (role === "principal") folder = "principals";

    const fileName = Date.now() + "." + ext;
    const filePath = `uploads/${folder}/${fileName}`;

    fs.writeFileSync(filePath, buffer);

    profile_image = `${folder}/${fileName}`;
  }

  try {
    const table = getTableByRole(role);

    if (!table) {
      return res.status(400).json({
        success: false,
        message: "Invalid role selected",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (role === "student") {
      const [existingStudent] = await db.query(
        "SELECT id FROM students WHERE enrollment = ?",
        [enrollment]
      );

      if (existingStudent.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Student enrollment already exists",
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
    console.log("REGISTER ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

export default router;