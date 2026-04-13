import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { showSuccess, showError, showLoading, closeAlert } from "../utils/alerts";

function CameraOverlay({ onClose, onStudentDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [facingMode, setFacingMode] = useState("environment");
  const [isCameraActive, setIsCameraActive] = useState(true);
  const isDetectingRef = useRef(false);

/* ========================================================== START CAMERA ==================================================================== */

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    }
  }, [facingMode, isCameraActive]);

  useEffect(() => {
    return () => {
      stopCamera(); 
    };
  }, []);

  const startCamera = async () => {
    console.log("🎥 Starting camera mode:", facingMode);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError("Camera Error", "Camera not supported");
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode }, 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false,
        });
      } catch (err) {
        console.log("FacingMode failed, trying default camera:", err);

        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.log("Camera Error:", err);
      console.log("Camera permission denied or not supported");
    }
  };

/* ============================================================ SWITCH CAMERA ================================================================== */
  const switchCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const videoDevices = devices.filter(d => d.kind === "videoinput");

      console.log("Available Cameras:", videoDevices);

      // 🔥 Check if more than 1 camera exists
      if (videoDevices.length < 2) {
        showError("Camera", "Back camera not supported ❌");
        return;
      }

      // 🔥 Safe switch
      setFacingMode((prev) =>
        prev === "environment" ? "user" : "environment"
      );

    } catch (err) {
      console.log("Switch Camera Error:", err);
      showError("Error", "Unable to access camera");
    }
  };

/* =========================================================== CAPTURE + DETECT ================================================================ */

  const handleCapture = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      alert("Camera not ready yet");
      return;
    }

    if (isDetectingRef.current) return;
    isDetectingRef.current = true;

    setLoading(true);
    showLoading("Detecting face...");

    try {
      const image = captureFrame();

      const res = await axios.post("http://localhost:5000/auto-face", {
        image,
      });

      console.log("API RESPONSE:", res.data);

      if (!res.data.success) {
        closeAlert();
        showError(
          "Not Recognized",
          res.data.message || "Student not recognized"
        );
        setLoading(false);
        isDetectingRef.current = false;
        return;
      }

      const detectedStudents = res.data.students || [];

      console.log("Students detected:", detectedStudents);

      closeAlert();

      setStudents((prev) => {
        const map = new Map();

        
        prev.forEach((s) => map.set(s.id, s));

        
        detectedStudents.forEach((s) => map.set(s.id, s));

        return Array.from(map.values());
      });

      detectedStudents.forEach((stu) => {

      });

      for (const stu of detectedStudents) {
        try {
          await axios.post("http://localhost:5000/api/alerts/create-alert", {
            student_id: stu.id,
            message: "🚨 Student roaming detected in campus",
          });
          console.log("✅ Alert created for:", stu.name);
        } catch (err) {
          console.log("Alert error:", err);
        }
      }

      if (onStudentDetected) {
        detectedStudents.forEach((stu) => onStudentDetected(stu));
      }
    } catch (err) {
      console.log("Detection Error:", err);
      console.log("Backend response:", err?.response?.data);

      closeAlert();

      showError(
        "Detection Failed",
        err?.response?.data?.message || "Detection failed"
      );
    }

    setLoading(false);
    isDetectingRef.current = false;
  };

/* ========================================================== CAPTURE FRAME =================================================================== */

  const captureFrame = () => {
    const canvas = document.createElement("canvas");

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);

    return canvas.toDataURL("image/jpeg");
  };

/* ======================================================= STOP CAMERA ======================================================================== */

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();                 
        });
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current.removeAttribute("src");
        videoRef.current.load();        
      }

      console.log("📴 Camera fully stopped");

    } catch (err) {
      console.log("❌ Stop error:", err);
    }
  };

/* ========================================================== DEBUG ========================================================================== */

  return (
    <div className="camera-overlay">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />



      <div className="camera-controls">
        <button onClick={handleCapture} disabled={loading}>
          📸 {loading ? "Detecting..." : "Capture & Detect"}
        </button>


        <button onClick={switchCamera}>🔄 Switch Camera</button>

        <button
          onClick={() => {
            setStudents([]);
            stopCamera();               
            setIsCameraActive(false);   
            onClose();                  
          }}
        >
          ❌ Close
        </button>
      </div>

{/* ====================================================== Student Detection POP UP =========================================================== */}

      {students.length > 0 && (
        <div className="ai-popup-backdrop">

{/* ============================================================ COUNTER =======================================================================*/}

          <div className="ai-counter">
            🎯 Showing {Math.min(4, students.length)} of {students.length} Students
          </div>

{/* ====================================================== CENTER POPUP (1–3 students) ========================================================*/}

          {students.length <= 3 ? (
            students.map((stu) => (
              <div key={stu.id} className="ai-popup-center">

                <div className="ai-popup-icon success">✔</div>

                <div className="ai-popup-title">
                  Student Detected 🎯
                </div>

                <div className="ai-popup-sub">
                  <b>{stu.name}</b><br />
                  {stu.enrollment}<br />
                  {stu.year}<br />
                  {stu.department}
                </div>

                <button
                  className="ai-popup-btn"
                  onClick={() =>
                    setStudents(prev => prev.filter(s => s.id !== stu.id))
                  }
                >
                  OK
                </button>

              </div>
            ))
          ) : (

/* ================================================================ STACK POPUPS (4+) =========================================================*/

            students.slice(0, 4).map((stu, index) => (
              <div
                key={stu.id}
                className="ai-detection-popup"
                style={{
                  top: `${70 + index * 110}px`,
                  right: "20px",
                  position: "absolute",
                  zIndex: 999
                }}
              >
                <div className="ai-popup-icon success">✔</div>

                <div className="ai-popup-title">
                  Student Detected 🎯
                </div>

                <div className="ai-popup-sub">
                  <b>{stu.name}</b><br />
                  {stu.enrollment}<br />
                  {stu.year}<br />
                  {stu.department}
                </div>

                <button
                  className="ai-popup-btn"
                  onClick={() =>
                    setStudents(prev => prev.filter(s => s.id !== stu.id))
                  }
                >
                  OK
                </button>
              </div>
            ))
          )}

        </div>
      )}

    </div>
  );
}

export default CameraOverlay;