import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function FacultyAnalytics() {

  const facultyStats = [
    { name: "Prof. Sharma", avgBunk: 12 },
    { name: "Prof. Patil", avgBunk: 28 },
    { name: "Prof. Joshi", avgBunk: 7 },
    { name: "Prof. Khan", avgBunk: 18 }
  ];

  const data = {
    labels: facultyStats.map(f => f.name),
    datasets: [
      {
        label: "Average Class Bunk %",
        data: facultyStats.map(f => f.avgBunk),
        backgroundColor: "rgba(59,130,246,0.7)"
      }
    ]
  };

  return (
    <div className="module-container">
      <h2 className="module-title">Faculty Performance Overview</h2>
      <Bar data={data} />
    </div>
  );
}

export default FacultyAnalytics;