import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../../styles/login.css";
import { showSuccess, showError, showLoading, closeAlert } from "../../utils/alerts";

function Login() {


  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const latestQueryRef = useRef("");
  const searchTimeoutRef = useRef(null);

  const goToSignup = () => {
    navigate("/signup");
  };

  const goToHome = () => {
    navigate("/");
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

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name !== "name") return;

    const trimmedValue = value.trim();

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (trimmedValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      latestQueryRef.current = "";
      return;
    }

    latestQueryRef.current = trimmedValue;

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/search-users?query=${encodeURIComponent(trimmedValue)}`
        );
        const data = await res.json();


        if (latestQueryRef.current === trimmedValue) {
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.log("Search error:", err);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  };

/* ============================================================== NORMALIZATION FUNCTIONS ==================================================== */

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

/* ========================================================================= SUBMIT =========================================================== */

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {


      showLoading("Logging in...");

      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log("🔥 LOGIN RESPONSE:", data);


      closeAlert();

      if (response.ok && data.success) {


        localStorage.setItem("token", data.token);


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


        await showSuccess("Login Successful 🎉", `Welcome ${userData.name}`);


        navigate(`/dashboard/${userData.role}`);

      } else {
        showError("Login Failed", data.message || "Invalid name or password");
      }

    } catch (error) {
      console.error("LOGIN ERROR:", error);


      closeAlert();


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
            <label>Na</label>

            <div className="search-box">
              <input
                type="text"
                name="name"
                placeholder="Enter Name"
                value={formData.name}
                onChange={handleChange}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                required
              />

              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestion-list">
                  {suggestions.map((item, index) => (
                    <div
                      key={`${item.role}-${item.id}-${index}`}
                      className="suggestion-item"
                      onMouseDown={() => {
                        setFormData((prev) => ({
                          ...prev,
                          name: item.name,
                        }));
                        setSuggestions([]);
                        setShowSuggestions(false);
                      }}
                    >
                      {item.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

{/*======================================================================  Role ===============================================================*/}

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

{/*===================================================================== Password ============================================================*/}

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


          <div className="login-options">

            <p className="signup-text">
              Don't have an account?{" "}
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