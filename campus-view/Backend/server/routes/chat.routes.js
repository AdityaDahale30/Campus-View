import express from "express";
import db from "../db.js";

import fs from "fs";
import path from "path";

const router = express.Router();
const onlineUsers = new Map(); 


/* ================= COMMON HELPERS ================= */
async function getUserByIdAndRole(userId, role) {
  const normalizedRole = String(role || "").trim().toLowerCase();

  if (normalizedRole === "student") {
    const [rows] = await db.query(
      "SELECT id, name, 'student' AS role, department, profile_image FROM students WHERE id = ?",
      [userId]
    );
    return rows[0] || null;
  }

  if (["faculty", "faculty_class_teacher", "faculty_teacher_guardian"].includes(normalizedRole)) {
    const [rows] = await db.query(
     "SELECT id, name, role, department, profile_image FROM faculty WHERE id = ?",
      [userId]
    );
    return rows[0] || null;
  }

  if (normalizedRole === "hod") {
    const [rows] = await db.query(
    "SELECT id, name, 'hod' AS role, department, NULL AS profile_image FROM hods WHERE id = ?",
      [userId]
    );
    return rows[0] || null;
  }

  if (normalizedRole === "principal") {
    const [rows] = await db.query(
     "SELECT id, name, 'principal' AS role, NULL AS department, NULL AS profile_image FROM principals WHERE id = ?",
      [userId]
    );
    return rows[0] || null;
  }

  return null;
}
/*========================================================================================================================*/
function getOnlineStatus(userId, role) {
  const key = `${userId}_${role}`;
  const lastSeen = onlineUsers.get(key);
  

  if (!lastSeen) return { online: false, last_seen: null };

  const diff = Date.now() - lastSeen;

  if (diff < 10000) { // 10 sec active
    return { online: true, last_seen: null };
  }

  return { online: false, last_seen: lastSeen };
}

function isFacultyRole(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  return [
    "faculty",
    "faculty_class_teacher",
    "faculty_teacher_guardian",
  ].includes(normalizedRole);
}

function canUsersChat(user1, user2) {

  console.log("CHECK:", user1.name, user1.department, " <-> ", user2.name, user2.department);

  if (!user1 || !user2) return false;

  const role1 = String(user1.role || "").trim().toLowerCase();
  const role2 = String(user2.role || "").trim().toLowerCase();

  const dept1 = String(user1.department || "").trim().toLowerCase();
  const dept2 = String(user2.department || "").trim().toLowerCase();

  if (role1 === "principal" || role2 === "principal") {
    return false;
  }

if (
  dept1.replaceAll(" ", "_") !== dept2.replaceAll(" ", "_")
) {
  return false;
}

  if (role1 === "student") {
    return isFacultyRole(role2) || role2 === "hod";
  }

  if (isFacultyRole(role1)) {
    return role2 === "student" || role2 === "hod";
  }

  if (role1 === "hod") {
    return role2 === "student" || isFacultyRole(role2);
  }

  return false;
}

/* =============================================== GET CONTACTS =================================================================== */
router.get("/allowed-users/:userId/:role", async (req, res) => {
  try {

    // ✅ FIRST extract params
    const { userId, role } = req.params;

    // ✅ THEN use them
    const user = await getUserByIdAndRole(userId, role);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const department = String(user.department || "")
      .trim()
      .toLowerCase();

    let rows = [];

   if (user.role === "student") {
  [rows] = await db.query(
    `
   SELECT id, name, role, department, profile_image FROM faculty
    WHERE LOWER(department) = ?
    AND role IN ('faculty', 'faculty_class_teacher', 'faculty_teacher_guardian')

    UNION ALL

   SELECT id, name, 'hod' AS role, department, NULL AS profile_image FROM hods
    WHERE LOWER(department) = ?
    `,
    [department, department]
  );
}

    else if (user.role === "hod") {
      [rows] = await db.query(
        `
       SELECT id, name, role, department, profile_image FROM students
        WHERE LOWER(department) = ?

        UNION ALL

      SELECT id, name, role, department, profile_image FROM faculty
        WHERE LOWER(department) = ?
        AND role IN ('faculty', 'faculty_class_teacher', 'faculty_teacher_guardian')
        `,
        [department, department]
      );
    }

else if (isFacultyRole(user.role)) {
  [rows] = await db.query(
    `
   SELECT id, name, role, department, profile_image FROM students
    WHERE LOWER(department) = ?

    UNION ALL

   SELECT id, name, role, department, NULL AS profile_image FROM hods
    WHERE LOWER(department) = ?
    `,
    [department, department]
  );
}

// REMOVE SELF 

rows = rows.filter(u => ! (u.id == userId && u.role === user.role));

const updatedRows = rows.map((u) => {
  const status = getOnlineStatus(u.id, u.role);

  return {
    ...u,
    profile_image: u.profile_image
      ? `http://localhost:5000/uploads/${u.profile_image}`
      : null,
    online: status.online,
    last_seen: status.last_seen,
  };
});

res.json(updatedRows);

  }
  catch(error){
    console.log("🔥 FULL ERROR:", error);
res.status(500).json({ error : error.message});
  }
});

