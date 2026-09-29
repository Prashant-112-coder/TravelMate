import { Link, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import ExploreTrips from "./pages/ExploreTrips";
import MyTrips from "./pages/MyTrips";\nimport CreateTrip from "./pages/CreateTrip";
import Matches from "./pages/Matches";
import Requests from "./pages/Requests";
import Messages from "./pages/Messages";\nimport TravellerProfile from "./pages/TravellerProfile";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import { useAuth } from "./context/AuthContext";
import "./styles.css";

function Home() {
  const { user } = useAuth();
  return (
    <main className="landing">
      <header className="landing-nav">
        <Link className="landing-brand" to="/"><span className="brand-mark">✦</span> Travel Mate</Link>
        <nav className="landing-links">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#safety">Safety</a>
        </nav>
        <div className="landing-actions">
          <Link className="nav-login" to={user ? "/dashboard" : "/login"}>{user ? "Dashboard" : "Log in"}</Link>
          {!user && <Link className="nav-cta" to="/register">Get started <span>→</span></Link>}
        </div>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <div className="hero-badge"><span>✦</span> SMART TRAVEL COMPANIONS</div>
          <h1>Find your <em>perfect</em><br />travel mate.</h1>
          <p>Meet compatible solo travellers based on where you're going, when you're going, your budget, and how you love to travel.</p>
          <div className="hero-actions">
            <Link className="primary-cta" to={user ? "/dashboard" : "/register"}>{user ? "Open dashboard" : "Find travel mates"} <span>→</span></Link>
            <a className="secondary-cta" href="#how-it-works">See how it works <span>↓</span></a>
          </div>
          <div className="hero-trust"><div className="avatar-stack"><span>TM</span><span>+</span><span>♥</span></div><div><strong>Built for solo travellers</strong><small>Preferences first · Privacy aware</small></div></div>
        </div>
        <div className="hero-stage">
          <div className="hero-image hero-image-main"></div>
          <div className="hero-image-card">
            <div className="hero-card-avatar">✦</div>
            <div><strong>Compatibility</strong><span>Based on your preferences</span></div>
            <b>0–100</b>
          </div>
          <div className="destination-float"><span>01</span><div><small>YOUR NEXT JOURNEY</small><strong>Find people who travel like you.</strong></div></div>
        </div>
      </section>

      <section className="landing-proof">
        <div><strong>One profile.</strong><span> Your travel identity.</span></div>
        <div><strong>One trip.</strong><span> Better compatibility.</span></div>
        <div><strong>One connection.</strong><span> A shared journey.</span></div>
      </section>

      <section className="landing-section" id="how-it-works">
        <div className="section-intro"><span className="section-label">HOW IT WORKS</span><h2>From solo plans to shared journeys.</h2><p>Travel Mate keeps the process simple: tell us how you travel, add your trip, then discover people whose plans and preferences align.</p></div>
        <div className="steps-grid">
          <article><span>01</span><div className="step-icon">◎</div><h3>Create your profile</h3><p>Add your photo, travel style, budget, interests and preferred destinations.</p></article>
          <article><span>02</span><div className="step-icon">⌖</div><h3>Plan a trip</h3><p>Set your destination, dates, budget and the kind of experience you want.</p></article>
          <article><span>03</span><div className="step-icon">♡</div><h3>Discover travellers</h3><p>Explore compatible travellers with transparent compatibility signals.</p></article>
          <article><span>04</span><div className="step-icon">↗</div><h3>Connect safely</h3><p>Send requests, accept connections and use privacy and safety controls.</p></article>
        </div>
      </section>

      <section className="feature-section" id="features">
        <div className="feature-visual"><div className="feature-photo"></div><div className="feature-chip"><span>✦</span><div><strong>Preference-first</strong><small>Not random swiping</small></div></div></div>
        <div className="feature-copy"><span className="section-label">WHY TRAVEL MATE</span><h2>Match on the things that actually shape a trip.</h2><p>Destination and date overlap come first. Then Travel Mate can compare budget, travel style, interests and activities to explain why two travellers may fit.</p><div className="feature-list"><div><b>01</b><span><strong>Smart matching</strong>Hard trip constraints first, preference scoring second.</span></div><div><b>02</b><span><strong>Explainable compatibility</strong>Understand which preferences contributed to a score.</span></div><div><b>03</b><span><strong>Privacy & safety</strong>Discoverability, blocking and reporting are part of the product foundation.</span></div></div></div>
      </section>

      <section className="landing-cta" id="safety">
        <span className="section-label">START YOUR JOURNEY</span>
        <h2>Solo doesn't have to mean alone.</h2>
        <p>Create your travel profile and prepare for your next shared adventure.</p>
        <Link className="primary-cta" to={user ? "/dashboard" : "/register"}>{user ? "Go to dashboard" : "Create your profile"} <span>→</span></Link>
      </section>

      <footer className="landing-footer"><Link className="landing-brand" to="/"><span className="brand-mark">✦</span> Travel Mate</Link><span>A Smart Traveller Matching Platform for Solo Travellers</span><span>© 2026 Travel Mate</span></footer>
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
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/explore" element={<ExploreTrips />} />
          <Route path="/my-trips" element={<MyTrips />} />\n          <Route path="/my-trips/new" element={<CreateTrip />} />\n          <Route path="/traveller/:id" element={<TravellerProfile />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
