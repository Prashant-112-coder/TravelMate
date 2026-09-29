import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const first = user?.email?.split("@")[0] || "Traveller";
  return <div className="content-wrap">
    <section className="dashboard-hero">
      <div><p className="eyebrow">WELCOME BACK</p><h1>Good to see you, <em>{first}</em>.</h1><p>Set up your traveller identity, then turn your next solo plan into a shared journey.</p><div className="dashboard-actions"><Link className="button" to="/profile">Complete profile →</Link><Link className="button button-light" to="/discover">Explore travellers</Link></div></div>
      <div className="dashboard-hero-art"><div className="orb orb-one"></div><div className="orb orb-two"></div><span>✦</span><small>TRAVEL MATE</small></div>
    </section>
    <section className="stats-grid">
      <div className="stat-card"><span className="stat-icon">⌖</span><div><strong>0</strong><span>Upcoming trips</span></div><small>Ready to plan</small></div>
      <div className="stat-card"><span className="stat-icon">♡</span><div><strong>0</strong><span>Matches</span></div><small>Based on your trips</small></div>
      <div className="stat-card"><span className="stat-icon">◌</span><div><strong>0</strong><span>Requests</span></div><small>No pending requests</small></div>
      <div className="stat-card"><span className="stat-icon">◎</span><div><strong>40%</strong><span>Profile complete</span></div><small>Photo + preferences next</small></div>
    </section>
    <section className="dashboard-columns">
      <div className="panel-card">
        <div className="card-heading"><div><span className="section-kicker">YOUR SETUP</span><h2>Build a stronger travel identity</h2></div><b>40%</b></div>
        <div className="progress-track large"><span style={{width:"40%"}}></span></div>
        <div className="setup-list">
          <div className="setup-done"><span>✓</span><div><strong>Account created</strong><small>Authentication and session are connected.</small></div></div>
          <Link className="setup-current" to="/profile"><span>→</span><div><strong>Add your photo & preferences</strong><small>Tell future matches where and how you like to travel.</small></div><b>Open</b></Link>
          <div className="setup-disabled"><span>3</span><div><strong>Create your first trip</strong><small>Destination and dates unlock discovery.</small></div></div>
        </div>
      </div>
      <aside className="panel-card next-trip"><div className="next-trip-image"></div><div className="next-trip-content"><span className="section-kicker">NEXT JOURNEY</span><h3>Where will you go next?</h3><p>Your first trip will become the starting point for compatibility and discovery.</p><Link className="text-link" to="/my-trips">Plan a trip →</Link></div></aside>
    </section>
    <section className="dashboard-columns lower">
      <div className="panel-card activity-card"><div className="card-heading"><div><span className="section-kicker">DISCOVER</span><h2>Find compatible travellers</h2></div><Link className="text-link" to="/discover">View all →</Link></div><div className="soft-empty"><span>♡</span><div><strong>Discovery will use real data</strong><p>Destination, date overlap, budget, style, interests and activities will drive the matching layer.</p></div></div></div>
      <div className="panel-card safety-card"><span className="section-kicker">SAFETY FIRST</span><h2>Travel with more confidence.</h2><p>Privacy, discoverability, blocking and reporting are designed into the platform—not added as an afterthought.</p><Link className="text-link" to="/settings">Review settings →</Link></div>
    </section>
  </div>