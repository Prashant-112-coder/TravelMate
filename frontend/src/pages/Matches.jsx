import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/requests")
      .then((response) => {
        setMatches((response.requests || []).filter((item) => item.status === "accepted"));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR CONNECTIONS</p>
          <h1>Matches</h1>
          <p>Travellers whose requests were accepted and are ready to connect.</p>
        </div>
        <Link className="button button-light" to="/discover">Find more →</Link>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <section className="empty-state-card"><h2>Loading your matches…</h2></section>
      ) : matches.length === 0 ? (
        <section className="discover-empty">
          <div className="discover-illustration">✦</div>
          <h2>No matches yet</h2>
          <p>Discover compatible travellers, send a request, and accepted requests will appear here.</p>
          <Link className="button" to="/discover">Discover travellers</Link>
        </section>
      ) : (
        <div className="match-grid">
          {matches.map((item) => {
            const other = item.sender_id === user?.id ? item.receiver : item.sender;
            return (
              <article className="match-card" key={item.id}>
                <div className="mini-avatar large">
                  {(other?.display_name || "T").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="eyebrow">CONNECTED TRAVELLER</p>
                  <h2>{other?.display_name || "Traveller"}</h2>
                  <p>{other?.home_city || "Location private"} · {item.trip?.destination || "Trip destination"}</p>
                  <div className="tag-list">
                    <span>Request accepted</span>
                    {item.trip?.start_date && <span>{new Date(item.trip.start_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <Link className="button" to="/messages">Message →</Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
