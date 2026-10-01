import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

function formatDateRange(start, end) {
  const formatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return `${formatter.format(new Date(start + "T00:00:00"))} – ${formatter.format(new Date(end + "T00:00:00"))}`;
}

function formatBudget(trip) {
  if (trip.budget_min == null && trip.budget_max == null) return "Budget not specified";
  const currency = trip.currency || "INR";
  const money = (value) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
  if (trip.budget_min != null && trip.budget_max != null) return `${currency} ${money(trip.budget_min)} – ${money(trip.budget_max)}`;
  if (trip.budget_min != null) return `${currency} ${money(trip.budget_min)}+`;
  return `Up to ${currency} ${money(trip.budget_max)}`;
}

export default function ExploreTrips() {
  const [trips, setTrips] = useState([]);
  const [destination, setDestination] = useState("");
  const [style, setStyle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch("/explore/trips")
      .then(({ trips: data }) => {
        if (active) setTrips(data || []);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const styles = useMemo(
    () => [...new Set(trips.map((trip) => trip.travel_style).filter(Boolean))].sort(),
    [trips],
  );

  const filteredTrips = useMemo(() => {
    const query = destination.trim().toLowerCase();
    return trips.filter((trip) => {
      const matchesDestination = !query || trip.destination.toLowerCase().includes(query);
      const matchesStyle = !style || trip.travel_style === style;
      return matchesDestination && matchesStyle;
    });
  }, [destination, style, trips]);

  return (
    <div className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">EXPLORE TRIPS</p>
          <h1>Discover real travel plans.</h1>
          <p>Browse open trips created by discoverable travellers.</p>
        </div>
        <Link className="button" to="/my-trips/new">+ Create trip</Link>
      </div>

      <div className="filter-bar">
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Search destination…"
          aria-label="Search destination"
        />
        <select value={style} onChange={(e) => setStyle(e.target.value)} aria-label="Filter by travel style">
          <option value="">All travel styles</option>
          {styles.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        {(destination || style) && (
          <button className="button button-light" type="button" onClick={() => { setDestination(""); setStyle(""); }}>
            Clear
          </button>
        )}
      </div>

      {error && <div className="form-alert error" style={{ marginTop: 16 }}>{error}</div>}

      {loading ? (
        <section className="empty-state-card">
          <h2>Loading open trips…</h2>
          <p>Finding journeys that are currently discoverable.</p>
        </section>
      ) : filteredTrips.length === 0 ? (
        <section className="empty-state-card">
          <div className="empty-state-icon">⌖</div>
          <h2>{trips.length ? "No trips match your filters" : "No open trips yet"}</h2>
          <p>
            {trips.length
              ? "Try another destination or travel style."
              : "Create an open trip and it will become discoverable to other travellers when your profile is public."}
          </p>
          {trips.length === 0 && <Link className="button" to="/my-trips/new">Create an open trip</Link>}
        </section>
      ) : (
        <div className="explore-trip-grid">
          {filteredTrips.map((trip, index) => {
            const profile = trip.profile;
            return (
              <article className="explore-trip-card" key={trip.id}>
                <div className={`explore-trip-image demo-image demo-${index % 3}`}>
                  <span>OPEN TRIP</span>
                </div>

                <div className="explore-trip-body">
                  <div className="explore-trip-user">
                    <div className="mini-avatar">
                      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile?.display_name?.[0] || "T")}
                    </div>
                    <div>
                      <strong>{profile?.display_name || "Traveller"}</strong>
                      <small>{profile?.home_city || "Location private"}</small>
                    </div>
                  </div>

                  <p className="eyebrow">{trip.destination}</p>
                  <h2>{trip.title}</h2>
                  <p>{formatDateRange(trip.start_date, trip.end_date)}</p>

                  <div className="trip-meta">
                    <span>{formatBudget(trip)}</span>
                    <span>{trip.travel_style || "Flexible style"}</span>
                  </div>

                  <div className="explore-actions">
                    {profile?.id && <Link className="button button-light" to={`/traveller/${profile.id}`}>View profile</Link>}
                    <Link className="button" to="/discover">Find match</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
