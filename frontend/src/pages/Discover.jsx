import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

const factorLabels = [
  ["destination", "Destination"],
  ["dates", "Dates"],
  ["budget", "Budget"],
  ["travelStyle", "Travel style"],
  ["interests", "Interests"],
  ["activities", "Activities"],
];

export default function Discover() {
  const [params] = useSearchParams();
  const [trips, setTrips] = useState([]);
  const [trip, setTrip] = useState(params.get("trip") || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState({});
  const [error, setError] = useState("");
  const [engine, setEngine] = useState("baseline");
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    apiFetch("/trips")
      .then((response) => {
        const ownTrips = response.trips || [];
        setTrips(ownTrips);
        if (!trip && ownTrips[0]) setTrip(ownTrips[0].id);
      })
      .catch((e) => setError(e.message));
  }, [trip]);

  useEffect(() => {
    if (!trip) return;
    setLoading(true);
    setError("");
    apiFetch("/discover?tripId=" + encodeURIComponent(trip))
      .then((response) => {
        setResults(response.results || []);
        setEngine(response.engine || "baseline");
      })
      .catch((e) => {
        setResults([]);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [trip]);

  async function request(candidateTripId) {
    try {
      await apiFetch("/requests", {
        method: "POST",
        body: JSON.stringify({ trip_id: candidateTripId, source_trip_id: trip }),
      });
      setSent((current) => ({ ...current, [candidateTripId]: true }));
    } catch (e) {
      setError(e.message);
    }
  }

  async function viewProfile(candidateId, candidateTripId) {
    try {
      await apiFetch("/matching/events", {
        method: "POST",
        body: JSON.stringify({
          event_type: "profile_view",
          candidate_id: candidateId,
          source_trip_id: trip,
          candidate_trip_id: candidateTripId,
          metadata: { source: "discover" },
        }),
      });
    } catch {
      // Analytics must never block profile navigation.
    }
  }

  return (
    <div className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DISCOVER</p>
          <h1>Find your travel people.</h1>
          <p>Real trips are compared using an explainable compatibility model. The system records outcomes so it can later learn from real interactions.</p>
        </div>
        <Link className="button" to="/my-trips/new">Plan another trip</Link>
      </div>

      <div className="filter-bar">
        <label className="discover-select">
          Matching trip
          <select value={trip} onChange={(e) => setTrip(e.target.value)}>
            {trips.map((item) => (
              <option key={item.id} value={item.id}>{item.title} · {item.destination}</option>
            ))}
          </select>
        </label>
        <span className="matching-engine-badge">
          {engine === "baseline" ? "Explainable matching" : "ML matching"}
        </span>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <section className="empty-state-card">
          <h2>Finding compatible travellers…</h2>
          <p>Checking destination, dates, budget and travel preferences.</p>
        </section>
      ) : results.length === 0 ? (
        <section className="discover-empty">
          <div className="discover-illustration">✦</div>
          <h2>No compatible travellers yet</h2>
          <p>Travel Mate currently requires an open trip with a compatible destination and overlapping dates. More people and trips will create more matches.</p>
          <Link className="button button-light" to="/my-trips/new">Create another trip</Link>
        </section>
      ) : (
        <div className="traveller-grid">
          {results.map(({ trip: candidateTrip, profile, compatibility, breakdown, missing }) => (
            <article className="traveller-card" key={candidateTrip.id}>
              <div
                className="traveller-cover"
                style={
                  profile?.background_url || profile?.avatar_url
                    ? { backgroundImage: `url("${profile.background_url || profile.avatar_url}")` }
                    : undefined
                }
              >
                <span className="compatibility">{compatibility}% match</span>
              </div>

              <div className="traveller-body">
                <div className="traveller-title">
                  <div>
                    <h2>{profile?.display_name || "Traveller"}</h2>
                    <small>{profile?.home_city || "Location private"}</small>
                  </div>
                  <span>✦</span>
                </div>

                <p className="trip-destination">
                  {candidateTrip.destination} · {new Date(candidateTrip.start_date).toLocaleDateString()} – {new Date(candidateTrip.end_date).toLocaleDateString()}
                </p>

                <div className="match-breakdown">
                  <div className="match-breakdown-head">
                    <strong>Why you match</strong>
                    <button type="button" className="breakdown-toggle" onClick={() => setExpanded((current) => ({ ...current, [candidateTrip.id]: !current[candidateTrip.id] }))}>
                      {expanded[candidateTrip.id] ? "Hide" : "Details"}
                    </button>
                  </div>
                  {expanded[candidateTrip.id] && (
                    <div className="match-factor-list">
                      {factorLabels.map(([key, label]) => (
                        <div key={key}>
                          <span>{label}</span>
                          <strong>+{breakdown?.[key] ?? 0}</strong>
                        </div>
                      ))}
                      {missing?.length > 0 && <small>Neutral score used where {missing.join(", ")} data is missing.</small>}
                    </div>
                  )}
                </div>

                <div className="tag-list">
                  {(profile?.interests || []).slice(0, 4).map((item) => <span key={item}>{item}</span>)}
                </div>

                <p className="traveller-bio">{profile?.bio || "Open to connecting with compatible travellers."}</p>

                <div className="traveller-actions">
                  <Link
                    className="button button-light"
                    to={"/traveller/" + profile.id + "?tripId=" + encodeURIComponent(trip) + "&candidateTripId=" + encodeURIComponent(candidateTrip.id)}
                    onClick={() => viewProfile(profile.id, candidateTrip.id)}
                  >
                    View profile
                  </Link>
                  <button className="button" disabled={sent[candidateTrip.id]} onClick={() => request(candidateTrip.id)}>
                    {sent[candidateTrip.id] ? "Request sent" : "Send request"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
