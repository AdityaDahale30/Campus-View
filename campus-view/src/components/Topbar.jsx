
import CameraOverlay from "../components/CameraOverlay";
import cameraImg from "../camera1.jpg";
import { useState, useRef, useEffect } from "react";

function Topbar({ role, chatCount = 0, alertCount = 0, setActiveMenu }) {
  const [showCamera, setShowCamera] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
 

  useEffect(() => {
  const handleClickOutside = (event) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target)
    ) {
      setShowDropdown(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

  const totalCount =
    role === "student"
      ? chatCount
      : chatCount + alertCount;

  return (
    <>
      <div className="topbar">

        <div className="topbar-right">

          {/* 🔔 BELL ICON MOVED HERE */}
          {role !== "principal" && (
            <div className="notification-wrapper" ref={dropdownRef}>

              <div
                className="bell-icon"
                onClick={(e) => {
  e.stopPropagation();
  setShowDropdown(prev => !prev);
}}
              >
                🔔
                {totalCount > 0 && (
                  <span className="badge">{totalCount}</span>
                )}
              </div>

              {showDropdown && (
                <div className="notification-dropdown">

                  <div className="dropdown-header">
                    Notifications
                  </div>

                  {/* CHAT */}
                  <div
                    className="notification-item"
                    onClick={() => {
                      setShowDropdown(false);
                      setActiveMenu("Chatbot");
                    }}
                  >
                    <div className="icon">💬</div>
                    <div className="content">
                      <span className="title">Chat Messages</span>
                      <span className="count">{chatCount}</span>
                    </div>
                  </div>

                  {/* ALERTS (ONLY FACULTY + HOD) */}
                  {["faculty", "faculty_class_teacher", "faculty_teacher_guardian", "hod", "hod_faculty"].includes(role) && (
                    <div
                      className="notification-item"
                      onClick={() => {
                        setShowDropdown(false);
                        setActiveMenu("Alerts");
                      }}
                    >
                      <div className="icon alert">🚨</div>
                      <div className="content">
                        <span className="title">Alerts</span>
                        <span className="count">{alertCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CAMERA BUTTON */}
          {(role !== "student") && !showCamera && (
            <button className="camera-btn" onClick={() => setShowCamera(true)}>
              <img src={cameraImg} alt="camera" />
            </button>
          )}

        </div>
      </div>

      {/* CAMERA OVERLAY */}
      {showCamera && (
        <CameraOverlay onClose={() => setShowCamera(false)} />
      )}
    </>
  );
}

export default Topbar;