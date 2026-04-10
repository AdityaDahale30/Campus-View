import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { showSuccess, showError, showConfirm, showLoading, closeAlert } from "../utils/alerts";




function ChatbotModule() {
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;

  const senderId = user?.id;
  const senderRole = user?.role;

  const [users, setUsers] = useState([]);
  const [incomingUsers, setIncomingUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [file, setFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const bottomRef = useRef(null);

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  useEffect(() => {
    if (!senderId || !senderRole) return;

    const interval = setInterval(() => {
      axios.post("http://localhost:5000/api/chat/online", {
        userId: senderId,
        role: senderRole,
      });
    }, 5000); // every 5 sec

    return () => clearInterval(interval);
  }, [senderId, senderRole]);

  /* ================= LOAD ALL USERS ================= */
  useEffect(() => {
    if (!senderId || !senderRole) return;

    const loadUsers = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/chat/allowed-users/${senderId}/${senderRole}`
        );
        setUsers(res.data || []);
      } catch (err) {
        console.log(err);
      }
    };

    loadUsers();

    const interval = setInterval(loadUsers, 3000); // refresh every 3 sec

    return () => clearInterval(interval);
  }, [senderId, senderRole]);

  /* ================= LOAD INCOMING ================= */
  useEffect(() => {
    if (!senderId || !senderRole) return;

    const loadIncoming = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/chat/incoming/${senderId}/${senderRole}`
        );
        setIncomingUsers(res.data || []);
      } catch (err) {
        console.log(err);
      }
    };

    loadIncoming();
    const interval = setInterval(loadIncoming, 3000);

    return () => clearInterval(interval);
  }, [senderId, senderRole]);

  /* ================= LOAD UNREAD ================= */
  useEffect(() => {
    if (!senderId || !senderRole) return;

    const loadUnread = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/chat/unread/${senderId}/${senderRole}`
        );

        const counts = {};
        (res.data || []).forEach((msg) => {
          counts[`${msg.sender_id}_${msg.sender_role}`] = msg.unread_count;
        });

        setUnreadCounts(counts);
      } catch (err) {
        console.log(err);
      }
    };

    loadUnread();
    const interval = setInterval(loadUnread, 3000);

    return () => clearInterval(interval);
  }, [senderId, senderRole]);

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    if (!selectedUser || !senderId || !senderRole) return;

    const loadMessages = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/chat/messages/${senderId}/${senderRole}/${selectedUser.id}/${selectedUser.role}`
        );

        setMessages(res.data || []);

        await axios.put(
          `http://localhost:5000/api/chat/seen/${selectedUser.id}/${selectedUser.role}/${senderId}/${senderRole}`
        );

        const unread = await axios.get(
          `http://localhost:5000/api/chat/unread/${senderId}/${senderRole}`
        );

        const counts = {};
        (unread.data || []).forEach((msg) => {
          counts[`${msg.sender_id}_${msg.sender_role}`] = msg.unread_count;
        });

        setUnreadCounts(counts);
      } catch (err) {
        console.log(err);
      }
    };

    loadMessages();
  }, [selectedUser, senderId, senderRole]);

  /* ================= AUTO REFRESH ================= */
  useEffect(() => {
    if (!selectedUser || !senderId || !senderRole) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/chat/messages/${senderId}/${senderRole}/${selectedUser.id}/${selectedUser.role}`
        );

        if (JSON.stringify(res.data) !== JSON.stringify(messages)) {
          setMessages(res.data || []);
        }
      } catch (err) {
        console.log(err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedUser, senderId, senderRole, messages]);

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ================= SEND ================= */
  const sendMessage = async () => {
    if (!selectedUser) return;

    try {
      if (file) {
        const base64 = await toBase64(file);

        let type = "file";
        if (file.type.startsWith("image")) type = "image";
        else if (file.type.startsWith("video")) type = "video";
        else if (file.type.startsWith("audio")) type = "audio";

        await axios.post("http://localhost:5000/api/chat/send-file", {
          sender_id: senderId,
          sender_role: senderRole,
          receiver_id: selectedUser.id,
          receiver_role: selectedUser.role,
          file: base64,
          file_name: file.name,
          file_type: type,
        });

        setFile(null);
      } else if (text.trim()) {
        await axios.post(`http://localhost:5000/api/chat/send`, {
          sender_id: senderId,
          sender_role: senderRole,
          receiver_id: selectedUser.id,
          receiver_role: selectedUser.role,
          message: text.trim(),
        });

        setText("");
      }

      const res = await axios.get(
        `http://localhost:5000/api/chat/messages/${senderId}/${senderRole}/${selectedUser.id}/${selectedUser.role}`
      );

      setMessages(res.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  /* ================= FILTER USERS ================= */
  const filteredUsers = search.trim()
    ? users.filter(
      (u) =>
        !(u.id === senderId && u.role === senderRole) &&
        (
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.role.toLowerCase().includes(search.toLowerCase())
        )
    )
    : incomingUsers.filter(
      (u) => unreadCounts[`${u.id}_${u.role}`] > 0
    );

  /* ================= DELETE ================= */
  const deleteMessage = async (id) => {

    // ✅ CONFIRM POPUP
    const result = await showConfirm(
      "Delete Message?",
      "This message will be permanently deleted"
    );

    if (!result.isConfirmed) return;

    try {
      // ✅ LOADING
      showLoading("Deleting...");

      await axios.delete(`http://localhost:5000/api/chat/delete/${id}`);

      closeAlert();

      // ✅ SUCCESS
      showSuccess("Deleted", "Message deleted successfully");

      setMessages(messages.filter((msg) => msg.id !== id));

    } catch (err) {
      closeAlert();

      // ✅ ERROR
      showError("Error", "Failed to delete message");

      console.log(err);
    }
  };
  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <h3>Contacts</h3>

        <div className="chat-search">
          <input
            type="text"
            placeholder="Search contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredUsers.length === 0 && (
          <p className="no-contact">
            {search.trim() ? "No contact found" : "No new notifications"}
          </p>
        )}

        {filteredUsers.map((u) => (
          <div
            key={`${u.id}_${u.role}`}
            className={`contact ${selectedUser?.id === u.id ? "active" : ""}`}
            onClick={() => setSelectedUser(u)}
          >
            <div className="contact-avatar-wrapper">
              <div className="contact-avatar">
                {u.profile_image ? (
                  <img src={u.profile_image} alt="user" />
                ) : (
                  u.name.charAt(0).toUpperCase()
                )}
              </div>

              {u.online && <span className="online-dot"></span>}
            </div>

            <div className="contact-info">
              <div className="contact-name">
                {u.name}

                {unreadCounts[`${u.id}_${u.role}`] > 0 && (
                  <span className="unread-badge">
                    {unreadCounts[`${u.id}_${u.role}`]}
                  </span>
                )}
              </div>

              <div className="contact-role">{u.role}</div>
            </div>
          </div>
        ))}
      </div>

      {selectedUser ? (
        <div className="chat-main">
          <div className="chat-header">
            <div className="chat-header-avatar-wrapper">
              <div className="chat-header-avatar">
                {selectedUser.profile_image ? (
                  <img src={selectedUser.profile_image} alt="user" />
                ) : (
                  selectedUser.name.charAt(0).toUpperCase()
                )}
              </div>

              {selectedUser.online && <span className="online-dot"></span>}
            </div>

            <div>
              <div>{selectedUser.name}</div>

              <div className="status-text">
                {selectedUser.online ? "Online" : "Offline"}
              </div>
            </div>
          </div>

          {/* ✅ CHAT MESSAGES */}
          <div className="chat-messages whatsapp-bg">
            {messages.map((msg, index) => {
              const currentDate = new Date(msg.created_at).toDateString();
              const prevDate =
                index > 0
                  ? new Date(messages[index - 1].created_at).toDateString()
                  : null;

              const showDate = currentDate !== prevDate;

              return (
                <>
                  {/* DATE */}
                  {showDate && (
                    <div className="date-separator">
                      {new Date(msg.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  )}

                  {/* MESSAGE */}
                  <div
                    key={msg.id}
                    className={`message ${String(msg.sender_id) === String(senderId)
                      ? "sent"
                      : "received"
                      }`}
                  >
                    <div className="file-message">
                      {msg.file_type === "image" && (
                        <img src={msg.file_url} style={{ width: "200px" }} />
                      )}

                      {msg.file_type === "video" && (
                        <video src={msg.file_url} controls width="200" />
                      )}

                      {msg.file_type === "audio" && (
                        <audio src={msg.file_url} controls />
                      )}

                      {msg.file_type === "file" && (
                        <div className="file-card">

                          {/* ICON + NAME */}
                          <div className="file-top">
                            <div className="file-icon">
                              {msg.file_url.includes(".pdf") ? "📕" :
                                msg.file_url.includes(".doc") ? "📘" :
                                  msg.file_url.includes(".xls") ? "📗" : "📄"}
                            </div>
                            <div>
                              <div className="file-name">
                                {decodeURIComponent(msg.file_url.split("/").pop())}
                              </div>
                              <div className="file-type">
                                FILE
                              </div>
                            </div>
                          </div>

                          {/* ACTIONS */}
                          <div className="file-actions">
                            <a href={msg.file_url} target="_blank">Open</a>
                            <a href={msg.file_url} download>Save as...</a>
                          </div>

                        </div>
                      )}
                    </div>

                    {msg.message && <div>{msg.message}</div>}

                    <div className="message-meta">
                      <span className="message-time">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
  {/* DELETE BUTTON */}
  {String(msg.sender_id) === String(senderId) && (
    <div
      className="delete-btn"
      onClick={() => deleteMessage(msg.id)}
    >
      🗑
    </div>
  )}
                  </div>
                  
                </>
              );
            })}

            <div ref={bottomRef}></div>
          </div>

          {file && (
            <div className="file-preview-overlay">
              <div className="file-preview-box">

                {/* CLOSE BUTTON */}
                <button
                  className="close-preview"
                  onClick={() => {
                    setFile(null);
                    setPreviewFile(null);
                  }}
                >
                  ✕
                </button>

                {/* PREVIEW */}
                {file.type.startsWith("image") && (
                  <img src={previewFile} className="preview-img" />
                )}

                {file.type.startsWith("video") && (
                  <video src={previewFile} controls className="preview-video" />
                )}

                {!file.type.startsWith("image") &&
                  !file.type.startsWith("video") && (
                    <div className="preview-file">
                      📄 {file.name}
                    </div>
                  )}

                {/* SEND BUTTON */}
                <button className="preview-send-btn" onClick={sendMessage}>
                  Send
                </button>
              </div>
            </div>
          )}
          {/* ✅ INPUT */}
          <div className="chat-input">
            <div className="input-box">

              {/* 📎 FILE BUTTON */}
              <label className="file-btn">
                📎
                <input
                  type="file"
                  onChange={(e) => {
                    const selected = e.target.files[0];
                    setFile(selected);
                    setPreviewFile(URL.createObjectURL(selected));
                  }}
                  hidden
                />
              </label>

              {/* TEXT INPUT */}
              <input
                type="text"
                placeholder="Type message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />

            </div>

            {/* SEND BUTTON */}
            <button className="send-btn" onClick={sendMessage}>
              ➤
            </button>
          </div>
        </div>
      ) : (
        <div className="no-chat">Select Contact To Start Chat 🚀</div>
      )}
    </div>
  );
}

export default ChatbotModule;