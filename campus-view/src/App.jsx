import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
  Navigate,
} from "react-router-dom";

// Pages
import Mainpage from "./pages/Mainpage";


// Auth
import Login from "./pages/auth/login";
import Signup from "./pages/auth/Signup";

// Dashboard Layout
import DashboardLayout from "./layout/DashboardLayout";

function DashboardWrapper() {
  const { role } = useParams();

  if (!role) {
    return <Navigate to="/" />;
  }

  return <DashboardLayout role={role} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Mainpage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/dashboard/:role" element={<DashboardWrapper />} />

        <Route path="*" element={<Navigate to="/" />} />

        
      </Routes>
    </BrowserRouter>
  );
}

export default App;