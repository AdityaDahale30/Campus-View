import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

axios.defaults.baseURL = "http://localhost:5000";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function LectureAnalyticsModule({ role, userDepartment }) {
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;

  const [summary, setSummary] = useState({});
  const [records, setRecords] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const isFaculty =
    role === "faculty_class_teacher" || role === "faculty_teacher_guardian";

  const pageTitle = isFaculty
    ? "My Lecture Analytics"
    : role === "hod"
    ? "Department Lecture Analytics"
    : "Campus Lecture Analytics";

  const daysOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  useEffect(() => {
    if (!user) return;

    if (isFaculty) {
      fetchFacultySummary();
      fetchRecords(user.id);
      fetchWeekly(user.id);
    }

    if (role === "hod") {
      fetchDepartmentSummary();
      fetchRecords(null, userDepartment);
      fetchWeeklyDepartment(userDepartment);
    }

    if (role === "principal") {
      fetchDepartmentSummary(true);
      fetchRecords();
      fetchWeeklyDepartment();
    }
  }, [role, userDepartment]);

  const fetchFacultySummary = async () => {
    try {
      const res = await axios.get(
        `/api/lecture-analytics/faculty-summary/${user.id}`
      );
      setSummary(res.data.data || {});
    } catch (err) {
      console.log("Faculty summary error:", err);
    }
  };

  const fetchDepartmentSummary = async (all = false) => {
    try {
      const res = await axios.get(`/api/lecture-analytics/department-summary`, {
        params: all ? {} : { department: userDepartment },
      });
      setFacultyList(res.data.data || []);
    } catch (err) {
      console.log("Department summary error:", err);
    }
  };

  const fetchRecords = async (facultyId = null, department = null) => {
    try {
      const params = {};
      if (facultyId) params.faculty_id = facultyId;
      if (department) params.department = department;

      const res = await axios.get(`/api/lecture-analytics/records`, {
        params,
      });

      setRecords(res.data.data || []);
    } catch (err) {
      console.log("Records fetch error:", err);
    }
  };

  const fetchWeekly = async (facultyId) => {
    try {
      const res = await axios.get("/api/lecture-analytics/weekly", {
        params: { faculty_id: facultyId },
      });
      setWeeklyData(res.data.data || []);
    } catch (err) {
      console.log("Weekly fetch error:", err);
    }
  };

  const fetchWeeklyDepartment = async (department = null) => {
    try {
      const params = {};
      if (department) params.department = department;

      const res = await axios.get("/api/lecture-analytics/weekly-department", {
        params,
      });
      setWeeklyData(res.data.data || []);
    } catch (err) {
      console.log("Weekly department fetch error:", err);
    }
  };

  const exportCSV = () => {
    const rows = [
      ["Date", "Day", "Lecture", "Subject", "Teacher", "Status"],
      ...filteredRecords.map((r) => [
        new Date(r.lecture_date).toLocaleDateString(),
        r.day_name,
        r.lecture_number,
        r.subject,
        r.faculty_name,
        r.status,
      ]),
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "lecture_analytics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const statusMatch = statusFilter ? r.status === statusFilter : true;
      const facultyMatch = facultyFilter
        ? r.faculty_name === facultyFilter
        : true;
      const dateMatch = dateFilter
        ? new Date(r.lecture_date).toISOString().split("T")[0] === dateFilter
        : true;

      return statusMatch && facultyMatch && dateMatch;
    });
  }, [records, statusFilter, facultyFilter, dateFilter]);

  const totalTaken = isFaculty
    ? Number(summary.taken) || 0
    : facultyList.reduce((sum, f) => sum + (Number(f.taken) || 0), 0);

  const totalLeave = isFaculty
    ? Number(summary.leave_count) || 0
    : facultyList.reduce((sum, f) => sum + (Number(f.leave_count) || 0), 0);

  const totalOff = isFaculty
    ? Number(summary.off_count) || 0
    : facultyList.reduce((sum, f) => sum + (Number(f.off_count) || 0), 0);

  const totalLectures = totalTaken + totalLeave + totalOff;
  const performance =
    totalLectures > 0 ? ((totalTaken / totalLectures) * 100).toFixed(1) : 0;

  const weeklyChartData = {
    labels: daysOrder,
    datasets: [
      {
        label: "Lectures",
        data: daysOrder.map((day) => {
          const found = weeklyData.find((d) => d.day_name === day);
          return found ? Number(found.count) : 0;
        }),
        backgroundColor: "#ff4d4f",
        borderRadius: 6,
      },
    ],
  };

  const facultyBarData = {
    labels: ["Taken", "Leave", "Off"],
    datasets: [
      {
        label: "Lecture Count",
        data: [
          Number(summary.taken) || 0,
          Number(summary.leave_count) || 0,
          Number(summary.off_count) || 0,
        ],
        backgroundColor: ["#4caf50", "#ff9800", "#f44336"],
        borderRadius: 6,
      },
    ],
  };

  const facultyPieData = {
    labels: ["Taken", "Leave", "Off"],
    datasets: [
      {
        data: [
          Number(summary.taken) || 0,
          Number(summary.leave_count) || 0,
          Number(summary.off_count) || 0,
        ],
        backgroundColor: ["#4caf50", "#ff9800", "#f44336"],
        borderWidth: 1,
      },
    ],
  };

  const deptBarData = {
    labels:
      facultyList.length > 0
        ? facultyList.map((f) => f.faculty_name)
        : ["No Data"],
    datasets: [
      {
        label: "Taken",
        data:
          facultyList.length > 0
            ? facultyList.map((f) => Number(f.taken) || 0)
            : [0],
        backgroundColor: "#4caf50",
        borderRadius: 6,
      },
      {
        label: "Leave",
        data:
          facultyList.length > 0
            ? facultyList.map((f) => Number(f.leave_count) || 0)
            : [0],
        backgroundColor: "#ff9800",
        borderRadius: 6,
      },
      {
        label: "Off",
        data:
          facultyList.length > 0
            ? facultyList.map((f) => Number(f.off_count) || 0)
            : [0],
        backgroundColor: "#f44336",
        borderRadius: 6,
      },
    ],
  };

  const deptPieData = {
    labels: ["Taken", "Leave", "Off"],
    datasets: [
      {
        data:
          facultyList.length > 0
            ? [
                facultyList.reduce(
                  (sum, f) => sum + (Number(f.taken) || 0),
                  0
                ),
                facultyList.reduce(
                  (sum, f) => sum + (Number(f.leave_count) || 0),
                  0
                ),
                facultyList.reduce(
                  (sum, f) => sum + (Number(f.off_count) || 0),
                  0
                ),
              ]
            : [0, 0, 0],
        backgroundColor: ["#4caf50", "#ff9800", "#f44336"],
        borderWidth: 1,
      },
    ],
  };

  const commonBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  const commonPieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
    },
  };

  const getStatusStyle = (status) => {
    if (status === "taken") {
      return {
        color: "green",
        fontWeight: "600",
        background: "#eaf7ea",
        padding: "4px 10px",
        borderRadius: "999px",
        display: "inline-block",
      };
    }
    if (status === "leave") {
      return {
        color: "orange",
        fontWeight: "600",
        background: "#fff4e5",
        padding: "4px 10px",
        borderRadius: "999px",
        display: "inline-block",
      };
    }
    if (status === "off") {
      return {
        color: "red",
        fontWeight: "600",
        background: "#fdeaea",
        padding: "4px 10px",
        borderRadius: "999px",
        display: "inline-block",
      };
    }
    return {};
  };

  if (!user) {
    return (
      <div className="module-container">
        <h2>Lecture Analytics</h2>
        <p>User not found. Please login again.</p>
      </div>
    );
  }

  return (
    <div className="module-container">
      <h2>{pageTitle}</h2>

      <div
        className="analytics-cards"
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div
          className="card"
          style={{
            background: "#fff",
            padding: "14px 20px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            fontWeight: "600",
            minWidth: "140px",
          }}
        >
          Taken: {totalTaken}
        </div>

        <div
          className="card"
          style={{
            background: "#fff",
            padding: "14px 20px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            fontWeight: "600",
            minWidth: "140px",
          }}
        >
          Leave: {totalLeave}
        </div>

        <div
          className="card"
          style={{
            background: "#fff",
            padding: "14px 20px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            fontWeight: "600",
            minWidth: "140px",
          }}
        >
          Off: {totalOff}
        </div>

        <div
          className="card"
          style={{
            background: "#fff",
            padding: "14px 20px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            fontWeight: "600",
            minWidth: "160px",
          }}
        >
          Performance: {performance}%
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: "20px" }}>
        <h3>Weekly Lecture Analytics</h3>
        <div style={{ height: "250px" }}>
          <Bar data={weeklyChartData} options={commonBarOptions} />
        </div>
      </div>

      <div className="analytics-row">
        <div className="chart-card">
          <h3>
            {isFaculty ? "Lecture Summary" : "Faculty Lecture Analytics"}
          </h3>
          <div style={{ height: "260px" }}>
            <Bar
              data={isFaculty ? facultyBarData : deptBarData}
              options={commonBarOptions}
            />
          </div>
        </div>

        <div className="chart-card">
          <h3>{isFaculty ? "Status Distribution" : "Department Distribution"}</h3>
          <div style={{ height: "260px" }}>
            <Pie
              data={isFaculty ? facultyPieData : deptPieData}
              options={commonPieOptions}
            />
          </div>
        </div>
      </div>

      {!isFaculty && facultyList.length > 0 && (
        <div className="chart-card" style={{ marginTop: "20px" }}>
          <h3>Faculty Summary</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Taken</th>
                  <th>Leave</th>
                  <th>Off</th>
                </tr>
              </thead>
              <tbody>
                {facultyList.map((f) => (
                  <tr key={f.faculty_id}>
                    <td>{f.faculty_name}</td>
                    <td>{f.taken}</td>
                    <td>{f.leave_count}</td>
                    <td>{f.off_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="chart-card" style={{ marginTop: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <h3 style={{ margin: 0 }}>Lecture History</h3>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <select
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            >
              <option value="">All Faculty</option>
              {facultyList.map((f) => (
                <option key={f.faculty_id} value={f.faculty_name}>
                  {f.faculty_name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            >
              <option value="">All Status</option>
              <option value="taken">Taken</option>
              <option value="leave">Leave</option>
              <option value="off">Off</option>
            </select>

            <button
              onClick={() => {
                setFacultyFilter("");
                setStatusFilter("");
                setDateFilter("");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                background: "#e74c3c",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Clear Filters
            </button>

            <button
              onClick={exportCSV}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                background: "#2d89ef",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Lecture</th>
                <th>Subject</th>
                <th>Teacher</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => (
                <tr key={r.id} style={{ transition: "0.2s" }}>
                  <td>{new Date(r.lecture_date).toLocaleDateString()}</td>
                  <td>{r.day_name}</td>
                  <td>{r.lecture_number}</td>
                  <td>{r.subject}</td>
                  <td>{r.faculty_name}</td>
                  <td>
                    <span style={getStatusStyle(r.status)}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && <p>No lecture records found.</p>}
      </div>
    </div>
  );
}

export default LectureAnalyticsModule;