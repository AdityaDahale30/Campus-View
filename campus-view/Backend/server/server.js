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

/* ================= SAFE FACE IMPORT ================= */

let faceapi = null;
let canvas = null;

try {
  faceapi = (await import("face-api.js")).default;
  canvas = (await import("canvas")).default;

  const { Canvas, Image, ImageData } = canvas;
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

  console.log("✅ Face API loaded");
} catch (err) {
  console.log("⚠️ Face API disabled (Render safe mode)");
}

/* ================= FIX __dirname ================= */

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
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(cookieParser());

/* ================= STATIC ================= */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/models", express.static(path.join(__dirname, "models")));

/* ================= ROUTES ================= */

app.use("/chat", chatRoutes);
console.log("✅ CHAT ROUTES LOADED");

app.use("/api", authRoutes);
app.use("/api", gatepassRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api", noticeRoutes);
app.use("/api", badgeRoutes);
app.use("/api", bunkRoutes);
app.use("/api", roamingRoutes);
app.use("/api", alertRoutes);

/* ================= BASIC ROUTES ================= */

app.get("/", (req, res) => {
  res.send("Backend Running ✅");
});

app.get("/test", (req, res) => {
  res.send("Server Working ✅");
});

/* ================= SAFE FACE ROUTE ================= */

app.post("/auto-face", async (req, res) => {
  try {
    if (!faceapi || !canvas) {
      return res.json({
        success: false,
        message: "Face module disabled in production"
      });
    }

    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: "No image received" });
    }

    const buffer = Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    const img = await canvas.loadImage(buffer);

    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return res.json({ success: false, message: "No face detected" });
    }

    return res.json({
      success: true,
      message: "Face detected (safe mode)"
    });

  } catch (error) {
    console.log("🔥 Auto Face Error:", error);

    res.status(500).json({
      success: false,
      message: "Face error"
    });
  }
});

/* ================= ERROR HANDLER ================= */

process.on("uncaughtException", (err) => {
  console.log("🔥 SERVER CRASH PREVENTED:", err);
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  try {
    if (faceapi) {
      const modelPath = path.join(__dirname, "models");

      await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);

      console.log("✅ Face models loaded");
    }
  } catch (err) {
    console.log("⚠️ Model loading skipped (safe mode)");
  }
});