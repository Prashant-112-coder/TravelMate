import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function getToday() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

const factorLabels = [
  ["destination", "Destination"],
  ["dates", "Dates"],
  ["budget", "Budget"],
  ["travelStyle", "Travel style"],
  ["interests", "Interests"],
  ["activities", "Activities"],
];

export default function Discover() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [trips, setTrips] = useState([]);
  const [trip, setTrip] = useState(params.get("trip") || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState({});
  const [activeConnections, setActiveConnections] = useState({});
  const [error, setError] = useState("");
  const [engine, setEngine] = useState("baseline");
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    Promise.all([apiFetch("/trips"), apiFetch("/requests")])
      .then(([tripResponse, requestResponse]) => {
        const today = getToday();
        // Keep trips selectable while they are ongoing; expire only after end_date.
        const ownTrips = (tripResponse.trips || []).filter((item) => item.status === "open" && item.end_date >= today);
        setTrips(ownTrips);
        setTrip((current) => ownTrips.some((item) => item.id === current) ? current : (ownTrips[0]?.id || ""));
        const connections = {};
        (requestResponse.requests || []).forEach((item) => {
          if (
            user?.id &&
            ["pending", "accepted"].includes(item.status) &&
            (item.sender_id === user.id || item.receiver_id === user.id)
          ) {
            const otherId = item.sender_id === user.id ? item.receiver_id : item.sender_id;
            connections[otherId] = true;
          }
        });
        setActiveConnections(connections);
      })
      .catch((e) => setError(e.message));
  }, [user?.id]);

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
          <p>Explore travellers whose plans and preferences align with yours.</p>
        </div>
        <Link className="button" to="/my-trips/new">Plan another trip</Link>
      </div>

      <div className="filter-bar">
        <label className="discover-select">
          Matching trip
          <select value={trip} onChange={(e) => setTrip(e.target.value)}>
            {trips.map((item) => (
              <option key={item.id} value={item.id}>{item.title} · {item.destination} · {item.start_date} to {item.end_date}</option>
            ))}
          </select>
        </label>
        <span className="matching-engine-badge">
          Travel compatibility
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
          <p>{trips.length === 0 ? "You need an open trip whose end date has not passed before searching for travel mates." : "No other discoverable traveller has an open trip with the same destination and overlapping future dates yet."} More people and trips will create more matches.</p>
          <Link className="button button-light" to="/my-trips/new">Create another trip</Link>
        </section>
      ) : (
        <div className="traveller-grid">
          {results
            .filter(({ profile }) => !activeConnections[profile?.id])
            .map(({ trip: candidateTrip, profile, compatibility, breakdown, missing, features, score_note, feature_limitations }) => (
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
                      {engine === "ml" ? (
                        <>
                          <div><span>Destination exact match</span><strong>{features?.same_destination ? "Yes" : "No"}</strong></div>
                          <div><span>Overlapping dates (IoU)</span><strong>{Math.round((features?.date_overlap_iou || 0) * 100)}%</strong></div>
                          <div><span>Budget similarity</span><strong>{Math.round((features?.budget_ratio || 0) * 100)}%</strong></div>
                          <div><span>Same travel style</span><strong>{features?.same_travel_style ? "Yes" : "No"}</strong></div>
                          <div><span>Activity similarity</span><strong>{Math.round((features?.activities_jaccard || 0) * 100)}%</strong></div>
                          
                        </>
                      ) : (
                        <>
                          {factorLabels.map(([key, label]) => (
                            <div key={key}>
                              <span>{label}</span>
                              <strong>+{breakdown?.[key] ?? 0}</strong>
                            </div>
                          ))}
                          {missing?.length > 0 && <small>Neutral score used where {missing.join(", ")} data is missing.</small>}
                        </>
                      )}
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
