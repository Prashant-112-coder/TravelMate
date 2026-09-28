import { Link, useNavigate } from "react-router-dom";
import { signOut } from "../lib/auth";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="sidebar-brand" to="/dashboard"><span>✦</span> Travel Mate</Link>
        <div className="sidebar-section-label">Workspace</div>
        <nav className="side-nav">
          <Link className="active" to="/dashboard">⌂ <span>Dashboard</span></Link>
          <Link to="/dashboard">⌕ <span>Explore trips</span></Link>
          <Link to="/dashboard">▣ <span>My trips</span></Link>
          <Link to="/dashboard">♡ <span>Matches</span></Link>
          <Link to="/dashboard">◌ <span>Messages</span></Link>
          <Link to="/profile">◉ <span>Profile</span></Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><strong>Your journey starts with your profile.</strong><span>Add your photo and preferences before we build matching.</span></div>
          <button className="sidebar-link" onClick={handleLogout}>↪ <span>Sign out</span></button>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <div><span className="mobile-brand">Travel Mate</span><span className="topbar-title">Dashboard</span></div>
          <div className="topbar-actions"><button className="icon-button" aria-label="Notifications">♧</button><Link className="topbar-user" to="/profile"><span>{user?.email?.split("@")[0] || "Traveller"}</span><div className="mini-avatar">{(user?.email || "T").slice(0,1).toUpperCase()}</div></Link></div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div><p className="eyebrow">WELCOME BACK</p><h1>Hi, Traveller. <span>✦</span></h1><p>Complete your travel identity and get ready to discover compatible journeys.</p></div>
            <Link className="button" to="/profile">Complete profile →</Link>
          </section>

          <section className="stats-grid">
            <div className="stat-card"><span className="stat-icon">◌</span><div><strong>0</strong><span>Upcoming trips</span></div></div>
            <div className="stat-card"><span className="stat-icon">♡</span><div><strong>0</strong><span>Matches</span></div></div>
            <div className="stat-card"><span className="stat-icon">◎</span><div><strong>0</strong><span>Connections</span></div></div>
            <div className="stat-card"><span className="stat-icon">✦</span><div><strong>0%</strong><span>Profile complete</span></div></div>
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-main-card">
              <div className="card-heading"><div><span className="section-kicker">NEXT STEP</span><h2>Build your traveller profile</h2></div><span className="muted">Phase 3</span></div>
              <div className="progress-block"><div className="progress-label"><span>Profile setup</span><strong>40%</strong></div><div className="progress-track"><span style={{width:"40%"}}></span></div></div>
              <div className="setup-list">
                <div className="setup-done"><span>✓</span><div><strong>Account created</strong><small>Supabase authentication is connected.</small></div></div>
                <Link className="setup-current" to="/profile"><span>→</span><div><strong>Add your recent photo & preferences</strong><small>Help future matching understand your travel style.</small></div><b>Open</b></Link>
                <div className="setup-disabled"><span>3</span><div><strong>Create your first trip</strong><small>Coming in the next build phase.</small></div></div>
              </div>
            </div>
            <aside className="dashboard-side-card">
              <div className="mini-cover"></div>
              <div className="side-card-content"><span className="section-kicker">TRAVEL MATE</span><h3>Travel is better when shared.</h3><p>Your profile will become the foundation for destinations, preferences and explainable compatibility.</p><Link to="/profile" className="text-link">Edit my profile →</Link></div>
            </aside>
          </section>

          <section className="dashboard-grid bottom-grid">
            <div className="empty-card"><span className="empty-icon">⌕</span><h3>Explore trips</h3><p>Trip discovery will be connected after the profile foundation is complete.</p><button className="button button-light" disabled>Coming next</button></div>
            <div className="empty-card"><span className="empty-icon">♡</span><h3>Find your people</h3><p>Matching will use your destination, dates, budget, style, interests and activities.</p><button className="button button-light" disabled>Coming next</button></div>
          </section>
        </div>
      </main>
    </div>
  );
}
