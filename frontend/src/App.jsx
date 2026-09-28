import { Link, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import "./styles.css";

function Home() {
  const { user } = useAuth();
  return (
    <main className="public-home">
      <header className="public-nav">
        <Link className="brand" to="/">Travel Mate<span>✦</span></Link>
        <nav>
          <Link to="/#discover">Explore</Link>
          <Link to="/#how-it-works">How it works</Link>
          <Link to="/#safety">Safety</Link>
        </nav>
        <div className="nav-actions">
          <Link className="button button-light" to={user ? "/dashboard" : "/login"}>{user ? "Dashboard" : "Log in"}</Link>
          {!user && <Link className="button" to="/register">Get started</Link>}
        </div>
      </header>
      <section className="home-hero">
        <div className="home-copy">
          <p className="eyebrow">TRAVEL MATE · SOLO TRAVEL, TOGETHER</p>
          <h1>Find your <span>travel companions.</span></h1>
          <p className="lead">Meet like-minded travellers, plan trips together, and discover compatible people through transparent matching.</p>
          <div className="actions">
            <Link className="button" to={user ? "/dashboard" : "/register"}>{user ? "Open dashboard" : "Start exploring"}</Link>
            <Link className="text-link" to="/login">I already have an account →</Link>
          </div>
          <div className="home-stats">
            <div><strong>01</strong><span>Build your profile</span></div>
            <div><strong>02</strong><span>Create a trip</span></div>
            <div><strong>03</strong><span>Meet compatible travellers</span></div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-photo"><div className="hero-overlay"></div><div className="floating-card"><span>✦</span><div><strong>Compatibility</strong><small>Built around your preferences</small></div></div></div>
        </div>
      </section>
      <section className="feature-strip" id="how-it-works">
        <div><span>01</span><strong>Profile first</strong><p>Tell people how you like to travel.</p></div>
        <div><span>02</span><strong>Smart matching</strong><p>Compare destinations, dates and preferences.</p></div>
        <div><span>03</span><strong>Travel safely</strong><p>Privacy controls, reporting and blocking.</p></div>
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
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