/* ================================================== SEND MESSAGE ================================================================ */

router.post("/send", async (req, res) => {
  const { sender_id, sender_role, receiver_id, receiver_role, message } = req.body;

  try {
    if (!sender_id || !sender_role || !receiver_id || !receiver_role || !message?.trim()) {
      return res.status(400).json({
        message: "sender_id, sender_role, receiver_id, receiver_role and message are required",
      });
    }

    const sender = await getUserByIdAndRole(sender_id, sender_role);
    const receiver = await getUserByIdAndRole(receiver_id, receiver_role);

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Sender or receiver not found" });
    }

    const allowed = canUsersChat(sender, receiver) && canUsersChat(receiver, sender);

    if (!allowed) {
      return res.status(403).json({
        message: "You are not allowed to chat with this user",
      });
    }

    const [result] = await db.query(
      `INSERT INTO messages
       (sender_id, sender_role, receiver_id, receiver_role, message, seen)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [sender_id, sender_role, receiver_id, receiver_role, message.trim()]
    );

    const [newMessage] = await db.query(
      `SELECT * FROM messages WHERE id = ?`,
      [result.insertId]
    );

    res.json(newMessage[0]);
  } catch (err) {
    console.log("Send Message Error:", err);
    res.status(500).json({ message: "Message send failed" });
  }
});

/* ================= GET MESSAGES ================= */

router.get("/messages/:senderId/:senderRole/:receiverId/:receiverRole", async (req, res) => {
  const { senderId, senderRole, receiverId, receiverRole } = req.params;

  try {
    const sender = await getUserByIdAndRole(senderId, senderRole);
    const receiver = await getUserByIdAndRole(receiverId, receiverRole);

    if (!sender || !receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    const allowed = canUsersChat(sender, receiver) && canUsersChat(receiver, sender);

    if (!allowed) {
      return res.status(403).json({
        message: "You are not allowed to view these messages",
      });
    }

    const [messages] = await db.query(
      `SELECT * FROM messages
       WHERE (
         sender_id = ? AND sender_role = ? AND receiver_id = ? AND receiver_role = ?
       )
       OR (
         sender_id = ? AND sender_role = ? AND receiver_id = ? AND receiver_role = ?
       )
       ORDER BY created_at ASC`,
      [
        senderId, senderRole, receiverId, receiverRole,
        receiverId, receiverRole, senderId, senderRole
      ]
    );

    res.json(messages);
  } catch (err) {
    console.log("Message Fetch Error:", err);
    res.status(500).json({ message: "Message fetch failed" });
  }
});

/* ================= DELETE MESSAGE ================= */

router.delete("/delete/:id", async (req, res) => {
  const messageId = req.params.id;

  try {
    await db.query("DELETE FROM messages WHERE id = ?", [messageId]);
    res.json({ message: "Message deleted" });
  } catch (err) {
    console.log("Delete Message Error:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

/* ================= SEEN ================= */

router.put("/seen/:senderId/:senderRole/:receiverId/:receiverRole", async (req, res) => {
  const { senderId, senderRole, receiverId, receiverRole } = req.params;

  try {
    const sender = await getUserByIdAndRole(senderId, senderRole);
    const receiver = await getUserByIdAndRole(receiverId, receiverRole);

    if (!sender || !receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    const allowed = canUsersChat(sender, receiver) && canUsersChat(receiver, sender);

    if (!allowed) {
      return res.status(403).json({
        message: "You are not allowed to update these messages",
      });
    }

    await db.query(
      `UPDATE messages
       SET seen = 1
       WHERE sender_id = ? AND sender_role = ? AND receiver_id = ? AND receiver_role = ? AND seen = 0`,
      [senderId, senderRole, receiverId, receiverRole]
    );

    res.json({ success: true });
  } catch (err) {
    console.log("Seen Update Error:", err);
    res.status(500).json({ message: "Seen update failed" });
  }
});

/* ================= GET UNREAD MESSAGE COUNT ================= */

router.get("/unread/:userId/:role", async (req, res) => {
  const { userId, role } = req.params;

  try {
    const currentUser = await getUserByIdAndRole(userId, role);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const [rows] = await db.query(
      `
      SELECT sender_id, sender_role, COUNT(*) AS unread_count
      FROM messages
      WHERE receiver_id = ?
        AND receiver_role = ?
        AND seen = 0
        AND NOT (sender_id = ? AND sender_role = ?)
      GROUP BY sender_id, sender_role
      `,
      [userId, role, userId, role]
    );

    res.json(rows);
  } catch (err) {
    console.log("Unread Fetch Error:", err);
    res.status(500).json({ message: "Unread fetch failed" });
  }
});

/* ================= USERS WHO SENT UNREAD MESSAGE ================= */

router.get("/incoming/:userId/:role", async (req, res) => {
  const { userId, role } = req.params;

  try {
    const currentUser = await getUserByIdAndRole(userId, role);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const [rows] = await db.query(
      `
      SELECT DISTINCT sender_id, sender_role
      FROM messages
      WHERE receiver_id = ?
        AND receiver_role = ?
        AND seen = 0
        AND NOT (sender_id = ? AND sender_role = ?)
      `,
      [userId, role, userId, role]
    );

    const result = [];

    for (const row of rows) {
      const sender = await getUserByIdAndRole(row.sender_id, row.sender_role);

      if (
        sender &&
        canUsersChat(currentUser, sender) &&
        canUsersChat(sender, currentUser)
      ) {
     const status = getOnlineStatus(sender.id, sender.role);

result.push({
  ...sender,
  profile_image: sender.profile_image
    ? `http://localhost:5000/uploads/${sender.profile_image}`
    : null,
  online: status.online,
  last_seen: status.last_seen,
});
      }
    }

    res.json(result);
  } catch (err) {
    console.log("Incoming Contacts Fetch Error:", err);
    res.status(500).json({ message: "Incoming contacts fetch failed" });
  }
});

