import { useState } from "react";
import { apiFetch } from "../lib/api";
import "../itinerary.css";

const interests = ["Beach", "Adventure", "Nature", "Cultural", "Food", "Photography", "Nightlife", "Wellness", "Heritage", "Trekking"];

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

const initialForm = {
  destination: "",
  travel_date: localDate(),
  days: 3,
  travelers: 1,
  total_budget: 12000,
  interests: ["Nature", "Cultural"],
};

export default function ItineraryPlanner() {
  const [form, setForm] = useState(initialForm);
  const [itinerary, setItinerary] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleInterest(value) {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(value)
        ? current.interests.filter((item) => item !== value)
        : [...current.interests, value],
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuggestions([]);
    setItinerary(null);
    try {
      const result = await apiFetch("/itinerary/generate", {
        method: "POST",
        body: JSON.stringify({ ...form, days: Number(form.days), travelers: Number(form.travelers), total_budget: Number(form.total_budget) }),
      });
      setItinerary(result.itinerary);
    } catch (err) {
      setError(err.message);
      setSuggestions(err.suggestions || []);
    } finally {
      setLoading(false);
    }
  }

  const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

  return (
    <div className="content-wrap itinerary-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SMART TRIP PLANNING</p>
          <h1>Itinerary planner</h1>
          <p>Build a day-wise travel plan using Indian tourism and historical weather datasets.</p>
        </div>
      </div>

      <form className="profile-card itinerary-form" onSubmit={submit}>
        <div className="itinerary-form-heading">
          <div><span className="itinerary-icon">✦</span></div>
          <div><h2>Plan your journey</h2><p>Tell us where you want to go and what you enjoy.</p></div>
        </div>
        <div className="form-grid">
          <label>
            Destination
            <input required minLength="2" maxLength="120" value={form.destination} onChange={(e) => update("destination", e.target.value)} placeholder="Try Goa, Varanasi, Jaipur or Manali" />
          </label>
          <label>
            Travel start date
            <input required type="date" min={localDate()} value={form.travel_date} onChange={(e) => update("travel_date", e.target.value)} />
          </label>
          <label>
            Number of days
            <input required type="number" min="1" max="10" value={form.days} onChange={(e) => update("days", e.target.value)} />
          </label>
          <label>
            Travellers
            <input required type="number" min="1" max="20" value={form.travelers} onChange={(e) => update("travelers", e.target.value)} />
          </label>
          <label className="full">
            Total trip budget (INR)
            <input required type="number" min="1" value={form.total_budget} onChange={(e) => update("total_budget", e.target.value)} />
          </label>
        </div>

        <div className="choice-section">
          <strong>What are you interested in?</strong>
          <div className="choice-row">
            {interests.map((item) => (
              <button type="button" key={item} className={form.interests.includes(item) ? "choice selected" : "choice"} onClick={() => toggleInterest(item)}>{item}</button>
            ))}
          </div>
        </div>

        {error && <div className="form-error itinerary-error" role="alert">{error}{suggestions.length > 0 && <p>Try one of these destinations: {suggestions.join(", ")}</p>}</div>}
        <button className="button" disabled={loading}>{loading ? "Building your itinerary…" : "Generate itinerary →"}</button>
      </form>

      {itinerary && (
        <section className="itinerary-results" aria-live="polite">
          <div className="itinerary-result-heading">
            <div><p className="eyebrow">YOUR GENERATED PLAN</p><h2>{itinerary.destination}, {itinerary.state}</h2><p>{itinerary.days} days · {itinerary.travelers} traveller(s) · Starting {itinerary.travel_date}</p></div>
            <div className="itinerary-score"><strong>{itinerary.recommendation_score}%</strong><span>Recommendation score</span></div>
          </div>

          <div className="itinerary-summary-grid">
            <article><span>Estimated trip cost</span><strong>{money(itinerary.budget.estimated_total_range[0])} – {money(itinerary.budget.estimated_total_range[1])}</strong><small>{itinerary.budget.within_budget ? "Within your budget range" : "May exceed your entered budget"}</small></article>
            <article><span>Budget category</span><strong>{itinerary.budget.tier}</strong><small>Estimated per-person daily cost</small></article>
            <article><span>Safety reference</span><strong>{itinerary.destination_context.safety_rating ?? "Not rated"}/10</strong><small>Tourism dataset reference, not a live alert</small></article>
          </div>

          <div className="itinerary-content-grid">
            <div className="itinerary-days">
              {itinerary.days_plan.map((day) => (
                <article className="itinerary-day-card" key={day.day}>
                  <div className="itinerary-day-title"><span>DAY {day.day}</span><h3>{day.title}</h3></div>
                  {day.visits.length ? <div className="itinerary-visits">{day.visits.map((visit) => (
                    <div className="itinerary-visit" key={visit.name}>
                      <time>{visit.time}</time><div><strong>{visit.name}</strong><p>{visit.note}</p></div>
                    </div>
                  ))}</div> : <p className="itinerary-empty-day">Flexible day for rest and local exploration.</p>}
                  <small className="itinerary-day-note">{day.suggestion}</small>
                </article>
              ))}
            </div>
            <aside className="itinerary-side">
              <article className="itinerary-side-card">
                <h3>Estimated budget breakdown</h3>
                {Object.entries(itinerary.budget.breakdown).map(([key, value]) => <div className="budget-line" key={key}><span>{key.replaceAll("_", " ")}</span><strong>{money(value)}</strong></div>)}
                <div className="budget-total"><span>Estimated midpoint</span><strong>{money(itinerary.budget.estimated_total_midpoint)}</strong></div>
              </article>
              <article className="itinerary-side-card">
                <h3>Why this plan?</h3>
                <ul>{itinerary.explanations.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              </article>
              <article className="itinerary-side-card">
                <h3>Destination notes</h3>
                <p>{itinerary.destination_context.rainfall_pattern}</p>
                <p>{itinerary.destination_context.climate_reference}</p>
                {itinerary.destination_context.safety_notes && <p>{itinerary.destination_context.safety_notes}</p>}
              </article>
            </aside>
          </div>
          <p className="itinerary-disclaimer">{itinerary.disclaimer}</p>
          <p className="itinerary-sources">Data: {itinerary.data_sources.join(" · ")}</p>
        </section>
      )}
    </div>
  );
}
