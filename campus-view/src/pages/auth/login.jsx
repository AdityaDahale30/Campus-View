import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../../styles/login.css";

// ✅ ADD THIS IMPORT
import { showSuccess, showError, showLoading, closeAlert } from "../../utils/alerts";

function Login() {

  const goToSignup = () => {
  navigate("/signup");   // make sure route exists
};

const goToHome = () => {
  navigate("/");         // your main homepage route
};

  const navigate = useNavigate();

const [formData, setFormData] = useState({
  name: "",
  role: "student",
  password: "",
});

  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {

    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  /* ================= NORMALIZATION FUNCTIONS 🔥 ================= */
  const normalize = (val) =>
    String(val || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  const normalizeYear = (val) => {
    const y = String(val || "").toLowerCase();

    if (y.includes("1")) return "1st";
    if (y.includes("2")) return "2nd";
    if (y.includes("3")) return "3rd";

    return y;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      // ✅ SHOW LOADING POPUP
      showLoading("Logging in...");

      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log("🔥 LOGIN RESPONSE:", data);

      // ✅ CLOSE LOADING
      closeAlert();

      if (response.ok && data.success) {

        // 🔥 STORE TOKEN
        localStorage.setItem("token", data.token);

        // 🔥 NORMALIZED USER OBJECT (VERY IMPORTANT)
        const userData = {
          id: data.user.id,
          name: data.user.name,
          role: data.user.role || formData.role,
          enrollment: data.user.enrollment || "",
          year: normalizeYear(data.user.year),
          department: normalize(data.user.department),
          class: (data.user.class || data.user.batch || ""),
          profile_image: data.user.profile_image || ""
            .toUpperCase()
            .trim()
        };

        localStorage.setItem("user", JSON.stringify(userData));

        console.log("✅ SAVED USER:", userData);

        // ✅ SUCCESS POPUP
        await showSuccess("Login Successful 🎉", `Welcome ${userData.name}`);

        // 🔥 REDIRECT
        navigate(`/dashboard/${userData.role}`);

      } else {
        showError("Login Failed", data.message || "Invalid name or password");
      }

    } catch (error) {
      console.error("LOGIN ERROR:", error);

      // ✅ CLOSE LOADING IF ERROR
      closeAlert();

      // ✅ REPLACE ALERT
      showError("Server Error", "Cannot connect to server ❌");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="title">Campus View</h2>

        <form onSubmit={handleSubmit}>

          {/* Name */}
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

          {/* Role */}
          <div className="input-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="faculty_class_teacher">Faculty + Class Teacher</option>
              <option value="faculty_teacher_guardian">Faculty + Teacher Guardian</option>
              <option value="hod">HOD</option>
              <option value="hod_faculty">HOD + Faculty</option>
              <option value="principal">Principal</option>
            </select>
          </div>

          {/* Password */}
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

        <button type="submit" className="login-btn">
  Login
</button>

{/* 🔥 NEW OPTIONS */}
<div className="login-options">

  <p className="signup-text">
    Don’t have an account?{" "}
    <span onClick={goToSignup} className="link-btn">
      Sign Up
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

export default Login;