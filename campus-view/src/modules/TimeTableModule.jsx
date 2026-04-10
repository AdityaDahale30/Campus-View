import { useState, useEffect } from "react";
import { showSuccess, showError, showConfirm, showLoading, closeAlert } from "../utils/alerts";

function TimeTableModule({ role, userClass, userYear, userDepartment }) {
const [year, setYear] = useState("3rd");
const [department, setDepartment] = useState("computer_engineering");
const [className, setClassName] = useState("A");

const userData = localStorage.getItem("user");
const user = userData ? JSON.parse(userData) : null;

  const [editingLecture, setEditingLecture] = useState(null);
  const [newSubject, setNewSubject] = useState("");
  const [newTeacher, setNewTeacher] = useState("");

  const [timetableData, setTimetableData] = useState([]);

  const today = new Date().toLocaleString("en-US", { weekday: "long" });

  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  const timeSlots = [
    "8:30-9:30",
    "9:30-10:30",
    "10:30-11:15",
    "11:15-12:15",
    "12:15-1:15",
    "1:15-1:30",
    "1:30-2:30",
    "2:30-3:30"
  ];

  const mergedMap = {
    "8:30-10:30": ["8:30-9:30", "9:30-10:30"],
    "11:15-1:15": ["11:15-12:15", "12:15-1:15"],
    "1:30-3:30": ["1:30-2:30", "2:30-3:30"]
  };

  /* ========================================== NORMALIZATION (🔥 FIX) ================================================================ */
  const normalize = (val) =>
    String(val || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  const normalizeYear = (val) => {
    const y = String(val || "").toLowerCase();

    if (["1", "1st", "fy"].includes(y)) return "1st";
    if (["2", "2nd", "sy"].includes(y)) return "2nd";
    if (["3", "3rd", "ty"].includes(y)) return "3rd";

    return y;
  };

/* =================================================== EDIT =========================================================================== */
  const startEditing = (lecture) => {
    if (
      role !== "hod" &&
      role !== "faculty_class_teacher" &&
      role !== "faculty_teacher_guardian"
    ) return;

    setEditingLecture(lecture);
    setNewSubject(lecture.subject);
    setNewTeacher(lecture.teacher);
  };

const updateLecture = async () => {
  const result = await showConfirm(
    "Update Lecture?",
    "Are you sure you want to update this lecture?"
  );

  if (!result.isConfirmed) return;

  try {
    showLoading("Updating lecture...");

    await fetch(`http://localhost:5000/api/timetable/update/${editingLecture.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: newSubject, teacher: newTeacher })
    });

    closeAlert();

    showSuccess("Updated ✅", "Lecture updated successfully");

    fetchTimetable();
    setEditingLecture(null);

  } catch (err) {
    closeAlert();
    showError("Error", "Failed to update lecture");
  }
};

const undoLecture = async (id) => {
  const result = await showConfirm(
    "Undo Changes?",
    "Revert this lecture to original?"
  );

  if (!result.isConfirmed) return;

  try {
    showLoading("Reverting...");

    await fetch(`http://localhost:5000/api/timetable/undo/${id}`, {
      method: "PUT"
    });

    closeAlert();

    showSuccess("Reverted", "Lecture restored successfully");

    fetchTimetable();

  } catch (err) {
    closeAlert();
    showError("Error", "Failed to undo changes");
  }
};

/* =================================================== FETCH ========================================================================== */
  const fetchTimetable = () => {
    fetch("http://localhost:5000/api/timetable")
      .then((res) => res.json())
      .then((data) => {

        console.log("🔥 USER:", userDepartment, userYear, userClass);
        console.log("🔥 RAW DATA:", data);

        let filtered = data;

     if (
  role === "student" ||
  role === "faculty_class_teacher" ||
  role === "faculty_teacher_guardian"
) {
  filtered = data.filter((item) => {
    const depMatch =
      normalize(item.department) === normalize(userDepartment);

    const yearMatch =
      normalizeYear(item.year) === normalizeYear(userYear);

    const classMatch =
      String(item.className).toUpperCase() ===
        String(userClass).toUpperCase() ||
      String(item.className).toUpperCase().includes(
        String(userClass).toUpperCase()
      );

    return depMatch && yearMatch && classMatch;
  });
}

       if (role === "hod") {
  filtered = data.filter((item) => {
    const depMatch =
      normalize(item.department) === normalize(userDepartment);

    const yearMatch =
      year === "" || normalizeYear(item.year) === normalizeYear(year);

    const classMatch =
      className === "" ||
      String(item.className).toUpperCase() === String(className).toUpperCase();

    return depMatch && yearMatch && classMatch;
  });
}

        if (role === "principal") {
          filtered = data.filter((item) =>
            normalize(item.department) === normalize(department) &&
            (year === "" || normalizeYear(item.year) === normalizeYear(year))
          );
        }

        console.log("✅ FILTERED:", filtered);

        setTimetableData(filtered);
      })
      .catch((err) => console.log("FETCH ERROR:", err));
  };

  useEffect(() => {
    fetchTimetable();
  }, [role, year, className, department, userClass, userYear, userDepartment]);

/* =================================================== HELPERS ======================================================================== */
  const isRecessSlot = (time) =>
    time === "10:30-11:15" || time === "1:15-1:30";

  const findLectureForSlot = (day, slot) => {
    return timetableData.find((item) => {
      if (item.day !== day) return false;
      if (item.time === slot) return true;

      const mergedSlots = mergedMap[item.time];
      return mergedSlots?.includes(slot);
    });
  };

  const isMergedLecture = (lecture) => lecture && mergedMap[lecture.time];

  const isStartOfMergedLecture = (lecture, slot) =>
    lecture && mergedMap[lecture.time]?.[0] === slot;

  const shouldSkipCell = (day, slot) => {
    return timetableData.some((item) => {
      if (item.day !== day) return false;
      const mergedSlots = mergedMap[item.time];
      return mergedSlots?.[1] === slot;
    });
  };

  const getColSpan = (lecture, slot) => {
    if (isMergedLecture(lecture) && isStartOfMergedLecture(lecture, slot)) {
      return 2;
    }
    return 1;
  };

  /*===================================================================================================================================*/
const markLecture = async (status, lecture) => {
  try {
    console.log("CLICKED:", status, lecture);

    const res = await fetch("http://localhost:5000/api/timetable/mark", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timetable_id: lecture.id,
        faculty_id: user?.id,
      faculty_name: String(lecture.teacher || "").split("/")[0].trim(),
        department: lecture.department,
        year: lecture.year,
        class_name: lecture.className,
        subject: lecture.subject,
        lecture_date: new Date().toISOString().split("T")[0],
        day_name: lecture.day,
        lecture_number: lecture.id,
        time_slot: lecture.time,
        status,
        marked_by: user?.id,
      }),
    });

    const data = await res.json();
    console.log("RESPONSE:", data); // 🔥 IMPORTANT

