import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

/* ================= Modules ================= */
import BunkAnalysisModule from "../modules/BunkAnalysisModule";
import ChatbotModule from "../modules/ChatbotModule";
import FacultyAnalyticsModule from "../modules/FacultyAnalytics";
import GatePassModule from "../modules/GatePassModule";
import TimeTableModule from "../modules/TimeTableModule";
import AlertModule from "../modules/AlertModule";
import NoticeModule from "../modules/NoticeModule";
import LectureAnalyticsModule from "../modules/LectureAnalyticsModule";
import DepartmentReportModule from "../modules/DepartmentReportModule";

/* ================= Camera ================= */
import CameraOverlay from "../components/CameraOverlay";

import "../styles/dashboard.css";

function DashboardLayout({ role }) {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [activeMenu, setActiveMenu] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (!token || !user) {
      navigate("/login");
      return;
    }

    if (user.role !== role) {
      navigate("/login");
    }
  }, [navigate, role, token, user]);

  const moduleMapping = {
    "Bunk Analysis": (
      <BunkAnalysisModule studentId={user?.enrollment || user?.id} />
    ),

    "Chatbot": <ChatbotModule />,

    "Faculty Analytics": <FacultyAnalyticsModule />,

    "Alerts": <AlertModule />,

    "Time Table": (
      <TimeTableModule
        role={role}
        userClass={user?.batch || ""}
        userYear={user?.year || ""}
        userDepartment={user?.department || ""}
      />
    ),

    "Lecture Analytics": (
      <LectureAnalyticsModule
        role={role}
        userDepartment={user?.department || ""}
      />
    ),
    "Department Report": <DepartmentReportModule role={role} />,

    "Gate Pass": <GatePassModule role={role} mode="student" />,
    "Gate Pass Approval": <GatePassModule role={role} mode="approval" />,
    "Gate Pass (Faculty)": <GatePassModule role={role} mode="faculty" />,

    "Student Leaves": (
      <div className="module-container">Student Leaves Module</div>
    ),

    "Call / Message": (
      <div className="module-container">Call / Message Module</div>
    ),

    "Camera Capture": (
      <div className="module-container">Camera Capture Module</div>
    ),

    "Notices": (
      <NoticeModule
        role={role}
        userDepartment={user?.department || ""}
        userYear={user?.year || ""}
      />


    ),
  };

  const renderModule = () => {
    if (!role) return <h2>Invalid Role</h2>;

    if (moduleMapping[activeMenu]) {
      return moduleMapping[activeMenu];
    }

    if (activeMenu) {
      return (
        <div className="module-container">
          <h2>{activeMenu}</h2>
          <p>This module is under development.</p>
        </div>
      );
    }

    return (
      <div className="welcome-box">
        <h2>
          👋 Welcome, <span className="highlight">{user?.name || "User"}</span>
        </h2>


      </div>
    );
  };

  return (
    <div className={`dashboard-wrapper role-${role}`}>
      <Sidebar
        role={role}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        setChatCount={setChatCount}
        setAlertCount={setAlertCount}
      />

      <div className="dashboard-main">
        <Topbar
          role={role}
          chatCount={chatCount}
          alertCount={alertCount}
          setActiveMenu={setActiveMenu}
        />

        <div className="dashboard-content">{renderModule()}</div>
      </div>

      {cameraOpen && (
        <CameraOverlay
          onClose={() => setCameraOpen(false)}
          onStudentDetected={(student) => {
            console.log("🔥 Student Detected:", student);
          }}
        />
      )}
    </div>
  );
}

export default DashboardLayout;