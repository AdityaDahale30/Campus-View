import { useNavigate } from "react-router-dom";
import "../styles/Mainpage.css";



const Mainpage = () => {
  const navigate = useNavigate();

  // ✅ smooth scroll
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

      {/* ================= HERO WRAPPER (FIX) ================= */}
      <div id="home" className="hero-wrapper">
        <div className="hero-container">

          {/* 🎥 VIDEO */}
          <video autoPlay loop muted playsInline className="bg-video">
            <source src="src/shreeyash2.mp4" type="video/mp4" />
          </video>

          {/* ================= NAVBAR ================= */}
          <nav className="navbar">
            <img src="src/logo.jpg" alt="Campus Logo" />

            <div className="logo">
              <span>hello</span>
            </div>

            <div className="nav-links">
              <span onClick={() => scrollToSection("home")}>Home</span>

              <span onClick={() => scrollToSection("features")}>
                Features
              </span>

              <span onClick={() => scrollToSection("how")}>
                How It Works
              </span>

              <span onClick={() => scrollToSection("about")}>
                About
              </span>
            </div>
          </nav>

          {/* ================= HERO ================= */}
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
                  Sign Up
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

      {/* ================= HOW ================= */}
      <div id="how" className="page-container">

        <h1 className="page-title">How Campus View Works</h1>

        <div className="flow-grid">

          <div className="flow-card">
            <div className="icon">📷</div>
            <h3>Face Detection</h3>
            <p>Student roaming is detected using AI-powered face recognition.</p>
          </div>

          <div className="flow-card">
            <div className="icon">🚨</div>
            <h3>Instant Alert</h3>
            <p>System automatically sends alert to the Teacher Guardian.</p>
          </div>

          <div className="flow-card">
            <div className="icon">👨‍🏫</div>
            <h3>Faculty Action</h3>
            <p>TG verifies the case and informs subject faculty.</p>
          </div>

          <div className="flow-card">
            <div className="icon">🏫</div>
            <h3>Escalation</h3>
            <p>Repeated cases are escalated to the HOD for action.</p>
          </div>

          <div className="flow-card">
            <div className="icon">🧑‍💼</div>
            <h3>Principal Monitoring</h3>
            <p>Principal monitors all activities and reports.</p>
          </div>

        </div>

        <div className="workflow-card">
          <h2>Workflow</h2>

          <div className="timeline">
            <div className="step">Student</div>
            <div className="arrow">→</div>
            <div className="step">TG</div>
            <div className="arrow">→</div>
            <div className="step">Faculty</div>
            <div className="arrow">→</div>
            <div className="step">HOD</div>
            <div className="arrow">→</div>
            <div className="step">Principal</div>
          </div>
        </div>

      </div>

      {/* ================= ABOUT ================= */}
      <div id="about" className="page-container">

        <div className="hero">
          <h1>About Campus View</h1>
          <p>
            A smart system to improve discipline, communication, and automation.
          </p>
        </div>

        <div className="feature-grid">

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h2>Objective</h2>
            <ul>
              <li>Reduce roaming</li>
              <li>Improve communication</li>
              <li>Digital workflows</li>
              <li>Transparency</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h2>Benefits</h2>
            <ul>
              <li>Better discipline</li>
              <li>Less workload</li>
              <li>Faster approvals</li>
              <li>Parent awareness</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💻</div>
            <h2>Technology</h2>
            <p className="tech-text">
              React, Node.js, MySQL, Face Recognition, REST APIs
            </p>
          </div>

        </div>

        <div className="summary-card">
          <h2>Why Campus View?</h2>
          <p>
            A unified system connecting students, faculty, and administration.
          </p>
        </div>

      </div>

      {/* ================= FOOTER SECTION ================= */}
      <div id="footer-section" className="footer-section">
        <div className="footer-container">

          <div id="important">
            <h3>IMPORTANT LINKS</h3>
            <p>› AICTE</p>
            <p>› Mandatory Disclosure</p>
            <p>› AQAR</p>
            <p>› Student Survey</p>
          </div>

          <div id="quick">
            <h3>QUICK LINKS</h3>
            <p>› MIT ERP</p>
            <p>› Anti Ragging</p>
            <p>› Alumni</p>
          </div>

          <div id="contact">
            <h3>CONTACT INFO</h3>
            <p>📍 MIT Aurangabad</p>
            <p>📞 +91-240-2375135</p>
            <p>✉️ admissions@mit.asia</p>
          </div>

        </div>
      </div>
      {/* ================= FOOTER ================= */}
      {/* ================= BOTTOM NAV FOOTER ================= */}
      <div className="bottom-nav">

        <span onClick={() => scrollToSection("home")}>
          Home
        </span>

        <span onClick={() => scrollToSection("important")}>
          Important Links
        </span>

        <span onClick={() => scrollToSection("quick")}>
          Quick Links
        </span>

        <span onClick={() => scrollToSection("contact")}>
          Contact Info
        </span>
      </div>
    </>


  );
};

export default Mainpage;