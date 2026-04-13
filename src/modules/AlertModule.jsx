import { useEffect, useState } from "react";
import axios from "axios";

function AlertModule() {
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedTime, setSelectedTime] = useState("");


  const [appliedFilters, setAppliedFilters] = useState({
    date: "",
    time: "",
    status: ""
  });


  const user = JSON.parse(localStorage.getItem("user"));

  const applyFilters = () => {
    setAppliedFilters({
      date: selectedDate,
      time: selectedTime,
      status: selectedStatus
    });
  };

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
      const res = await axios.get(
        `http://localhost:5000/api/alerts/${user.id}/${user.role}`,
        {
          params: {
            date: appliedFilters.date,
            time: appliedFilters.time,
            status: appliedFilters.status
          }
        }
      );

      setAlerts(res.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    fetchAlerts();
  }, [appliedFilters]);



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

      <h2 className="alert-title">
        🚨 Alerts
        {alertCount > 0 && (
          <span className="alert-badge">{alertCount}</span>
        )}
      </h2>

      <div className="alert-filters">

        <div className="filter-group">
          <label>Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Time</label>

          <input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
          />
        </div>


        <div className="filter-group">
          <label>Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="read">Read</option>
            <option value="unread">Unread</option>
          </select>
        </div>

{/* ==================================================================== APPLY BUTTON ====================================================== */}

        <button
          className="apply-btn"
          onClick={applyFilters}
          disabled={!selectedDate && !selectedTime && !selectedStatus}
        >
          Apply Filters
        </button>

{/* ==================================================================== CLEAR BUTTON ========================================================*/}

        <button
          className="clear-btn"
          onClick={() => {
            setSelectedDate("");
            setSelectedTime("");
            setSelectedStatus("");

            setAppliedFilters({
              date: "",
              time: "",
              status: ""
            });
          }}
        >
          Clear
        </button>
        <div className="active-filters">
          {appliedFilters.date && <span>📅 {appliedFilters.date}</span>}
          {appliedFilters.time && <span>⏰ {appliedFilters.time}</span>}
          {appliedFilters.status && <span>📌 {appliedFilters.status}</span>}
        </div>
      </div>
      {alerts.length === 0 ? (
        <p className="no-alerts">✅ No alerts found for selected filters</p>
      ) : (
        alerts.map((alert) => (
          <div
            key={alert.id}
            className={`alert-card ${(alert.faculty_read === 0 || alert.tg_read === 0 || alert.hod_read === 0)
              ? "unread-card"
              : ""
              }`}
          >

            <div className="alert-left-bar"></div>

            <div className="alert-content">
              <div className="alert-header">


                <span className="alert-student">
                  Student: {alert.student_name}
                </span>


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

{/*=========================================================  FIXED ROLE-BASED BUTTON =======================================================*/}

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