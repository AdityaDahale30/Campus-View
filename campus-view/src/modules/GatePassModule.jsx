import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import axios from "axios";
import { showSuccess, showError, showLoading, closeAlert } from "../utils/alerts";
import { useParams } from "react-router-dom";

function GatePassModule({ role, mode }) {
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;
  const { id } = useParams();   // 👈 get QR id
  

  const isFacultyApprover =
    role === "faculty_class_teacher" || role === "faculty_teacher_guardian";

  const [formData, setFormData] = useState({
    name: user?.name || "",
    enrollment: user?.enrollment || "",
    className: `${user?.year || ""} ${user?.department || ""}`.trim(),
    department: user?.department || "",
    reason: "",
    exit_time: "",
    exit_date: "",
  });

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
const [activeTab, setActiveTab] = useState("approved");
const [showHistory, setShowHistory] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const [studentApprover, setStudentApprover] = useState({
    tg_name: "",
    class_teacher_name: "",
    tg_available: 0,
    class_teacher_available: 0,
    active_approver_name: "",
    active_approver_role: "",
  });

  const [facultyHOD, setFacultyHOD] = useState({
  hod_id: "",
  hod_name: "",
});

  const fetchAvailability = async () => {
    if (!user?.id || !isFacultyApprover) return;

    try {
      const res = await axios.get(
        `https://campus-view.onrender.com/api/faculty-availability/${user.id}`
      );
      setAvailability(Number(res.data.faculty.gatepass_available));
    } catch (err) {
      console.log("Availability fetch error:", err);
    }
  };

  const updateAvailability = async (value) => {
    if (!user?.id) return;

    try {
      setAvailabilityLoading(true);

      const res = await axios.put(
        `https://campus-view.onrender.com/api/faculty-availability/${user.id}`,
        { gatepass_available: value }
      );

      setAvailability(Number(res.data.gatepass_available));
    showSuccess("Updated", res.data.message);
    } catch (err) {
      console.log("Availability update error:", err);
    showError("Error", err.response?.data?.message || "Failed to update availability");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const fetchStudentApprover = async () => {
    if (!user?.id || mode !== "student") return;

    try {
      const res = await axios.get(
        `https://campus-view.onrender.com/student-approver/${user.id}`
      );
      setStudentApprover(res.data);
    } catch (err) {
      console.log("Student approver fetch error:", err);
    }
  };

const fetchFacultyHOD = async () => {
  if (!user?.id || mode !== "faculty") return;

  try {
    const res = await axios.get(
      `https://campus-view.onrender.com/api/faculty-hod/${user.id}`
    );
    setFacultyHOD(res.data);
  } catch (err) {
    console.log("Faculty HOD fetch error:", err);
  }
};
  const fetchRequests = async () => {
    if (!user) return;

    try {
      let res;

      if (mode === "student" || mode === "faculty") {
        res = await axios.get(
          `https://campus-view.onrender.com/api/my-gate_pass/${user.id}`
        );
      }

      if (mode === "approval") {
        if (
          role === "faculty_class_teacher" ||
          role === "faculty_teacher_guardian"
        ) {
          res = await axios.get(
            `https://campus-view.onrender.com/api/tg-requests/${user.id}`
          );
        }

        if (role === "hod" || role === "hod_faculty") {
          res = await axios.get(
            `https://campus-view.onrender.com/api/hod-requests/${user.id}`
          );
        }
      }

      if (res) setRequests(res.data);
    } catch (err) {
      console.log("Fetch requests error:", err);
    }
  };

  const fetchSingleRequest = async () => {
  try {
    const res = await axios.get(
      `https://campus-view.onrender.com/api/gatepass/${id}`
    );

    setRequests([res.data]); // 👈 wrap in array (VERY IMPORTANT)
    setActiveTab("approved"); // show approved tab directly
  } catch (err) {
    console.log(err);
  }
};

useEffect(() => {
  if (id) {
    fetchSingleRequest();
    return; // ✅ VERY IMPORTANT
  }

  if (!user?.id) return;

  fetchRequests();
  fetchAvailability();
  fetchStudentApprover();
  fetchFacultyHOD();

  const interval = setInterval(() => {
    fetchRequests();
    fetchAvailability();
    fetchStudentApprover();
    fetchFacultyHOD();
  }, 5000);

  return () => clearInterval(interval);
}, [role, mode, user?.id, id]);

  const handleChange = (e) => {
  const { name, value } = e.target;

  if (name === "exit_time") {
    const now = new Date();
    const selectedDate = formData.exit_date;

    if (selectedDate === today) {
      const currentTime = now.toTimeString().slice(0, 5);

      if (value < currentTime) {
        showError("Invalid", "Past time not allowed");
        return;
      }
    }
  }

  setFormData({ ...formData, [name]: value });
};

const submitRequest = async (e) => {

  
  e.preventDefault();

  if (!formData.reason.trim()) return showError("Missing", "Enter reason");
  if (!formData.exit_time) return showError("Missing", "Select time");
  if (!formData.exit_date) return showError("Missing", "Select date");

  const now = new Date();
const selectedDateTime = new Date(`${formData.exit_date}T${formData.exit_time}`);

if (selectedDateTime < now) {
  return showError("Invalid Time", "You cannot select past time");
}

  try {
    setLoading(true);

    // ✅ LOADING
    showLoading("Submitting request...");

    const res = await axios.post("https://campus-view.onrender.com/api/gate_pass", {
      student_name: formData.name,
      enrollment_no: mode === "student" ? formData.enrollment : "",
      class_name: formData.className,
      department: formData.department,
      reason: formData.reason,
      exit_time: formData.exit_time,
      exit_date: formData.exit_date,
      requester_id: user.id,
      requester_role: mode === "faculty" ? "faculty" : "student",
    });

    closeAlert();

    // ✅ SUCCESS
    showSuccess(
      "Request Sent ✅",
      `Sent to ${res.data.approver_name} (${res.data.approver_role})`
    );

    setFormData((prev) => ({
      ...prev,
      reason: "",
      exit_time: "",
      exit_date: "",
    }));

    fetchRequests();
    fetchStudentApprover();

  } catch (error) {
    closeAlert();

    showError("Error", error.response?.data?.message || "Error");
  } finally {
    setLoading(false);
  }
};

const updateStatus = async (id, status) => {
const updateStatus = async (id, status) => {
  try {
    console.log("API CALL START");

    showLoading(`${status}ing...`);

    await axios.put(`https://campus-view.onrender.com/api/update-status/${id}`, {
      status,
    });

    console.log("API SUCCESS");

    closeAlert();
    showSuccess(status, `Gate pass ${status.toLowerCase()} successfully`);

    fetchRequests();

  } catch (error) {
    console.log("API ERROR:", error);
    closeAlert();
    showError("Error", "Failed to update status");
  }
};

  try {
    showLoading(`${status}ing...`);

    await axios.put(`https://campus-view.onrender.com/api/update-status/${id}`, {
      status,
    });

    closeAlert();

    showSuccess(status, `Gate pass ${status.toLowerCase()} successfully`);

    fetchRequests();

  } catch (error) {
    closeAlert();

    showError("Error", "Failed to update status");
    console.log("Update status error:", error);
  }
};

 const renderCard = (req) => {
  return (
    <div key={req.id} className="gp-card-modern">
      <div className="gp-card-top">
        <h3 className="gp-card-name">{req.student_name}</h3>

        <span className={`gp-badge ${req.status.toLowerCase()}`}>
          {req.status}
        </span>
      </div>

      <div className="gp-card-details">
        <p><strong>Enrollment:</strong> {req.enrollment_no || "-"}</p>
        <p><strong>Class:</strong> {req.class_name || "-"}</p>
        <p><strong>Department:</strong> {req.department || "-"}</p>
        <p><strong>Reason:</strong> {req.reason || "-"}</p>
        <p><strong>Exit Time:</strong> {req.exit_time?.slice(0, 5) || "-"}</p>
        <p>
          <strong>Exit Date:</strong>{" "}
          {req.exit_date ? new Date(req.exit_date).toLocaleDateString() : "-"}
        </p>
        <p><strong>Approver Role:</strong> {req.approver_role || "-"}</p>
      </div>

      {req.status === "Approved" && (
        <div className="gp-qr-box">
    <QRCodeCanvas
  value={`https://campus-view.onrender.com/gatepass/${req.id}`}
/>
        </div>
      )}

      {mode === "approval" && req.status === "Pending" && (
        <div className="gp-card-actions">
          <button
            onClick={() => updateStatus(req.id, "Approved")}
            className="approve-btn"
          >
            Approve
          </button>

          <button
            onClick={() => updateStatus(req.id, "Rejected")}
            className="reject-btn"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

  if (!user) return <div className="no-data">Loading user...</div>;

  const pending = requests.filter((r) => r.status === "Pending");
  const approved = requests.filter((r) => r.status === "Approved");
  const rejected = requests.filter((r) => r.status === "Rejected");
  const totalCount = requests.length;
const pendingCount = pending.length;
const approvedCount = approved.length;
const rejectedCount = rejected.length;



  const latestApproved = approved[0];
const latestRejected = rejected[0];

const modalData =
  activeTab === "pending"
    ? pending
    : activeTab === "approved"
    ? approved
    : rejected;
  const approverName =
    studentApprover.tg_available === 1
      ? studentApprover.tg_name || "TG not assigned"
      : studentApprover.class_teacher_available === 1
      ? studentApprover.class_teacher_name || "Class Teacher not assigned"
      : "No Approver Available";

  const approverRole =
    studentApprover.tg_available === 1
      ? "Teacher Guardian"
      : studentApprover.class_teacher_available === 1
      ? "Class Teacher"
      : "No Approver Available";

const canSubmit =
  formData.reason.trim() &&
  formData.exit_time &&
  formData.exit_date &&
  (
    mode === "student"
      ? approverName !== "No Approver Available"
      : facultyHOD.hod_name
  );
  const today = new Date().toISOString().split("T")[0];
  return (
    <div className="gatepass-page">
      <div className="gatepass-container">
        <div className="gatepass-topbar">
          <div>
            <h2 className="gatepass-title">Gate Pass </h2>
          </div>
        </div>

        {/* ================= SUMMARY CARDS ================= */}
<div className="gp-summary">
  
  <div className="gp-summary-card total">
    <h4>Total</h4>
    <p>{totalCount}</p>
  </div>

  <div className="gp-summary-card pending">
    <h4>Pending</h4>
    <p>{pendingCount}</p>
  </div>

  <div className="gp-summary-card approved">
    <h4>Approved</h4>
    <p>{approvedCount}</p>
  </div>

  <div className="gp-summary-card rejected">
    <h4>Rejected</h4>
    <p>{rejectedCount}</p>
  </div>

</div>
<div className="gp-activity-bar">
  {latestApproved && (
    <span>
      Latest approved: {new Date(latestApproved.exit_date).toLocaleDateString()}
    </span>
  )}
  {latestRejected && (
    <span>
      Latest rejected: {new Date(latestRejected.exit_date).toLocaleDateString()}
    </span>
  )}
</div>

        {isFacultyApprover && (
          <div className="gatepass-card">
            <h3 className="gatepass-card-title">Gate Pass Approval Availability</h3>

            <div className="availability-row">
              <span className="availability-label">Current Status:</span>
              <span
                className={`status-text ${
                  availability === 1
                    ? "available"
                    : availability === 0
                    ? "unavailable"
                    : ""
                }`}
              >
                {availability === 1
                  ? "Available"
                  : availability === 0
                  ? "Unavailable"
                  : "Loading..."}
              </span>
            </div>

            <div className="availability-actions">
              <button
                type="button"
                className="status-btn available-btn"
                onClick={() => updateAvailability(1)}
                disabled={availabilityLoading}
              >
                {availabilityLoading && availability !== 0 ? "Updating..." : "Available"}
              </button>

              <button
                type="button"
                className="status-btn unavailable-btn"
                onClick={() => updateAvailability(0)}
                disabled={availabilityLoading}
              >
                {availabilityLoading && availability !== 1 ? "Updating..." : "Unavailable"}
              </button>
            </div>
          </div>
        )}

        {(mode === "student" || mode === "faculty") && (
          <div className="gatepass-card">
            

            

            <form onSubmit={submitRequest} className="gatepass-form">
              <div className="gatepass-form-grid">
                <div className="form-group">
                  <label className="form-label">
  {mode === "faculty" ? "Faculty Name" : "Student Name"}
</label>
                  <input className="form-input" value={formData.name} readOnly />
                </div>

                {mode === "student" && (
                  <div className="form-group">
                    <label className="form-label">Enrollment Number</label>
                    <input
                      className="form-input"
                      value={formData.enrollment}
                      readOnly
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Class</label>
                  <input className="form-input" value={formData.className} readOnly />
                </div>

                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    className="form-input"
                    value={formData.department}
                    readOnly
                  />
                </div>
{/* ================= STUDENT APPROVER ================= */}
{mode === "student" && (
  <>
    <div className="form-group">
      <label className="form-label">Approver Name</label>
      <input className="form-input" value={approverName} readOnly />
    </div>

    <div className="form-group">
      <label className="form-label">Approver Role</label>
      <input className="form-input" value={approverRole} readOnly />
    </div>
  </>
)}

{/* ================= FACULTY HOD ================= */}
{mode === "faculty" && (
  <>
    <div className="form-group">
      <label className="form-label">HOD Name</label>
      <input
        className="form-input"
        value={facultyHOD.hod_name || "HOD not found"}
        readOnly
      />
    </div>

    <div className="form-group">
      <label className="form-label">Approver Role</label>
      <input className="form-input" value="HOD" readOnly />
    </div>

    <div className="form-group full-width">
      <div className="gp-helper-text">
        Faculty requests go directly to HOD approval.
      </div>
    </div>
  </>
)}
  
                <div className="form-group full-width">
                  <label className="form-label">Reason</label>
                  <textarea
                    className="form-textarea"
                    name="reason"
                    placeholder="Enter reason..."
                    value={formData.reason}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Exit Time</label>
                 

<input
  type="time"
  name="exit_time"
  className="form-input"
  value={formData.exit_time}
  onChange={handleChange}
  min={
    formData.exit_date === today
      ? new Date().toTimeString().slice(0, 5)
      : "00:00"
  }
/>
                </div>

                <div className="form-group">
                  <label className="form-label">Exit Date</label>
               <input
  type="date"
  name="exit_date"
  className="form-input"
  min={today}
  value={formData.exit_date}
  onChange={handleChange}
/>
                </div>
              </div>

              <div className="form-actions">
              <button
  type="submit"
  className="submit-btn"
  disabled={!canSubmit || loading}
>
  {loading ? "Submitting..." : "Submit Request"}
</button>
              </div>
            </form>
          </div>
        )}
{/* ================= TABS ================= */}
{!id && (
  <div className="gp-tabs">
    {["pending", "approved", "rejected"].map((tab) => (
      <button
        key={tab}
        className={activeTab === tab ? "active" : ""}
        onClick={() => setActiveTab(tab)}
      >
        {tab.toUpperCase()}
      </button>
    ))}
  </div>
)}

{/* ================= FILTER + LIMIT ================= */}
{(() => {
  const filtered =
    activeTab === "pending"
      ? pending
      : activeTab === "approved"
      ? approved
      : rejected;

const visible =
  activeTab === "pending" ? filtered : filtered.slice(0, 2);

  return (
    <div className="requests-wrapper">
      <h3 className="requests-title">
        {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Requests
      </h3>

      <div className="request-list">
        {visible.map(renderCard)}
      </div>

      {filtered.length > 3 && (
      <button
  className="view-history-btn"
  onClick={() => setShowHistory(true)}
>
  View All
</button>
      )}
    </div>
  );
})()}
{showHistory && (
  <div className="history-modal" onClick={() => setShowHistory(false)}>
    <div
      className="history-content"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="history-header">
        <h3>
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} History
        </h3>
        <button
          className="history-close-btn"
          onClick={() => setShowHistory(false)}
        >
          ✕
        </button>
      </div>

      <div className="request-list">
        {modalData.map(renderCard)}
      </div>
    </div>
  </div>
)}
        {requests.length === 0 && <div className="no-data">No Requests Found</div>}
      </div>
    </div>
  );
}

export default GatePassModule;