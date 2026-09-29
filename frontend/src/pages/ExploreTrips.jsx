import { useEffect,useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function ExploreTrips(){
 const [trips,setTrips]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{apiFetch("/explore/trips").then(r=>setTrips(r.trips||[])).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
 return <div className="content-wrap">
  <div className="page-heading"><div><p className="eyebrow">EXPLORE TRIPS</p><h1>See where the community is going.</h1><p>Every open trip from discoverable travellers can appear here. Open a trip to find its traveller and connect.</p></div><Link className="button" to="/my-trips/new">Create trip →</Link></div>
  {error&&<p className="form-error">{error}</p>}
  {loading?<section className="empty-state-card"><h2>Loading community trips…</h2></section>:trips.length===0?<section className="empty-state-card"><div className="empty-state-icon">⌖</div><h2>No public trips yet.</h2><p>Create an open trip and it will become visible to other discoverable travellers.</p><Link className="button" to="/my-trips/new">Create the first trip →</Link></section>:
  <div className="explore-trip-grid">{trips.map(t=><article className="explore-trip-card" key={t.id}>
   <div className="explore-trip-image" style={t.profile?.avatar_url?{backgroundImage:"url("+t.profile.avatar_url+")"}:{}}><span>{t.status}</span></div>
   <div className="explore-trip-body"><div className="explore-trip-user"><div className="mini-avatar">{(t.profile?.display_name||"T").slice(0,1)}</div><div><strong>{t.profile?.display_name||"Traveller"}</strong><small>{t.profile?.home_city||"Location private"}</small></div></div><p className="eyebrow">{t.destination}</p><h2>{t.title}</h2><p>{new Date(t.start_date).toLocaleDateString()} — {new Date(t.end_date).toLocaleDateString()}</p><div className="trip-meta"><span>{t.currency} {t.budget_min??"—"}–{t.budget_max??"—"}</span><span>{t.travel_style||"Any style"}</span></div><div className="explore-actions"><Link className="button button-light" to={"/traveller/"+t.user_id}>View traveller</Link><Link className="button" to={"/discover?trip="+t.id}>Find match</Link></div></div>
  </article>)}</div>}
 </div>
}