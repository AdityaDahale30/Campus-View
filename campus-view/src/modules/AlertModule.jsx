import { useEffect, useState } from "react";
import axios from "axios";

function AlertModule() {
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);


  // ✅ FIX: DEFINE USER HERE (GLOBAL)
  const user = JSON.parse(localStorage.getItem("user"));

  const markAsRead = async (id) => {
    try {
      await axios.put(
        `http://localhost:5000/api/alerts/mark-read/${id}/${user.role}`
      );

      fetchAlerts();
    } catch (err) {
      console.log(err);
    }
  };

  const fetchAlerts = async () => {
    try {
      console.log("USER:", user);

      const res = await axios.get(
        `http://localhost:5000/api/alerts/${user.id}/${user.role}`
      );

      console.log("API RESPONSE:", res.data);

      setAlerts(res.data || []);
    } catch (err) {
      console.log(err);
    }
  };
  useEffect(() => {
    if (!user?.id) return;

    fetchAlerts();

    const interval = setInterval(() => {
      fetchAlerts();
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

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

    fetchAlertCount();

    const interval = setInterval(fetchAlertCount, 5000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="alert-container">

      <h2 className="alert-title">🚨 Alerts</h2>

      {alerts.length === 0 ? (
        <p className="no-alerts">No alerts</p>
      ) : (
        alerts.map((alert) => (
          <div
            key={alert.id}
            className="alert-card"
          >

            <div className="alert-left-bar"></div>

            <div className="alert-content">
              <div className="alert-header">

                {/* ✅ FIXED */}
                <span className="alert-student">
                  Student: {alert.student_name}
                </span>

                {/* OPTIONAL: REMOVE STATUS UI */}
                <span className="status">
                  {(
                    (["faculty", "faculty_class_teacher"].includes(user.role) && alert.faculty_read === 0) ||
                    (user.role === "faculty_teacher_guardian" && alert.tg_read === 0) ||
                    (user.role === "hod" && alert.hod_read === 0)
                  )
                    ? "unread"
                    : "read"}
                </span>

              </div>

              <p className="alert-message">{alert.message}</p>
              <div className="alert-extra">
  {alert.year && <p>🎓 Year: {alert.year}</p>}

  {alert.lecture_number && (
    <p>📚 Lecture: {alert.lecture_number}</p>
  )}

  {alert.lecture_time && (
    <p>⏰ Lecture Time: {alert.lecture_time}</p>
  )}

  {alert.detected_at && (
    <p>
      🕒 Detected:{" "}
      {new Date(alert.detected_at).toLocaleString()}
    </p>
  )}
</div>

              {/* ✅ FIXED ROLE-BASED BUTTON */}
              {(
                (["faculty", "faculty_class_teacher"].includes(user.role) && alert.faculty_read === 0) ||
                (user.role === "faculty_teacher_guardian" && alert.tg_read === 0) ||
                (user.role === "hod" && alert.hod_read === 0)
              ) && (
                  <button
                    className="mark-btn"
                    onClick={() => markAsRead(alert.id)}
                  >
                    Mark as Read
                  </button>
                )}

            </div>

          </div>
        ))
      )}

    </div>
  );
}

export default AlertModule;