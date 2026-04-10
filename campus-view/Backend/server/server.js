console.log("🔥 ACTIVE SERVER FILE LOADED 🔥");

/* ============================================== IMPORT SECTION ======================================================================= */

import fs from "fs";
import path from "path";
import express from "express";
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
import lectureAnalyticsRoutes from "./routes/lectureAnalytics.routes.js";
import departmentReportRoutes from "./routes/departmentReport.routes.js";



/* ========================================== FIX __dirname (ES MODULE FIX) ========================================================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =================================================== APP INIT ====================================================================== */

const app = express();

/* ================================================== MIDDLEWARE ====================================================================== */


app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());


app.use("/models", express.static(path.join(__dirname, "models")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/chat", chatRoutes);
console.log("✅ CHAT ROUTES LOADED");

app.use("/api", gatepassRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api", noticeRoutes);
app.use("/api", badgeRoutes);
app.use("/api", bunkRoutes);
app.use("/api", roamingRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/lecture-analytics", lectureAnalyticsRoutes);
app.use("/api/department-report", departmentReportRoutes);
app.use("/api", authRoutes);
app.use("/uploads", express.static("uploads"));
/* =================================================== BASIC ROUTES =================================================================== */

app.get("/", (req, res) => {
  res.send("Backend Running ✅");
});

app.get("/test", (req, res) => {
  res.send("Server Working ✅");
});

/* ================================================ CREATE UPLOAD FOLDER ============================================================= */

const uploadDir = path.join(__dirname, "uploads");

const subFolders = ["students", "faculty", "hods", "principals"];

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

subFolders.forEach((folder) => {
  const fullPath = path.join(uploadDir, folder);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath);
  }
});

/* ==================================================== FACE API SETUP ============================================================== */



/* ==================================================== UTILITY FUNCTIONS ============================================================== */

function euclideanDistance(arr1, arr2) {
  return Math.sqrt(
    arr1.reduce((sum, value, i) => {
      return sum + Math.pow(value - arr2[i], 2);
    }, 0)
  );
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function normalizeYear(value) {
  const y = String(value || "").trim().toLowerCase();

  if (y === "1" || y.includes("1st") || y.includes("first")) return "1st";
  if (y === "2" || y.includes("2nd") || y.includes("second")) return "2nd";
  if (y === "3" || y.includes("3rd") || y.includes("third")) return "3rd";

  return String(value || "").trim();
}

function isCurrentTimeInSlot(slot, nowTime) {
  if (!slot) return false;

  const [start, end] = slot.split("-");

  const toMinutes = (time) => {
    let [h, m] = time.trim().split(":").map(Number);

    // 🔥 FIX: handle afternoon times like 1:15 → 13:15
    if (h < 8) h += 12;

    return h * 60 + m;
  };

  const now = toMinutes(nowTime);
  const startTime = toMinutes(start);
  const endTime = toMinutes(end);

  return now >= startTime && now <= endTime;
}

/* ==================================================== GENERATE DESCRIPTORS ========================================================== */

async function generateDescriptors() {
  console.log("🔥 Generating face descriptors...");

  const [students] = await db.query(
    "SELECT * FROM students WHERE face_descriptor IS NULL"
  );

  for (const student of students) {
    if (!student.profile_image) continue;

    try {
      const baseName = path.parse(student.profile_image).name;

      // 🔥 SEARCH IN ALL FOLDERS
      const folders = ["students", "faculty", "hods", "principals"];

      let imagePath = null;

      for (let folder of folders) {
        for (let ext of [".jpg", ".jpeg", ".png"]) {
          const testPath = path.join(uploadDir, folder, baseName + ext);

          if (fs.existsSync(testPath)) {
            imagePath = testPath;
            break;
          }
        }
        if (imagePath) break;
      }

      // ❌ if not found skip
      if (!imagePath) {
        console.log("❌ Image not found for:", student.profile_image);
        continue;
      }

      const img = await canvas.loadImage(imagePath);

      const detections = await faceapi
        .detectAllFaces(
          img,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.3,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections || detections.length === 0) {
        console.log("❌ No face detected in:", imagePath);
        continue;
      }

      // ✅ TAKE FIRST FACE
      const first = detections[0];

      // ✅ CHECK DESCRIPTOR
      if (!first.descriptor) {
        console.log("❌ Descriptor missing:", imagePath);
        continue;
      }

      // ✅ FINAL
      const descriptor = Array.from(first.descriptor);

      await db.query(
        "UPDATE students SET face_descriptor = ? WHERE enrollment = ?",
        [JSON.stringify(descriptor), student.enrollment]
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log("✅ Descriptor saved:", student.enrollment);
    } catch (err) {
      console.log("❌ Descriptor Error:", err);
    }
  }

  console.log("✅ Face Descriptor Generation Completed");
}

/* =================================================== AUTO FACE ROUTE ================================================================= */
app.post("/auto-face", async (req, res) => {
  try {
    console.log("🔥 /auto-face route called");

    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "No image received",
      });
    }

    const actualCameraLocation = "unknown_location";

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const img = await canvas.loadImage(buffer);

    const detections = await faceapi
      .detectAllFaces(
        img,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.3,
        })
      )
      .withFaceLandmarks()
      .withFaceDescriptors();

    /* ================= NO FACE ================= */
    if (!detections || detections.length === 0) {
      return res.json({
        success: false,
        message: "No face detected",
      });
    }

    console.log("DETECTIONS:", detections.length);

    console.log("DETECTIONS LENGTH:", detections.length);
    console.log("FIRST DESCRIPTOR LENGTH:", detections[0]?.descriptor?.length);

    /* ================= FETCH STUDENTS ONCE ================= */
    const [students] = await db.query(
      "SELECT * FROM students WHERE face_descriptor IS NOT NULL"
    );

    const detectedStudents = [];

    /* ================= LOOP ALL FACES ================= */
    for (let face of detections) {
      if (!face.descriptor) continue;

      const descriptor = Array.from(face.descriptor);

      let bestMatch = null;
      let minDistance = 1;
      const THRESHOLD = 0.75;

      for (let student of students) {
        try {
          const storedDescriptor = new Float32Array(
            JSON.parse(student.face_descriptor)
          );

          const distance = euclideanDistance(descriptor, storedDescriptor);

          console.log("Comparing with:", student.enrollment);
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
        // ✅ ADD TO RESULT ARRAY
        detectedStudents.push({
          id: bestMatch.id,
          enrollment: bestMatch.enrollment,
          name: bestMatch.name,
          year: bestMatch.year,
          department: bestMatch.department,
        });

        /* ================= ROAMING LOG ================= */
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
              [bestMatch.id, actualCameraLocation]
            );
            await new Promise(resolve => setTimeout(resolve, 500));

            console.log("✅ Roaming log inserted:", bestMatch.id);
          }

          // ✅ 👉 ADD HERE (OUTSIDE IF)
          /* ================= BUNK EVALUATION ================= */
 /* ================= BUNK EVALUATION =============================================================== */
try {
  const now = new Date();

 const hours = now.getHours();   // 0–23 format
const minutes = now.getMinutes();
const currentTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  const currentDay = now.toLocaleDateString("en-US", { weekday: "long" });

  console.log("🕒 Current Time:", currentTime, "Day:", currentDay);

  if (currentTime < "08:30" || currentTime > "15:30") {
    console.log("⛔ Outside college hours → skipping bunk");
  } else {
    const studentDept = normalizeText(bestMatch.department);
    const studentYear = normalizeYear(bestMatch.year);

    const [lectures] = await db.query(
      `SELECT * FROM timetable WHERE LOWER(day) = LOWER(?)`,
      [currentDay]
    );

    let currentLecture = null;

    for (let lec of lectures) {
      const lecDept = normalizeText(lec.department);
      const lecYear = normalizeYear(lec.year);

      if (
        lecDept === studentDept &&
        lecYear === studentYear &&
        isCurrentTimeInSlot(lec.time, currentTime)
      ) {
        currentLecture = lec;
        break;
      }
    }

    console.log("📘 Current Lecture:", currentLecture);

    if (!currentLecture) {
      console.log("❌ No active lecture → bunk skipped");
    } else {
      const isRecess =
        currentLecture.time === "10:30-11:15" ||
        currentLecture.time === "1:15-1:30";

      if (
        currentLecture.is_break === 1 ||
        currentLecture.subject?.trim().toLowerCase() === "off" ||
        isRecess
      ) {
        console.log("⛔ Recess / OFF lecture → skipped");
      } else {
        const today = new Date().toISOString().split("T")[0];

        const [startRaw, endRaw] = currentLecture.time.split("-");

        const formatTime = (t) => {
          let [h, m] = t.trim().split(":");
          return `${today} ${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`;
        };

        const lecture_start = formatTime(startRaw);
        const lecture_end = formatTime(endRaw);

        const [rows] = await db.query(
          `
          SELECT COUNT(*) AS detections
          FROM roaming_logs
          WHERE student_id = ?
          AND detected_at BETWEEN ? AND ?
          `,
          [bestMatch.id, lecture_start, lecture_end]
        );

        const detections = rows[0]?.detections || 0;
        const status = detections >= 2 ? "bunk" : "present";

        console.log("🧠 Detections:", detections, "Status:", status);

        await db.query(
          `
          INSERT INTO bunk_records
          (student_id, timetable_id, lecture_date, day_name, lecture_number, subject, teacher, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE status = VALUES(status)
          `,
          [
            bestMatch.id,
            currentLecture.id,
            today,
            currentDay,
            currentLecture.lecture_number || 1,
            currentLecture.subject,
            currentLecture.teacher || "",
            status,
          ]
        );

        console.log("✅ BUNK RECORD INSERTED:", bestMatch.id);
      }
    }
  }
} catch (err) {
  console.log("❌ Bunk evaluation error:", err);
}
/*=====================================================================================================================================*/
          } catch (err) {
            console.log("❌ Roaming log error:", err);
          }
        }
    }

      /* ================= FINAL RESPONSE ================= */
      if (detectedStudents.length === 0) {
        return res.json({
          success: false,
          message: "No face recognized",
        });
      }

      return res.json({
        success: true,
        students: detectedStudents,
      });

    } catch (error) {
      console.log("🔥 Auto Face Error:", error);

      return res.status(500).json({
        success: false,
        message: "Server Error",
      });
    }
  });

/* =================================================== MANUAL DESCRIPTOR GENERATION ================================================== */

app.get("/generate-descriptors", async (req, res) => {
  try {
    console.log("🔥 Manual descriptor generation triggered");

    await generateDescriptors();

    res.json({
      success: true,
      message: "Descriptors generated successfully",
    });
  } catch (err) {
    console.log("❌ Error generating descriptors:", err);

    res.status(500).json({
      success: false,
      message: "Error generating descriptors",
    });
  }
});

/* ==================================================== START SERVER ================================================================== */

const PORT = 5000;

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