import { Link, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import "./styles.css";

function Home() {
  const { user } = useAuth();
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">TRAVEL MATE</p>
        <h1>A Smart Traveller Matching Platform for Solo Travellers</h1>
        <p className="lead">Discover compatible travellers through secure profiles and explainable matching.</p>
        <div className="actions">
          <Link className="button" to={user ? "/dashboard" : "/register"}>{user ? "Open dashboard" : "Get started"}</Link>
          {!user && <Link className="button secondary" to="/login">Sign in</Link>}
        </div>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
