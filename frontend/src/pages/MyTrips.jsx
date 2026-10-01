import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

function formatDateRange(start, end) {
  const formatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return `${formatter.format(new Date(start + "T00:00:00"))} – ${formatter.format(new Date(end + "T00:00:00"))}`;
}

function formatBudget(trip) {
  if (trip.budget_min == null && trip.budget_max == null) return "Budget not specified";
  const currency = trip.currency || "INR";
  const format = (value) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
  if (trip.budget_min != null && trip.budget_max != null) return `${currency} ${format(trip.budget_min)} – ${format(trip.budget_max)}`;
  if (trip.budget_min != null) return `${currency} ${format(trip.budget_min)}+`;
  return `Up to ${currency} ${format(trip.budget_max)}`;
}

export default function MyTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch("/trips");
      setTrips(result.trips || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  async function removeTrip(id) {
    if (!window.confirm("Delete this trip? This cannot be undone.")) return;
    try {
      await apiFetch(`/trips/${id}`, { method: "DELETE" });
      setTrips((current) => current.filter((trip) => trip.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR JOURNEYS</p>
          <h1>My trips</h1>
          <p>Create, edit and manage the journeys you want to share.</p>
        </div>
        <Link className="button" to="/my-trips/new">+ Create trip</Link>
      </div>

      {error && <div className="form-alert error">{error}</div>}

      {loading ? (
        <section className="empty-state-card">
          <h2>Loading your trips…</h2>
          <p>Fetching the journeys linked to your account.</p>
        </section>
      ) : trips.length === 0 ? (
        <section className="empty-state-card">
          <div className="empty-state-icon">✦</div>
          <h2>No trips yet</h2>
          <p>Create your first journey. Once saved, it will appear here and can become available in Explore Trips when its status is Open for matching.</p>
          <Link className="button" to="/my-trips/new">Create your first trip</Link>
        </section>
      ) : (
        <div className="trip-grid">
          {trips.map((trip) => (
            <article className="trip-card" key={trip.id}>
              <div className="trip-card-top">
                <span className={`status-pill ${trip.status}`}>{trip.status}</span>
                <button className="icon-danger" type="button" onClick={() => removeTrip(trip.id)} aria-label={`Delete ${trip.title}`} title="Delete trip">×</button>
              </div>

              <p className="eyebrow">{trip.destination}</p>
              <h2>{trip.title}</h2>
              <p>{formatDateRange(trip.start_date, trip.end_date)}</p>

              <div className="trip-meta">
                <span>{formatBudget(trip)}</span>
                <span>{trip.travel_style || "Travel style not set"}</span>
              </div>

              <div className="trip-card-actions">
                <Link className="text-link" to={`/my-trips/edit/${trip.id}`}>Edit trip</Link>
                <Link className="text-link" to="/discover">Find travel mates →</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
