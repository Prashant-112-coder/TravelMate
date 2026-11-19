import { Link, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import ExploreTrips from "./pages/ExploreTrips";
import MyTrips from "./pages/MyTrips";
import CreateTrip from "./pages/CreateTrip";
import Matches from "./pages/Matches";
import Requests from "./pages/Requests";
import Messages from "./pages/Messages";
import TravellerProfile from "./pages/TravellerProfile";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import { useAuth } from "./context/AuthContext";
import "./styles.css";
import "./landing-motion.css";

function Home() {
  const { user } = useAuth();
  const startHref = user ? "/dashboard" : "/register";

  return (
    <div className="landing">
      <header className="landing-nav">
        <Link className="landing-brand" to="/">
          <span className="brand-mark">✦</span> Travel Mate
        </Link>
        <nav className="landing-links" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#why-travel-mate">Why Travel Mate</a>
          <a href="#safety">Travel safely</a>
        </nav>
        <div className="landing-actions">
          <Link className="nav-login" to={user ? "/dashboard" : "/login"}>
            {user ? "Dashboard" : "Log in"}
          </Link>
          <Link className="nav-cta" to={startHref}>
            {user ? "Open workspace" : "Get started"} <span>↗</span>
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-copy motion-reveal">
            <div className="hero-badge"><span>✦</span> A BETTER WAY TO TRAVEL TOGETHER</div>
            <h1>Good trips are<br />better <em>shared.</em></h1>
            <p>
              Meet people who travel like you. Discover compatible travellers
              through shared destinations, dates, budgets and the little things
              that make a journey yours.
            </p>
            <div className="hero-actions">
              <Link className="primary-cta" to={startHref}>
                Find your travel mate <span>↗</span>
              </Link>
              <a className="secondary-cta" href="#how-it-works">
                Explore how it works <span>↓</span>
              </a>
            </div>
            <div className="hero-trust">
              <div className="avatar-stack" aria-hidden="true">
                <span>R</span><span>A</span><span>M</span><span>+</span>
              </div>
              <div><strong>Your next story starts with a connection.</strong><small>Thoughtful matches. Shared adventures.</small></div>
            </div>
          </div>

          <div className="hero-stage motion-reveal motion-delay">
            <div className="hero-image hero-image-main" role="img" aria-label="Mountain landscape at golden hour" />
            <div className="hero-image-card">
              <span className="hero-card-avatar">✦</span>
              <div><strong>A journey worth sharing</strong><span>Find people headed your way</span></div>
              <b>↗</b>
            </div>
            <div className="destination-float">
              <span>01</span>
              <div><small>YOUR NEXT DESTINATION</small><strong>Somewhere unforgettable</strong></div>
            </div>
          </div>
        </section>

        <section className="landing-proof" aria-label="Platform highlights">
          <div><strong>Shared destinations</strong><br />Start with where you want to go</div>
          <div><strong>Meaningful compatibility</strong><br />More than just matching dates</div>
          <div><strong>Connections with control</strong><br />Choose when to connect</div>
        </section>

        <section id="how-it-works" className="landing-section">
          <div className="section-intro motion-reveal">
            <span className="section-label">THE JOURNEY, SIMPLIFIED</span>
            <h2>Four little steps.<br /><em>A whole new way to travel.</em></h2>
            <p>From the first idea to the people you meet along the way, Travel Mate keeps the experience simple and intentional.</p>
          </div>
          <div className="steps-grid">
            <article className="motion-reveal"><span>01 / PROFILE</span><div className="step-icon">◎</div><h3>Show us your style</h3><p>Add your interests, budget and the kind of experiences you enjoy.</p></article>
            <article className="motion-reveal motion-delay-1"><span>02 / PLAN</span><div className="step-icon">⌖</div><h3>Make a travel plan</h3><p>Share your destination, dates and the details of your next trip.</p></article>
            <article className="motion-reveal motion-delay-2"><span>03 / DISCOVER</span><div className="step-icon">✧</div><h3>Meet compatible people</h3><p>Explore travellers whose plans and preferences align with yours.</p></article>
            <article className="motion-reveal motion-delay-3"><span>04 / CONNECT</span><div className="step-icon">↗</div><h3>Make it a shared story</h3><p>Send a request, connect when it is accepted and plan together.</p></article>
          </div>
        </section>

        <section id="why-travel-mate" className="feature-section">
          <div className="feature-visual motion-reveal">
            <div className="feature-photo" role="img" aria-label="Friends exploring a destination together" />
            <div className="feature-chip"><span>✦</span><div><strong>Compatibility with context</strong><small>Understand why a connection fits</small></div></div>
          </div>
          <div className="feature-copy motion-reveal">
            <span className="section-label">MADE FOR REAL TRAVELLERS</span>
            <h2>Not random people.<br /><em>Your kind of people.</em></h2>
            <p>Travel Mate looks at the details that shape a good trip, so discovering a companion feels more relevant and less like scrolling through strangers.</p>
            <div className="feature-list">
              <div><b>01</b><span><strong>Trips that line up.</strong> Compare destinations and overlapping travel dates.</span></div>
              <div><b>02</b><span><strong>Preferences that matter.</strong> Consider budget, travel style, interests and activities.</span></div>
              <div><b>03</b><span><strong>Clearer recommendations.</strong> See why a traveller appears in your discovery list.</span></div>
            </div>
          </div>
        </section>

        <section id="safety" className="landing-cta motion-reveal">
          <span className="section-label">YOUR NEXT CHAPTER IS OUT THERE</span>
          <h2>Go further.<br /><em>Go together.</em></h2>
          <p>Create your profile, share a plan and find someone excited about the same journey.</p>
          <Link className="primary-cta" to={startHref}>{user ? "Go to your dashboard" : "Start your journey"} <span>↗</span></Link>
        </section>
      </main>

      <footer className="landing-footer">
        <Link className="landing-brand" to="/">✦ Travel Mate</Link>
        <span>Find people. Explore together.</span>
        <span>Built for journeys worth sharing.</span>
      </footer>
    </div>
  );
}

function ShellPage({ children }) {
  return <ProtectedRoute><AppShell>{children}</AppShell></ProtectedRoute>;
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/dashboard" element={<ShellPage><Dashboard /></ShellPage>} />
    <Route path="/explore" element={<ShellPage><ExploreTrips /></ShellPage>} />
    <Route path="/discover" element={<ShellPage><Discover /></ShellPage>} />
    <Route path="/my-trips" element={<ShellPage><MyTrips /></ShellPage>} />
    <Route path="/my-trips/new" element={<ShellPage><CreateTrip /></ShellPage>} />
    <Route path="/my-trips/edit/:id" element={<ShellPage><CreateTrip /></ShellPage>} />
    <Route path="/matches" element={<ShellPage><Matches /></ShellPage>} />
    <Route path="/requests" element={<ShellPage><Requests /></ShellPage>} />
    <Route path="/messages" element={<ShellPage><Messages /></ShellPage>} />
    <Route path="/notifications" element={<ShellPage><Notifications /></ShellPage>} />
    <Route path="/traveller/:id" element={<ShellPage><TravellerProfile /></ShellPage>} />
    <Route path="/profile" element={<ShellPage><Profile /></ShellPage>} />
    <Route path="/settings" element={<ShellPage><Settings /></ShellPage>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