router.post("/online", (req, res) => {
  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ message: "userId and role required" });
  }

  const key = `${userId}_${role}`;

  onlineUsers.set(key, Date.now());

  res.json({ success: true });
});

router.post("/send-file", async (req, res) => {
  const { sender_id, sender_role, receiver_id, receiver_role, file, file_name, file_type } = req.body;

  try {
    if (!file) {
      return res.status(400).json({ message: "No file provided" });
    }

    // 🔥 REMOVE base64 prefix
    const base64Data = file.replace(/^data:.+;base64,/, "");

    const fileName = Date.now() + "_" + file_name;
    const filePath = `uploads/chat/${fileName}`;

    // 🔥 SAVE FILE
    fs.writeFileSync(filePath, base64Data, "base64");

    const fileUrl = `http://localhost:5000/uploads/chat/${fileName}`;

    const [result] = await db.query(
      `INSERT INTO messages 
      (sender_id, sender_role, receiver_id, receiver_role, message, file_url, file_type, seen)
      VALUES (?, ?, ?, ?, '', ?, ?, 0)`,
      [sender_id, sender_role, receiver_id, receiver_role, fileUrl, file_type]
    );

    const [newMsg] = await db.query(
      `SELECT * FROM messages WHERE id = ?`,
      [result.insertId]
    );

    res.json(newMsg[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "File send failed" });
  }
});

export default router;