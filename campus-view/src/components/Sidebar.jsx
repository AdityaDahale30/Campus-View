import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import StudentBadge from "../modules/StudentBadge";
import { useRef } from "react";
import { showConfirm } from "../utils/alerts";

function Sidebar({ role, activeMenu, setActiveMenu, setChatCount, setAlertCount }) {
  const navigate = useNavigate();

  const [user, setUser] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeData, setBadgeData] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false); // ✅ kept (safe)
  const dropdownRef = useRef(null);

  /* ================= LOAD USER ================= */
  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("user")) || {};
    setUser(loggedInUser);
  }, []);

  /* ================= FETCH UNREAD MESSAGES ================= */
  useEffect(() => {
    if (!user?.id) return;

    const fetchUnread = async () => {
      try {
        const userId = user?.id;
        const userRole = user?.role;

        const res = await axios.get(
          `http://localhost:5000/api/chat/unread/${userId}/${userRole}`
        );

        let totalUnread = 0;

        if (Array.isArray(res.data)) {
          res.data.forEach((msg) => {
            totalUnread += Number(msg.unread_count || 0);
          });
        }

        setUnreadCount(totalUnread);
        setChatCount(totalUnread);

      } catch (err) {
        console.log("Unread fetch error:", err);
      }
    };

    fetchUnread();

    const interval = setInterval(fetchUnread, 3000);
    return () => clearInterval(interval);
  }, [user?.id]);

  /* ================= FETCH ALERT COUNT ================= */
const fetchAlertCount = async () => {
  try {
    const res = await axios.get(
      `http://localhost:5000/api/alerts/unread/${user.id}/${user.role}`
    );

    console.log("🔔 ALERT COUNT:", res.data);

    setAlertCount(res.data.count || 0);
  } catch (err) {
    console.log(err);
  }
};
useEffect(() => {
  if (!user?.id) return;

  fetchAlertCount();

  const interval = setInterval(() => {
    fetchAlertCount();
  }, 5000);

  return () => clearInterval(interval);
}, [user?.id]);

  /* ================= BADGE MODULE ================= */
  useEffect(() => {
    const userData = localStorage.getItem("user");
    const user = userData ? JSON.parse(userData) : null;

    if (!user) return;
    if (user.role !== "student") return;

    const enrollmentNo = user.enrollment || user.enrollment_no;
    if (!enrollmentNo) return;

    const fetchBadge = () => {
      axios
        .get(`http://localhost:5000/api/student-badge/${enrollmentNo}`)
        .then((res) => {
          if (res.data.success) {
            setBadgeData(res.data);
          }
        })
        .catch((err) => console.log("Badge fetch error:", err));
    };

    fetchBadge();

    const interval = setInterval(fetchBadge, 10000);

    window.addEventListener("badgeUpdated", fetchBadge);

    return () => {
      clearInterval(interval);
      window.removeEventListener("badgeUpdated", fetchBadge);
    };
  }, []);

  /* ================= CLICK OUTSIDE ================= */
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

  /* ================= ROLE ================= */
  const currentRole = role || user?.role;

  /* ================= MENU ================= */
  const menuItems = {
    student: [
      "Time Table",
      "Bunk Analysis",
      "Gate Pass",
      "Notices",
      "Chatbot"
    ],

    faculty: [
      "Time Table",
      "Gate Pass (Faculty)",
      "Alerts",
      "Notices",
      "Chatbot"
    ],

    faculty_class_teacher: [
      "Time Table",
      "Gate Pass (Faculty)",
      "Gate Pass Approval",
      "Alerts",
      "Notices",
      "Chatbot"
    ],

    faculty_teacher_guardian: [
      "Time Table",
      "Gate Pass (Faculty)",
      "Gate Pass Approval",
      "Alerts",
      "Notices",
      "Chatbot"
    ],

    hod: [
      "Time Table",
      "Lecture Analytics",
      "Gate Pass Approval",
      "Alerts",
      "Notices",
      "Chatbot"
    ],

    hod_faculty: [
      "Time Table",
      "Lecture Analytics",
      "Gate Pass Approval",
      "Alerts",
      "Notices",
      "Chatbot"
    ],

    principal: [
      "Notices",
      "Department Report"
    ]
  };

  const roleMenus = menuItems[currentRole] || [];



  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    const result = await showConfirm(
      "Logout?",
      "Do you really want to logout?"
    );

    if (result.isConfirmed) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  return (
    <div className="sidebar">

      {/* ================= TOP / PROFILE ================= */}
      <div className="logo">
      
        <h4>Campus View    </h4>
        

        <div className="top-row">
          <img
            src={
              user?.profile_image
                ? `http://localhost:5000/uploads/${user.profile_image}`
                : "/default-avatar.png"
            }
            className="topbar-profile"
            alt="profile"
          />

          <StudentBadge badgeData={badgeData} />
        </div>

        <h6>{user?.name || "User"}</h6>

        {user?.enrollment && <h6>{user.enrollment}</h6>}
        {user?.year && <h6>{user.year} year</h6>}
        {user?.department && (
          <h6>{user.department.replaceAll("_", " ")}</h6>
        )}
      </div>

      <p className="role-text">
        {currentRole?.replaceAll("_", " ").toUpperCase() || "UNKNOWN ROLE"}
      </p>

      {/* ================= MENU ================= */}
      <ul>
        {roleMenus.length > 0 ? (
          roleMenus.map((item) => (
            <li
              key={item}
              className={activeMenu === item ? "active-menu" : ""}
              onClick={() => {
                setShowDropdown(false);
                setActiveMenu(item);
              }}
            >
              {item}
            </li>
          ))
        ) : (
          <li>No Access</li>
        )}
      </ul>

      {/* ================= BOTTOM ================= */}
      <div className="sidebar-bottom">
        <button
          className="exit-btn"
          onClick={handleLogout}
        >
          🔴 Logout
        </button>
      </div>

    </div>
  );
}

export default Sidebar;