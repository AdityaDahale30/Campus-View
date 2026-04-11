import { useNavigate } from "react-router-dom";
import "../styles/Mainpage.css";

const Mainpage = () => {
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <>
      {/* ================= HERO ================= */}
      <div id="home" className="hero-wrapper">
        <div className="hero-container">

          {/* 🎥 VIDEO */}
          <video autoPlay loop muted playsInline className="bg-video">
            <source src="/shreeyash2.mp4" type="video/mp4" />
          </video>

          {/* ================= NAVBAR ================= */}
          <nav className="navbar">
            <div className="nav-left">
              <img src="/logo.jpg" alt="Campus Logo" className="nav-logo" />
              <span className="logo-text">Campus View</span>
            </div>

            <div className="nav-links">
              <span onClick={() => scrollToSection("home")}>Home</span>
              <span onClick={() => scrollToSection("features")}>Features</span>
              <span onClick={() => scrollToSection("how")}>How It Works</span>
              <span onClick={() => scrollToSection("about")}>About</span>
            </div>
          </nav>

          {/* ================= HERO CONTENT ================= */}
          <div className="hero-content">
            <div className="left-section">
              <h1>
                <span>Campus View</span>
              </h1>

              <p>
                The Campus View project is an innovative web based system developed
                to digitalize campus communication, academic activities, and
                administrative management within an educational institution.
              </p>

              <div className="buttons">
                <button
                  className="btn-primary"
                  onClick={() => navigate("/login")}
                >
                  Login
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => navigate("/signup")}
                >
                  Sign up
                </button>
              </div>

              <div className="stats">
                <div>
                  <h3>100%</h3>
                  <p>Recognition Accuracy</p>
                </div>

                <div>
                  <h3>24/7</h3>
                  <p>Monitoring</p>
                </div>

                <div>
                  <h3>Role-Based</h3>
                  <p>Access Control</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ================= FEATURES ================= */}
      <div id="features" className="page-container">
        <div className="hero">
          <h1>Core Features</h1>
          <p>Smart features for students, faculty, HOD and Principal</p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">👨‍🎓</div>
            <h2>Student</h2>
            <ul>
              <li>AI face detection</li>
              <li>Leave application</li>
              <li>Timetable access</li>
              <li>Chat with TG</li>
              <li>Violation alerts</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">👨‍🏫</div>
            <h2>Teacher / TG</h2>
            <ul>
              <li>Roaming alerts</li>
              <li>Student monitoring</li>
              <li>Leave approval</li>
              <li>Dashboard view</li>
              <li>Student chat</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🏫</div>
            <h2>HOD</h2>
            <ul>
              <li>Department dashboard</li>
              <li>Faculty approvals</li>
              <li>Repeat offender tracking</li>
              <li>Campus monitoring</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">👨‍💼</div>
            <h2>Principal</h2>
            <ul>
              <li>Full campus overview</li>
              <li>Monitor all departments</li>
              <li>View analytics & reports</li>
              <li>Track discipline system</li>
              <li>Final authority decisions</li>
            </ul>
          </div>
        </div>

        <div className="highlight-box">
          🚀 One platform for monitoring, communication, and control.
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div id="footer-section" className="footer-section">
        <div className="footer-container">
          <div id="important">
            <h3>IMPORTANT LINKS</h3>
            <p>› AICTE</p>
            <p>› Mandatory Disclosure</p>
          </div>

          <div id="quick">
            <h3>QUICK LINKS</h3>
            <p>› MIT ERP</p>
            <p>› Alumni</p>
          </div>

          <div id="contact">
            <h3>CONTACT INFO</h3>
            <p>📍 MIT Aurangabad</p>
            <p>📞 +91-240-2375135</p>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM NAV ================= */}
      <div className="bottom-nav">
        <span onClick={() => scrollToSection("home")}>Home</span>
        <span onClick={() => scrollToSection("important")}>Important</span>
        <span onClick={() => scrollToSection("quick")}>Quick</span>
        <span onClick={() => scrollToSection("contact")}>Contact</span>
      </div>
    </>
  );
};

export default Mainpage;