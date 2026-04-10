// 🔥 SERVER.JS (UPDATED & FIXED VERSION)

console.log("🔥 ACTIVE SERVER FILE LOADED 🔥");

/* ================= IMPORT SECTION ================= */

import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import db from "./db.js";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import gatepassRoutes from "./routes/gatepass.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import timetableRoutes from "./routes/timetable.routes.js";
import noticeRoutes from "./routes/notice.routes.js";
import badgeRoutes from "./routes/badge.routes.js";
import bunkRoutes from "./routes/bunk.routes.js";
import roamingRoutes from "./routes/roaming.routes.js";
import alertRoutes from "./routes/alert.routes.js";

/* ================= FIX __dirname (ES MODULE FIX) ================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= APP INIT ================= */

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(cors({
  origin: true,
  credentials: true
}));



app.use(express.json({ limit: "100mb" }));

app.use("/chat", chatRoutes);
app.use("/uploads", express.static("uploads"));
console.log("✅ CHAT ROUTES LOADED");

app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use("/models", express.static(path.join(__dirname, "models")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cookieParser());
app.use("/api", gatepassRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api", noticeRoutes);
app.use("/api", badgeRoutes);
app.use("/api", bunkRoutes);
app.use("/api", roamingRoutes);
app.use("/api", alertRoutes);

/* ================= AUTH ROUTES ================= */

app.use("/api", authRoutes);
app.get("/", (req, res) => {
  res.send("Backend Running ✅");
});

/* ================= CREATE UPLOAD FOLDER ================= */

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/* ================= TEST ROUTE ================= */

app.get("/test", (req, res) => {
  res.send("Server Working ✅");
});

/* ================= UTILITY FUNCTION ================= */

function euclideanDistance(arr1, arr2) {
  return Math.sqrt(
    arr1.reduce((sum, value, i) => {
      return sum + Math.pow(value - arr2[i], 2);
    }, 0)
  );
}

/* ================= FACE API SETUP ================= */

import faceapi from "face-api.js";
import canvas from "canvas";

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

/* ================= GENERATE DESCRIPTORS ================= */

async function generateDescriptors() {
  console.log("🔥 Generating face descriptors...");

  const [students] = await db.query("SELECT * FROM students");

  for (const student of students) {
    if (!student.photo_path) continue;

    try {
      const baseName = path.parse(student.photo_path).name;
      const folder = uploadDir;

      const extensions = [".jpg", ".jpeg", ".png"];
      let imagePath = null;

      for (let ext of extensions) {
        const testPath = path.join(folder, baseName + ext);
        if (fs.existsSync(testPath)) {
          imagePath = testPath;
          break;
        }
      }

      if (!imagePath) continue;

      const img = await canvas.loadImage(imagePath);

      const detection = await faceapi
        .detectSingleFace(
          img,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) continue;

      const descriptor = Array.from(detection.descriptor);

      await db.query(
        "UPDATE students SET face_descriptor = ? WHERE enrollment_no = ?",
        [JSON.stringify(descriptor), student.enrollment_no]
      );

      console.log("✅ Descriptor saved:", student.enrollment_no);
    } catch (err) {
      console.log("❌ Descriptor Error:", err);
    }
  }

  console.log("✅ Face Descriptor Generation Completed");
}

/* ================= AUTO FACE ROUTE ================= */

app.post("/auto-face", async (req, res) => {
  try {
    const { image, camera_location } = req.body;

    if (!image) {
      return res.status(400).json({ message: "No image received" });
    }

    const actualCameraLocation = String(camera_location || "")
      .trim()
      .toLowerCase();

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const img = await canvas.loadImage(buffer);

    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return res.json({ success: false, message: "No face detected" });
    }

    const descriptor = Array.from(detection.descriptor);

    const [students] = await db.query(
      "SELECT * FROM students WHERE face_descriptor IS NOT NULL"
    );

    let bestMatch = null;
    let minDistance = 1;
    const THRESHOLD = 0.6;

    for (let student of students) {
      try {
        const storedDescriptor = new Float32Array(
          JSON.parse(student.face_descriptor)
        );

        const distance = euclideanDistance(descriptor, storedDescriptor);

        console.log("Comparing:", student.enrollment_no);
        console.log("Distance:", distance);

        if (distance < THRESHOLD && distance < minDistance) {
          minDistance = distance;
          bestMatch = student;
        }
      } catch (err) {
        console.log("Comparison Error:", err);
      }
    }

    if (bestMatch) {
      // 🔥 INSERT ROAMING LOG HERE
      try {
        const [existing] = await db.query(
          `
          SELECT * FROM roaming_logs
          WHERE student_id = ?
          AND detected_at >= NOW() - INTERVAL 1 MINUTE
          `,
          [bestMatch.id]
        );

        if (existing.length === 0) {
          await db.query(
            `
            INSERT INTO roaming_logs (student_id, camera_location)
            VALUES (?, ?)
            `,
            [bestMatch.id, actualCameraLocation || "unknown_location"]
          );

          console.log("✅ Roaming log inserted");
        } else {
          console.log("⏳ Duplicate roaming skipped");
        }
      } catch (err) {
        console.log("❌ Roaming log error:", err);
      }

      /* ================= AUTO BUNK LOGIC ================= */
      try {
        const now = new Date();
        const todayDate = now.toISOString().slice(0, 10);
        const dayName = now.toLocaleString("en-US", { weekday: "long" });
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM

        const studentClassParts = String(bestMatch.class || "").split("-");
        const studentYearShort = studentClassParts[0]?.trim().toUpperCase();
        const studentClassName = studentClassParts[1]?.trim().toUpperCase();

        let studentYear = "";
        if (studentYearShort === "FY") studentYear = "1st";
        else if (studentYearShort === "SY") studentYear = "2nd";
        else if (studentYearShort === "TY") studentYear = "3rd";
        else if (studentYearShort === "BE") studentYear = "4th";

        const normalize = (value) =>
          String(value || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_");

        const studentDepartment = normalize(bestMatch.department);

        const [rows] = await db.query(
          `
          SELECT * FROM timetable
          WHERE LOWER(TRIM(day)) = LOWER(TRIM(?))
          AND LOWER(TRIM(year)) = LOWER(TRIM(?))
          AND LOWER(TRIM(department)) = LOWER(TRIM(?))
          AND UPPER(TRIM(className)) = UPPER(TRIM(?))
          `,
          [dayName, studentYear, studentDepartment, studentClassName]
        );

        const isCurrentTimeInSlot = (slot, nowTime) => {
          if (!slot) return false;

          const parts = String(slot).trim().split("-");
          if (parts.length !== 2) return false;

          const fixTime = (t) => {
            const [h = "00", m = "00"] = String(t).trim().split(":");
            return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
          };

          const start = fixTime(parts[0]);
          const end = fixTime(parts[1]);

          return nowTime >= start && nowTime <= end;
        };

        const lecture = rows.find((row) => isCurrentTimeInSlot(row.time, currentTime));
        console.log("🔥 matched lecture:", lecture);

        if (lecture) {
          const subjectName = String(lecture.subject || "").trim().toLowerCase();
          const expectedLocation = String(lecture.lecture_location || "")
            .trim()
            .toLowerCase();

          if (
            subjectName !== "off" &&
            subjectName !== "recess" &&
            subjectName !== "break" &&
            lecture.is_break !== 1
          ) {
            // ✅ If timetable location not configured, skip bunk to avoid false marking
            if (!expectedLocation) {
              console.log("ℹ️ lecture_location not set in timetable, bunk skipped");
            }
            // ✅ If student is in correct lecture location, do NOT mark bunk
            else if (expectedLocation === actualCameraLocation) {
              console.log("✅ Student detected in correct classroom/location, not bunked");
            }
            // ✅ If location differs, mark bunk
            else {
              const [existingBunk] = await db.query(
                `
                SELECT * FROM bunk_records
                WHERE student_id = ?
                AND timetable_id = ?
                AND lecture_date = ?
                `,
                [bestMatch.id, lecture.id, todayDate]
              );

              if (existingBunk.length === 0) {
                await db.query(
                  `
                  INSERT INTO bunk_records
                  (student_id, timetable_id, lecture_date, day_name, lecture_number, subject, teacher, status)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `,
                  [
                    bestMatch.id,
                    lecture.id,
                    todayDate,
                    dayName,
                    lecture.lecture_number || 0,
                    lecture.subject || "",
                    lecture.teacher || "",
                    "bunk"
                  ]
                );

                console.log("✅ Bunk record inserted");
              } else {
                console.log("⏳ Duplicate bunk skipped");
              }
            }
          } else {
            console.log("ℹ️ Break/OFF lecture, bunk not inserted");
          }
        } else {
          console.log("ℹ️ No matching current lecture found");
        }
      } catch (err) {
        console.log("❌ Auto bunk logic error:", err);
      }

      return res.json({
        success: true,
        student: {
          id: bestMatch.id,
          enrollment_no: bestMatch.enrollment_no,
          name: bestMatch.name,
          class: bestMatch.class,
          department: bestMatch.department,
          phone: bestMatch.phone
        }
      });
    }

    return res.json({
      success: false,
      message: "Face not recognized"
    });
  } catch (error) {
    console.log("🔥 Auto Face Error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 5000;

process.on("uncaughtException", (err) => {
  console.log("🔥 SERVER CRASH PREVENTED:", err);
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  try {
    const modelPath = path.join(__dirname, "models");

    await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

    console.log("✅ Face models loaded");

    await generateDescriptors();
  } catch (err) {
    console.log("❌ Model loading failed:", err);
  }
});