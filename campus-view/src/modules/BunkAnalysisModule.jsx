import { useEffect, useState } from "react";
import axios from "axios";

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

import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function BunkAnalysisModule() {
  const [weeklyData, setWeeklyData] = useState([]);
  const [records, setRecords] = useState([]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (user?.id) fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const studentId = user.id;

      const weeklyRes = await axios.get(
        `https://campus-view.onrender.com/api/bunk/student/${studentId}/weekly`
      );

      const recordsRes = await axios.get(
        `https://campus-view.onrender.com/api/bunk/student/${studentId}`
      );

      setWeeklyData(weeklyRes.data.weeklyData || []);
      setRecords(recordsRes.data.records || []);
    } catch (err) {
      console.log(err);
    }
  };

  /* ================= SUMMARY ================= */

  const totalBunks = records.filter(r => r.status === "bunk").length;
  const totalPresent = records.filter(r => r.status === "present").length;

  /* ================= WEEKLY ================= */

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const formattedWeekly = days.map(day => {
    const found = weeklyData.find(
      d => d.day_name.toLowerCase() === day.toLowerCase()
    );
    return found ? found.bunk_count : 0;
  });

  /* ================= CHART DATA ================= */

  const barData = {
    labels: days,
    datasets: [
      {
        label: "Bunk Count",
        data: formattedWeekly,
        backgroundColor: "rgba(239,68,68,0.8)",
      },
    ],
  };

  const pieData = {
    labels: ["Bunk", "Present"],
    datasets: [
      {
        data: [totalBunks, totalPresent],
        backgroundColor: ["#ef4444", "#22c55e"],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="bunk-page">

      {/* WEEKLY GRAPH */}
      <div className="bunk-card">
        <h3>Weekly Bunk Analytics</h3>
        <div className="chart-container">
          <Bar data={barData} options={options} />
        </div>
      </div>

      {/* PIE GRAPH */}
      <div className="bunk-card">
        <h3>Bunk vs Present</h3>
        <div className="chart-container">
          <Pie data={pieData} options={options} />
        </div>
      </div>

    </div>
  );
}

export default BunkAnalysisModule;