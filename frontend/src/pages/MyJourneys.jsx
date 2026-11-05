import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function MyJourneys() {
  const [journeys,setJourneys]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{apiFetch("/journeys").then(r=>setJourneys(r.journeys||[])).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
  return <div className="content-wrap">
    <div className="page-heading">
      <div><p className="eyebrow">TRAVEL TOGETHER</p><h1>My Journeys</h1><p>Shared trips begin when both travellers accept a request.</p></div>
      <Link className="button button-light" to="/discover">Find travel mates →</Link>
    </div>
    {error&&<p className="form-error">{error}</p>}
    {loading?<section className="journey-empty"><h2>Loading your journeys…</h2></section>:journeys.length===0?
      <section className="journey-empty"><div className="journey-empty-icon">✈</div><h2>Your next journey starts with a match</h2><p>Send a travel request from Find Travel Mates. When the other traveller accepts, your shared journey will appear here automatically.</p><Link className="button" to="/discover">Discover travellers</Link></section>:
      <div className="journey-grid">{journeys.map(j=>(
        <article className="journey-card" key={j.id}>
          <div className="journey-card-cover"><span className={"journey-status "+j.status}>{j.status}</span><div><small>YOUR SHARED DESTINATION</small><h2>{j.destination}</h2></div></div>
          <div className="journey-card-body">
            <h3>{j.title}</h3><p>{j.start_date?new Date(j.start_date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"Dates to be planned"}{j.end_date?" – "+new Date(j.end_date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"}):""}</p>
            <div className="journey-member-row">{(j.members||[]).map(m=><span className="journey-member" key={m.user_id}>{m.profile?.display_name||"Traveller"}</span>)}</div>
            <div className="journey-card-footer"><span>{j.travel_style||"Travel together"} · {(j.currency||"INR")} {j.budget_min??"—"}–{j.budget_max??"—"}</span><Link className="button" to={"/journeys/"+j.id}>Open journey →</Link></div>
          </div>
        </article>
      ))}</div>}
  </div>;
}