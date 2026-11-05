import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [profile,setProfile]=useState(null),[stats,setStats]=useState({trips:0,matches:0,requests:0}),[loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([apiFetch("/profile"),apiFetch("/trips"),apiFetch("/requests")]).then(([p,t,r])=>{
    setProfile(p.profile);
    const accepted=(r.requests||[]).filter(x=>x.status==="accepted").length;
    const pending=(r.requests||[]).filter(x=>x.status==="pending" && x.receiver_id===user?.id).length;
    setStats({trips:(t.trips||[]).filter(x=>x.status!=="completed"&&x.status!=="cancelled").length,matches:accepted,requests:pending});
  }).catch(()=>{}).finally(()=>setLoading(false))},[user?.id]);
  const first=profile?.display_name||user?.user_metadata?.display_name||user?.email?.split("@")[0]||"Traveller";
  const completion=profile?Math.round(([profile.display_name,profile.avatar_url,profile.bio,profile.home_city,profile.travel_style,(profile.interests||[]).length,(profile.activities||[]).length].filter(Boolean).length/7)*100):0;
  return <div className="content-wrap">
    <section className="dashboard-hero"><div><p className="eyebrow">YOUR NEXT ADVENTURE STARTS HERE</p><h1>Hi, <em>{first}</em> <span className="hello-spark">✦</span></h1><p>Plan a trip, meet like-minded travellers, and turn a destination into a shared story.</p><div className="dashboard-actions"><Link className="button" to="/profile">{completion<100?"Complete profile →":"View profile →"}</Link><Link className="button button-light" to="/my-trips/new">Create a trip</Link></div></div><div className="dashboard-hero-art"><div className="orb orb-one"></div><div className="orb orb-two"></div><span>✦</span><small>TRAVEL MATE</small></div></section>
    <section className="stats-grid">
      <Link className="stat-card stat-trips" to="/my-trips"><span className="stat-icon">▣</span><div><strong>{stats.trips}</strong><span>Trips planned</span><small>From your trips</small></div><b className="stat-arrow">→</b></Link>
      <Link className="stat-card stat-matches" to="/matches"><span className="stat-icon">♡</span><div><strong>{stats.matches}</strong><span>Matches</span><small>Travel connections</small></div><b className="stat-arrow">→</b></Link>
      <Link className="stat-card stat-requests" to="/requests"><span className="stat-icon">▤</span><div><strong>{stats.requests}</strong><span>Requests</span><small>Needs your attention</small></div><b className="stat-arrow">→</b></Link>
      <Link className="stat-card stat-profile" to="/profile"><span className="stat-icon">◎</span><div><strong>{completion}%</strong><span>Profile complete</span><small>Make your profile shine</small></div><b className="stat-arrow">→</b></Link>
    </section>
    <section className="dashboard-columns"><div className="panel-card"><div className="card-heading"><div><span className="section-kicker">YOUR SETUP</span><h2>Make your traveller profile stand out</h2></div><b>{completion}%</b></div><div className="progress-track large"><span style={{width:completion+"%"}}></span></div><div className="setup-list"><div className="setup-done"><span>✓</span><div><strong>Account created</strong><small>Your Travel Mate account is ready to go.</small></div></div><Link className="setup-current" to="/profile"><span>→</span><div><strong>{profile?.avatar_url?"Profile photo added":"Add your photo and travel style"}</strong><small>{profile?.avatar_url?"Keep adding preferences to improve matching.":"Show travellers what kind of journeys inspire you."}</small></div><b>Open</b></Link><Link className="setup-current" to="/my-trips/new"><span>3</span><div><strong>Put a destination on the map</strong><small>Add your dates and discover people travelling your way.</small></div><b>Open</b></Link></div></div><aside className="panel-card next-trip"><div className="next-trip-image"></div><div className="next-trip-content"><span className="section-kicker">NEXT JOURNEY</span><h3>Your next great story starts somewhere.</h3><p>Add a trip to find travellers with similar plans, dates and interests.</p><Link className="text-link" to="/my-trips">View my trips →</Link></div></aside></section>
    <section className="dashboard-columns lower"><div className="panel-card activity-card"><div className="card-heading"><div><span className="section-kicker">EXPLORE</span><h2>Journeys worth discovering</h2></div><Link className="text-link" to="/explore">Explore all →</Link></div><div className="soft-empty"><span>⌖</span><div><strong>Find your kind of adventure</strong><p>Browse real plans shared by travellers and find a journey that feels right.</p></div></div></div><div className="panel-card safety-card"><span className="section-kicker">SAFETY FIRST</span><h2>Good journeys start with trust.</h2><p>You stay in control of your visibility, connections and travel experience.</p><Link className="text-link" to="/settings">Review settings →</Link></div></section>
  </div>
}