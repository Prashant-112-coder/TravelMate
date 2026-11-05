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
    <section className="dashboard-feature-grid">
      <Link className="dashboard-feature-card" to="/my-trips">
        <span className="dashboard-feature-icon">▦</span>
        <span className="dashboard-feature-copy"><strong>Continue Planning</strong><small>Pick up where you left off and turn your travel ideas into a trip.</small></span>
        <b>View all →</b>
      </Link>
      <Link className="dashboard-feature-card" to="/discover">
        <span className="dashboard-feature-icon">♧</span>
        <span className="dashboard-feature-copy"><strong>Discover Travel Mates</strong><small>Find solo travellers with similar travel interests.</small></span>
        <b>Explore →</b>
      </Link>
    </section>
    <section className="dashboard-bottom-grid">
      <div className="dashboard-note-card"><span className="section-kicker">TRAVEL TOGETHER</span><h2>Your next adventure is better shared.</h2><p>Explore open trips, connect with compatible travellers, and plan your next journey together.</p><Link className="text-link" to="/explore">Explore open trips →</Link></div>
      <div className="dashboard-note-card"><span className="section-kicker">YOUR PROFILE</span><h2>Make every connection count.</h2><p>Your profile is {completion}% complete. Add your travel style and interests to help improve your matches.</p><Link className="text-link" to="/profile">Improve my profile →</Link></div>
    </section>
  </div>
}