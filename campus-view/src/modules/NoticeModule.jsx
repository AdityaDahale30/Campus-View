import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { showSuccess, showError, showConfirm, showLoading, closeAlert } from "../utils/alerts";

axios.defaults.baseURL = "https://campus-view.onrender.com";

function NoticeModule({ role, userDepartment, userYear }) {
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [department, setDepartment] = useState(userDepartment || "all");
  const [year, setYear] = useState(userYear || "all");
  const [targetRole, setTargetRole] = useState("student");
  const [notices, setNotices] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNotices, setExpandedNotices] = useState({});
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("");

  const isFacultyRole =
    role === "faculty_teacher_guardian" ||
    role === "faculty_class_teacher" ||
    role === "hod_faculty";

  const isPrincipal = role === "principal";

  const canPost = isFacultyRole || role === "hod" || role === "principal";

  const receivedTitle =
    role === "hod"
      ? "Notices from Principal"
      : isFacultyRole
      ? "Received Notices"
      : role === "student"
      ? "Received Notices"
      : "Received Notices";

  const sendTitle =
    role === "hod"
      ? "Send Notice"
      : isFacultyRole
      ? "Send Notice to Students"
      : role === "principal"
      ? "Send Notice"
      : "Send Notice";

  const normalizeYear = (value) => {
    const val = String(value || "all").toLowerCase().trim();

    if (val === "1st" || val === "1" || val === "fy") return "1";
    if (val === "2nd" || val === "2" || val === "sy") return "2";
    if (val === "3rd" || val === "3" || val === "ty") return "3";
   
    return val;
  };

  const formatDisplayYear = (value) => {
    if (String(value) === "1") return "1st Year";
    if (String(value) === "2") return "2nd Year";
    if (String(value) === "3") return "3rd Year";
    if (String(value) === "4") return "4th Year";
    if (String(value).toLowerCase() === "all") return "All Years";
    return value;
  };

  const formatDepartment = (value) => {
    if (!value) return "All Departments";
    if (String(value).toLowerCase() === "all") return "All Departments";

    return String(value)
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatRelativeTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;

    return created.toLocaleDateString();
  };

  const formatFullDateTime = (createdAt) => {
    const created = new Date(createdAt);
    return created.toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeLeft = (createdAt) => {
    const created = new Date(createdAt).getTime();
    const expiry = created + 24 * 60 * 60 * 1000;
    const now = Date.now();
    const diff = expiry - now;

    if (diff <= 0) return "Expiring soon";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours <= 0) return `${minutes}m left`;
    return `${hours}h left`;
  };

  const showStatus = (message, type) => {
    setStatusMessage(message);
    setStatusType(type);

    setTimeout(() => {
      setStatusMessage("");
      setStatusType("");
    }, 3000);
  };

  const fetchNotices = async () => {
    try {
      setLoading(true);

      let receiverTargetRole = "all";
      let normalizedYear = normalizeYear(userYear || "all");

      if (role === "student") {
        receiverTargetRole = "student";
      } else if (
        role === "faculty_teacher_guardian" ||
        role === "faculty_class_teacher" ||
        role === "hod_faculty"
      ) {
        receiverTargetRole = "faculty";
      } else if (role === "hod") {
        receiverTargetRole = "hod";
      } else if (role === "principal") {
        receiverTargetRole = "principal";
      }

      const res = await axios.get("/api/notices", {
        params: {
          department: (userDepartment || "all").toLowerCase(),
          year: normalizedYear,
          target_role: receiverTargetRole,
          role: role,
        },
      });

      if (res.data.success) {
        setNotices(res.data.notices || []);
      }
    } catch (error) {
      console.error("Fetch notice error:", error);
      showStatus("Failed to fetch notices", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [role, userDepartment, userYear]);

  useEffect(() => {
    if (role === "principal") {
      setDepartment("all");
      setYear("all");
      setTargetRole("all");
    } else if (role === "hod") {
      setDepartment((userDepartment || "all").toLowerCase());
      setYear("all");
      setTargetRole("student");
    } else if (isFacultyRole) {
      const normalizedYear = normalizeYear(userYear || "all");
      setDepartment((userDepartment || "all").toLowerCase());
      setYear(normalizedYear);
      setTargetRole("student");
    }
  }, [role, userDepartment, userYear, isFacultyRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      showStatus("Title and message are required", "error");
      return;
    }

    if (title.trim().length < 3) {
      showStatus("Title must be at least 3 characters", "error");
      return;
    }

    try {
      setPosting(true);
      showLoading("Posting notice...");

      const normalizedYear = normalizeYear(year);

      const res = await axios.post("/api/notices", {
        title: title.trim(),
        message: message.trim(),
        posted_by: user?.name || "Unknown",
        role: role.toLowerCase(),
        department: (department || "all").toLowerCase(),
        year: String(normalizedYear || "all").toLowerCase(),
        target_role:
          role === "faculty_teacher_guardian" ||
          role === "faculty_class_teacher" ||
          role === "hod_faculty"
            ? "student"
            : targetRole.toLowerCase(),
      });

     if (res.data.success) {
  closeAlert();
  showSuccess("Posted ✅", "Notice posted successfully");
        setTitle("");
        setMessage("");
        fetchNotices();
      }
    } catch (error) {
      console.error("Add notice error:", error);
      closeAlert();
showError("Error", "Failed to post notice");
    } finally {
      setPosting(false);
    }
  };

  const canDeleteNotice = (notice) => {
    if (!user) return false;

    const currentRole = String(role || "").toLowerCase();
    const currentName = String(user?.name || "").trim().toLowerCase();
    const noticeRole = String(notice.role || "").toLowerCase();
    const noticePostedBy = String(notice.posted_by || "").trim().toLowerCase();

    if (currentRole === "principal") return true;

    if (currentRole === "hod") {
      return noticeRole === "hod" && currentName === noticePostedBy;
    }

    if (
      currentRole === "faculty_teacher_guardian" ||
      currentRole === "faculty_class_teacher" ||
      currentRole === "hod_faculty"
    ) {
      return (
        (noticeRole === "faculty_teacher_guardian" ||
          noticeRole === "faculty_class_teacher" ||
          noticeRole === "hod_faculty") &&
        currentName === noticePostedBy
      );
    }

    return false;
  };

  const handleDeleteNotice = async (noticeId) => {
  const result = await showConfirm(
  "Delete Notice?",
  "Are you sure you want to delete this notice?"
);

if (!result.isConfirmed) return;

    try {
      const res = await axios.delete(`/api/notices/${noticeId}`, {
        data: {
          role: role,
          posted_by: user?.name || "",
        },
      });

      if (res.data.success) {
       showSuccess("Deleted 🗑", "Notice deleted successfully");
        fetchNotices();
      }
    } catch (error) {
      console.error("Delete notice error:", error);
   showError(
  "Error",
  error?.response?.data?.message || "Failed to delete notice"
);
    }
  };

  const toggleExpanded = (noticeId) => {
    setExpandedNotices((prev) => ({
      ...prev,
      [noticeId]: !prev[noticeId],
    }));
  };

  const filteredNotices = useMemo(() => {
    return notices.filter((notice) => {
      const search = searchTerm.toLowerCase();
      return (
        notice.title?.toLowerCase().includes(search) ||
        notice.message?.toLowerCase().includes(search) ||
        notice.posted_by?.toLowerCase().includes(search)
      );
    });
  }, [notices, searchTerm]);

  return (
    <div className="notice-module">
      <div className="notice-header">
        <div>
          <h2>Notice Board</h2>
          <p className="notice-subtitle">
            Stay updated with the latest announcements
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className={`notice-status ${statusType}`}>{statusMessage}</div>
      )}

      {isPrincipal ? (
        <div className="principal-notice-full">
          <div className="notice-form-wrapper">
            <h3 className="section-title">{sendTitle}</h3>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Enter notice title"
                  value={title}
                  maxLength={100}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <span className="char-count">{title.length}/100</span>
              </div>

              <div className="input-group">
                <textarea
                  placeholder="Write your notice message here..."
                  value={message}
                  maxLength={1000}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <span className="char-count">{message.length}/1000</span>
              </div>

              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="all">All Departments</option>
                <option value="computer_engineering">Computer Engineering</option>
                <option value="ai_ml">Artificial Intelligence & Machine Learning</option>
                <option value="electronics_telecommunication">
                  Electronics & Telecommunication
                </option>
                <option value="electrical_engineering">Electrical Engineering</option>
                <option value="civil_engineering">Civil Engineering</option>
                <option value="mechanical_engineering">Mechanical Engineering</option>
              </select>

              <select value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="all">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                
              </select>

              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              >
                <option value="all">All</option>
                <option value="student">Students</option>
                <option value="faculty">Faculty</option>
                <option value="hod">HOD</option>
              </select>

              <button
                type="submit"
                className="post-notice-btn"
                disabled={posting}
              >
                {posting ? "Posting..." : "Post Notice"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="notice-layout">
          {canPost && (
            <div className="notice-left">
              <div className="notice-form-wrapper">
                <h3 className="section-title">{sendTitle}</h3>

                <form onSubmit={handleSubmit}>
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Enter notice title"
                      value={title}
                      maxLength={100}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    <span className="char-count">{title.length}/100</span>
                  </div>

                  <div className="input-group">
                    <textarea
                      placeholder="Write your notice message here..."
                      value={message}
                      maxLength={1000}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <span className="char-count">{message.length}/1000</span>
                  </div>

                  {role === "hod" && (
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                    >
                      <option value="student">Students</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  )}

                  {isFacultyRole && (
                    <div className="fixed-notice-info">
                      <p>
                        <strong>Department:</strong> {formatDepartment(department)}
                      </p>
                      <p>
                        <strong>Year:</strong> {formatDisplayYear(year)}
                      </p>
                      <p>
                        <strong>Send To:</strong> Students
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="post-notice-btn"
                    disabled={posting}
                  >
                    {posting ? "Posting..." : "Post Notice"}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="notice-right">
            <div className="notice-section">
              <div className="notice-section-header">
                <h3 className="section-title">{receivedTitle}</h3>

                <div className="notice-toolbar">
                  <input
                    type="text"
                    className="notice-search"
                    placeholder="Search notices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="notice-list">
                {loading ? (
                  <div className="loading-box">Loading notices...</div>
                ) : filteredNotices.length === 0 ? (
                  <div className="empty-notice-box">
                    <h4>No notices available</h4>
                    <p>New notices for your role will appear here.</p>
                  </div>
                ) : (
                  filteredNotices.map((notice) => {
                    const isExpanded = expandedNotices[notice.id];
                    const shouldTruncate = notice.message?.length > 180;
                    const displayMessage =
                      shouldTruncate && !isExpanded
                        ? `${notice.message.slice(0, 180)}...`
                        : notice.message;

                    return (
                      <div key={notice.id} className="notice-card">
                        <div className="notice-card-top">
                          <div className="notice-card-title-wrap">
                            <h3>{notice.title}</h3>
                            <div className="notice-card-badges">
                              <span className={`notice-badge ${notice.role}`}>
                                {notice.role?.replaceAll("_", " ").toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="notice-card-actions">
                            {canDeleteNotice(notice) && (
                              <button
                                type="button"
                                className="delete-notice-btn"
                                onClick={() => handleDeleteNotice(notice.id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="notice-message">{displayMessage}</p>

                        {shouldTruncate && (
                          <button
                            type="button"
                            className="read-more-btn"
                            onClick={() => toggleExpanded(notice.id)}
                          >
                            {isExpanded ? "Read Less" : "Read More"}
                          </button>
                        )}

                        <div className="notice-meta">
                          <span>By {notice.posted_by}</span>
                          <span>{formatRelativeTime(notice.created_at)}</span>
                          <span>{formatFullDateTime(notice.created_at)}</span>
                          <span>{getTimeLeft(notice.created_at)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NoticeModule;