import { useEffect, useState } from "react";
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

function DepartmentReportModule({ role }) {
  const [summary, setSummary] = useState({});
  const [bunkReport, setBunkReport] = useState([]);
  const [lectureReport, setLectureReport] = useState([]);
  const [facultyReport, setFacultyReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [search, setSearch] = useState("");

useEffect(() => {
  if (role === "principal") {
    Promise.all([
      fetchSummary(),
      fetchBunkReport(),
      fetchLectureReport(),
      fetchFacultyReport(),
      fetchDepartments(), // ✅ ADD THIS
    ])
      .then(() => setLoading(false))
      .catch(() => {
        setError("Failed to load data");
        setLoading(false);
      });
  }
}, [role]);

  /* ================= FETCH FUNCTIONS ================= */

  const fetchDepartments = async () => {
  try {
    const res = await axios.get("/api/department-report/departments");
    setDepartments(res.data.data || []);
  } catch (err) {
    console.log("Departments error:", err);
  }
};

  const fetchSummary = async () => {
    try {
      const res = await axios.get("/api/department-report/summary");
      setSummary(res.data.data || {});
    } catch (err) {
      console.log("Summary fetch error:", err);
      setError("Error loading summary");
    }
  };

  const fetchBunkReport = async () => {
    try {
      const res = await axios.get("/api/department-report/bunk-report");
      setBunkReport(res.data.data || []);
    } catch (err) {
      console.log("Bunk report fetch error:", err);
      setError("Error loading bunk report");
    }
  };

  const fetchLectureReport = async () => {
    try {
      const res = await axios.get("/api/department-report/lecture-report");
      setLectureReport(res.data.data || []);
    } catch (err) {
      console.log("Lecture report fetch error:", err);
      setError("Error loading lecture report");
    }
  };

  const fetchFacultyReport = async () => {
    try {
      const res = await axios.get("/api/department-report/faculty-report");
      setFacultyReport(res.data.data || []);
    } catch (err) {
      console.log("Faculty report fetch error:", err);
      setError("Error loading faculty report");
    }
  };

  if (role !== "principal") {
    return <div className="module-container">Access denied</div>;
  }

  /* ================= FILTER ================= */

  const filteredBunk = bunkReport.filter((item) =>
    departmentFilter ? item.department === departmentFilter : true
  );

  const filteredLecture = lectureReport.filter((item) =>
    departmentFilter ? item.department === departmentFilter : true
  );

  const filteredFaculty = facultyReport.filter((item) =>
    departmentFilter ? item.department === departmentFilter : true
  );

  const searchedFaculty = filteredFaculty.filter((item) =>
    String(item.teacher || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  /* ================= TOP DEPARTMENTS ================= */

  const topBunkDept =
    filteredBunk.length > 0
      ? [...filteredBunk].sort(
          (a, b) => Number(b.percentage) - Number(a.percentage)
        )[0]
      : null;

  const bestDept =
    filteredBunk.length > 0
      ? [...filteredBunk].sort(
          (a, b) => Number(a.percentage) - Number(b.percentage)
        )[0]
      : null;

  const rankedDepartments = [...filteredBunk].sort(
    (a, b) => Number(a.percentage) - Number(b.percentage)
  );

  /* ================= EXPORT ================= */

  const exportCSV = () => {
    const rows = [
      ["Department", "Bunk", "Present", "Bunk %"],
      ...filteredBunk.map((item) => [
        item.department,
        item.bunk,
        item.present,
        item.percentage,
      ]),
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "department_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ================= CHART DATA ================= */

  const bunkChartData = {
    labels: filteredBunk.map((item) => item.department),
    datasets: [
      {
        label: "Bunk %",
        data: filteredBunk.map((item) => Number(item.percentage)),
        backgroundColor: "rgba(239,68,68,0.8)",
      },
    ],
  };

  const lectureChartData = {
    labels: filteredLecture.map((item) => item.department),
    datasets: [
      {
        label: "Total Lectures",
        data: filteredLecture.map((item) => item.total_lectures),
        backgroundColor: "rgba(59,130,246,0.8)",
      },
      {
        label: "Edited",
        data: filteredLecture.map((item) => item.edited_lectures),
        backgroundColor: "rgba(245,158,11,0.8)",
      },
      {
        label: "Off",
        data: filteredLecture.map((item) => item.off_lectures),
        backgroundColor: "rgba(34,197,94,0.8)",
      },
    ],
  };

  const pieData = {
    labels: filteredBunk.map((item) => item.department),
    datasets: [
      {
        data: filteredBunk.map((item) => Number(item.percentage)),
        backgroundColor: [
          "#6366f1",
          "#3b82f6",
          "#ef4444",
          "#10b981",
          "#f59e0b",
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true } },
  };

  if (loading) {
    return <div className="module-container">Loading report...</div>;
  }

  return (
    <div className="module-container">
      <h2>Department Report</h2>

      {/* ERROR */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* FILTER */}
   <div className="filter-bar">
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
        >
          <option value="">All Departments</option>
      {departments.map((dept) => (
  <option key={dept} value={dept}>
    {dept}
  </option>
))}
        </select>

        <button onClick={() => setDepartmentFilter("")}>Clear</button>
        <button onClick={exportCSV}>Export CSV</button>
      </div>

      {/* SUMMARY */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div className="card">Departments: {summary.totalDepartments || 0}</div>
        <div className="card">Lectures: {summary.totalLectures || 0}</div>
        <div className="card">Bunks: {summary.totalBunks || 0}</div>
        <div className="card">Present: {summary.totalPresent || 0}</div>
        <div className="card">Bunk %: {summary.bunkPercentage || 0}%</div>
      </div>

      {/* TOP */}
      <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
        <div className="card">
          Highest Bunk: {topBunkDept?.department || "N/A"}
        </div>
        <div className="card">
          Best Department: {bestDept?.department || "N/A"}
        </div>
      </div>

      {/* RANKING */}
      <div className="chart-card" style={{ marginTop: "20px" }}>
        <h3>Department Ranking</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Department</th>
              <th>Bunk %</th>
            </tr>
          </thead>
          <tbody>
            {rankedDepartments.map((item, index) => (
              <tr key={index}>
                <td>#{index + 1}</td>
                <td>{item.department}</td>
                <td>{item.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rankedDepartments.length === 0 && <p>No ranking data found.</p>}
      </div>

      {/* CHARTS */}
      <div className="chart-card">
        <h3>Department Bunk Analysis</h3>
        <div style={{ height: "320px" }}>
          <Bar data={bunkChartData} options={chartOptions} />
        </div>
      </div>

      <div className="chart-card">
        <h3>Department Contribution (Bunk %)</h3>
        <div style={{ height: "320px" }}>
          <Pie data={pieData} />
        </div>
      </div>

      <div className="chart-card">
        <h3>Department Lecture Analysis</h3>
        <div style={{ height: "320px" }}>
          <Bar data={lectureChartData} options={chartOptions} />
        </div>
      </div>

      {/* BUNK TABLE */}
      <div className="chart-card">
        <h3>Department Bunk Summary</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Bunk</th>
              <th>Present</th>
              <th>Bunk %</th>
            </tr>
          </thead>
          <tbody>
            {filteredBunk.map((item, i) => (
              <tr key={i}>
                <td>{item.department}</td>
                <td>{item.bunk}</td>
                <td>{item.present}</td>
                <td>{item.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBunk.length === 0 && <p>No bunk data found.</p>}
      </div>

      {/* LECTURE TABLE */}
      <div className="chart-card">
        <h3>Department Lecture Summary</h3>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Total Lectures</th>
              <th>Edited</th>
              <th>Off</th>
            </tr>
          </thead>
          <tbody>
            {filteredLecture.map((item, i) => (
              <tr key={i}>
                <td>{item.department}</td>
                <td>{item.total_lectures}</td>
                <td>{item.edited_lectures}</td>
                <td>{item.off_lectures}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLecture.length === 0 && <p>No lecture data found.</p>}
      </div>

      {/* FACULTY SEARCH */}
      <div className="chart-card">
        <h3>Faculty Contribution</h3>

        <input
          type="text"
          placeholder="Search faculty..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "8px 12px",
            marginBottom: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            width: "250px",
            maxWidth: "100%",
          }}
        />

        <table className="analytics-table">
          <thead>
            <tr>
              <th>Faculty</th>
              <th>Department</th>
              <th>Total Lectures</th>
              <th>Edited</th>
              <th>Off</th>
            </tr>
          </thead>
          <tbody>
            {searchedFaculty.map((item, i) => (
              <tr key={i}>
                <td>{item.teacher}</td>
                <td>{item.department}</td>
                <td>{item.total_lectures}</td>
                <td>{item.edited_lectures}</td>
                <td>{item.off_lectures}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {searchedFaculty.length === 0 && <p>No faculty data found.</p>}
      </div>
    </div>
  );
}

export default DepartmentReportModule;