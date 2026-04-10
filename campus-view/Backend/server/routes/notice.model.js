import db from "../db.js";

// Add new notice
export const addNotice = async (req, res) => {
  try {
    const { title, message, posted_by, role, department, year, target_role } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    const sql = `
      INSERT INTO notices (title, message, posted_by, role, department, year, target_role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [
      title,
      message,
      posted_by || "Unknown",
      (role || "unknown").toLowerCase(),
      (department || "all").toLowerCase(),
      String(year || "all").toLowerCase(),
      (target_role || "all").toLowerCase(),
    ]);

    res.status(201).json({
      success: true,
      message: "Notice added successfully",
      noticeId: result.insertId,
    });
  } catch (error) {
    console.error("Add Notice Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding notice",
    });
  }
};

// Get notices
export const getNotices = async (req, res) => {
  try {
    // Auto delete notices older than 24 hours
    await db.query("DELETE FROM notices WHERE created_at < NOW() - INTERVAL 1 DAY");

    const department = (req.query.department || "all").toLowerCase();
    const year = String(req.query.year || "all").toLowerCase();
    const target_role = (req.query.target_role || "all").toLowerCase();
    const role = (req.query.role || "").toLowerCase();

    let sql = `SELECT * FROM notices WHERE 1=1`;
    let values = [];

    // Department filter
    sql += ` AND (LOWER(department) = ? OR LOWER(department) = 'all')`;
    values.push(department);

    // Year filter only for students
    if (role === "student") {
      sql += ` AND (LOWER(year) = ? OR LOWER(year) = 'all')`;
      values.push(year);
    }

    // Sender visibility
    if (role === "student") {
      sql += ` AND LOWER(role) IN ('faculty_teacher_guardian', 'faculty_class_teacher', 'hod', 'principal')`;
    } else if (
      role === "faculty_teacher_guardian" ||
      role === "faculty_class_teacher"
    ) {
      sql += ` AND LOWER(role) IN ('hod', 'principal')`;
    } else if (role === "hod") {
      sql += ` AND LOWER(role) IN ('principal')`;
    } else if (role === "principal") {
      // principal can see all
    }

    // Receiver filter
    sql += ` AND (LOWER(target_role) = ? OR LOWER(target_role) = 'all')`;
    values.push(target_role);

    sql += ` ORDER BY created_at DESC`;

    console.log("GET NOTICES SQL:", sql);
    console.log("GET NOTICES VALUES:", values);

    const [rows] = await db.query(sql, values);

    console.log("FETCHED NOTICES:", rows);

    res.status(200).json({
      success: true,
      notices: rows,
    });
  } catch (error) {
    console.error("Get Notices Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching notices",
    });
  }
};

// Delete notice
export const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, posted_by } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notice id is required",
      });
    }

    const [rows] = await db.query("SELECT * FROM notices WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    const notice = rows[0];

    const normalizedRole = (role || "").toLowerCase();
    const normalizedPostedBy = (posted_by || "").trim().toLowerCase();
    const noticeRole = (notice.role || "").toLowerCase();
    const noticePostedBy = (notice.posted_by || "").trim().toLowerCase();

    let canDelete = false;

    if (normalizedRole === "principal") {
      canDelete = true;
    } else if (normalizedRole === "hod") {
      canDelete = noticeRole === "hod" && normalizedPostedBy === noticePostedBy;
    } else if (
      normalizedRole === "faculty_teacher_guardian" ||
      normalizedRole === "faculty_class_teacher"
    ) {
      canDelete =
        (noticeRole === "faculty_teacher_guardian" ||
          noticeRole === "faculty_class_teacher") &&
        normalizedPostedBy === noticePostedBy;
    }

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this notice",
      });
    }

    await db.query("DELETE FROM notices WHERE id = ?", [id]);

    res.status(200).json({
      success: true,
      message: "Notice deleted successfully",
    });
  } catch (error) {
    console.error("Delete Notice Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting notice",
    });
  }
};         