if (data.success) {
  showSuccess("Marked ✅", "Lecture marked successfully");
} else {
  showError("Already Marked", data.message);
}

  } catch (err) {
console.log("ERROR:", err);
showError("Error", "Failed to mark lecture");
  }
};
/* ===================================================== UI ===========================================================================*/
  return (
    <div className="module-container">
      <h2>Time Table</h2>
      {role === "hod" && (
  <div className="timetable-filters">
    <select value={year} onChange={(e) => setYear(e.target.value)}>
      <option value="">Select Year</option>
      <option value="1st">1st</option>
      <option value="2nd">2nd</option>
      <option value="3rd">3rd</option>
    </select>

    <select value={className} onChange={(e) => setClassName(e.target.value)}>
      <option value="">Select Division</option>
      <option value="A">A</option>
      <option value="B">B</option>
     
    </select>
  </div>
)}

      <table className="timetable-grid">
        <thead>
          <tr>
            <th>DAY / TIME</th>
            {timeSlots.map((t) => <th key={t}>{t}</th>)}
          </tr>
        </thead>

        <tbody>
          {days.map((day, rowIndex) => (
            <tr key={day} className={day === today ? "today-row" : ""}>
              <td className="day-column">{day}</td>

              {timeSlots.map((time) => {
                if (isRecessSlot(time)) {
                  if (rowIndex === 0) {
                    return (
                      <td key={time} rowSpan={6}>
                        <div className="recess-vertical">
                          {"RECESS".split("").map((l, i) => <span key={i}>{l}</span>)}
                        </div>
                      </td>
                    );
                  }
                  return null;
                }

                if (shouldSkipCell(day, time)) return null;

                const lecture = findLectureForSlot(day, time);
                const colSpan = getColSpan(lecture, time);

                return (
                  <td key={time} colSpan={colSpan}>
                    {lecture && (
                      <div className={lecture.isEdited ? "edited-cell" : ""}>
                       <div>
  <div>{lecture.subject}</div>
  <div>{lecture.teacher}</div>

  {/* ✅ ADD HERE */}
  {(role === "faculty_class_teacher" ||
    role === "faculty_teacher_guardian" ||
    role === "hod") && (
    <div style={{ marginTop: "5px"}}>
      <button onClick={() => markLecture("taken", lecture)}>Taken</button>
      <button onClick={() => markLecture("leave", lecture)}>Leave</button>
      <button onClick={() => markLecture("off", lecture)}>Off</button>
    </div>
  )}

  {(role !== "student") && (
    <button onClick={() => startEditing(lecture)}>Edit</button>
  )}
</div>


                        {lecture.isEdited === 1 && (
                          <>
                            <div>Updated</div>
                            {(role !== "student") && (
                              <button onClick={() => undoLecture(lecture.id)}>Undo</button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {editingLecture && (
        <div className="edit-popup">
          <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
          <input value={newTeacher} onChange={(e) => setNewTeacher(e.target.value)} />

          <button onClick={updateLecture}>Update</button>
          <button onClick={() => setEditingLecture(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default TimeTableModule;