import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/signup.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { showSuccess, showError, showLoading, closeAlert } from "../../utils/alerts";


function Signup() {

  const goToLogin = () => {
    navigate("/login");
  };

  const goToHome = () => {
    navigate("/");
  };

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    role: "student",
    year: "",
    department: "",
    batch: "",
    tg_name: "",
    enrollment: "",
    password: "",
    profile_image: null,
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    // ✅ HANDLE IMAGE
    if (name === "profile_image") {
      const file = files[0];

      if (!file) return;

      // ✅ SIZE VALIDATION (2MB MAX)
      if (file.size > 2 * 1024 * 1024) {
        showError("Error", "Image must be less than 2MB");
        return;
      }

      // ✅ FILE TYPE VALIDATION
      if (!file.type.startsWith("image/")) {
        showError("Error", "Only image files allowed");
        return;
      }

      setFormData({
        ...formData,
        profile_image: file,
      });

      return;
    }

    let updatedData = {
      ...formData,
      [name]: value,
    };

    if (
      name === "role" &&
      (value === "hod" || value === "hod_faculty" || value === "principal")
    ) {
      updatedData.year = "";
      updatedData.batch = "";
      updatedData.tg_name = "";
    }

    if (name === "role" && value !== "student") {
      updatedData.enrollment = "";
      updatedData.tg_name = "";
    }

    setFormData(updatedData);
  };

  const validatePassword = (password) => {
  if (password.length < 8 || password.length > 16) {
    return "Password must be 8 to 16 characters long";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least 1 uppercase letter";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least 1 lowercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least 1 number";
  }

  if (!/[@#$%&*!]/.test(password)) {
    return "Password must contain at least 1 special character (@ # $ % & * !)";
  }

  if (/\s/.test(password)) {
    return "Password must not contain spaces";
  }

  const blockedPasswords = [
    "123456",
    "12345678",
    "password",
    "admin",
    "qwerty",
    "welcome",
    "campusview",
  ];

  if (blockedPasswords.includes(password.toLowerCase())) {
    return "This password is too common. Please choose a stronger password";
  }

  return null;
};

const handleRegister = async (e) => {
  e.preventDefault();

  const passwordError = validatePassword(formData.password);

  if (passwordError) {
    showError("Invalid Password", passwordError);
    return;
  }

  try {
    setLoading(true);
    showLoading("Registering...");

    const toBase64 = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

    let imageBase64 = null;

    if (formData.profile_image) {
      imageBase64 = await toBase64(formData.profile_image);
    }

    const response = await fetch("https://campus-view.onrender.com/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...formData,
        profile_image: imageBase64,
      }),
    });

    const data = await response.json();

    if (data.success) {
      closeAlert();
      showSuccess("Registered 🎉", "Registration successful");

      setTimeout(() => {
        navigate("/");
      }, 1000);
    } else {
      closeAlert();
      showError("Failed", data.message || "Registration failed");
    }
  } catch (error) {
    console.error("🔥 Signup Error:", error);
    closeAlert();
    showError("Error", "Something went wrong");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="login-container">
      <div className="login-card signup-card">
        <h2 className="title">Campus View - Signup</h2>

        <form onSubmit={handleRegister} className="signup-form">
          <div className="input-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="faculty_class_teacher">
                Faculty + Class Teacher
              </option>
              <option value="faculty_teacher_guardian">
                Faculty + Teacher Guardian
              </option>
              <option value="hod">HOD</option>
              <option value="hod_faculty">HOD + Faculty</option>
              <option value="principal">Principal</option>
            </select>
          </div>

          {(formData.role === "student" ||
            formData.role === "faculty_class_teacher" ||
            formData.role === "faculty_teacher_guardian") && (
              <div className="input-group">
                <label>Select Year</label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Year</option>
                  <option value="1">First Year</option>
                  <option value="2">Second Year</option>
                  <option value="3">Third Year</option>
                </select>
              </div>
            )}

          {formData.role !== "principal" && (
            <div className="input-group">
              <label>Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="">Select Department</option>
                <option value="computer_engineering">
                  Computer Engineering
                </option>
                <option value="ai_ml">
                  Artificial Intelligence & Machine Learning
                </option>
                <option value="electronics_telecommunication">
                  Electronics & Telecommunication
                </option>
                <option value="electrical_engineering">
                  Electrical Engineering
                </option>
                <option value="civil_engineering">Civil Engineering</option>
                <option value="mechanical_engineering">
                  Mechanical Engineering
                </option>
              </select>
            </div>
          )}

          {(formData.role === "student" ||
            formData.role === "faculty_class_teacher" ||
            formData.role === "faculty_teacher_guardian") && (
              <div className="input-group">
                <label>Batch</label>
                <select
                  name="batch"
                  value={formData.batch}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Batch</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
            )}

          {formData.role === "student" && (
            <div className="input-group">
              <label>Teacher Guardian Name</label>
              <input
                type="text"
                name="tg_name"
                placeholder="Enter TG Name for your batch"
                value={formData.tg_name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {formData.role === "student" && (
            <div className="input-group">
              <label>Enrollment Number</label>
              <input
                type="text"
                name="enrollment"
                placeholder="Enter Enrollment Number"
                value={formData.enrollment}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label>Profile Image</label>
            <input
              type="file"
              name="profile_image"
              accept="image/*"
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>

            <div className="password-box">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              

              <span
                className="eye-icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
       
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>

          {/* 🔥 NEW OPTIONS */}
          <div className="login-options">

            <p className="signup-text">
              Already have an account?{" "}
              <span onClick={goToLogin} className="link-btn">
                Login
              </span>
            </p>

            <p className="home-text">
              <span onClick={goToHome} className="link-btn">
                ← Back to Home
              </span>
            </p>

          </div>
        </form>
      </div>
    </div>
  );
}

export default Signup;