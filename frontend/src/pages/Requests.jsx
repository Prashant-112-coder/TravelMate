import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Requests() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/requests");
      setItems(response.requests || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateRequest(id, status) {
    setBusy((current) => ({ ...current, [id]: true }));
    setError("");
    try {
      const response = await apiFetch("/requests/" + id, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setItems((current) => current.map((item) => item.id === id ? { ...item, ...response.request, status } : item));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy((current) => ({ ...current, [id]: false }));
    }
  }

  const incoming = items.filter((item) => item.receiver_id === user?.id && item.status === "pending");
  const outgoing = items.filter((item) => item.sender_id === user?.id && item.status === "pending");
  const resolved = items.filter((item) => item.status !== "pending");

  return (
    <div className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONNECTIONS</p>
          <h1>Match requests</h1>
          <p>Review real requests generated from traveller discovery.</p>
        </div>
        <Link className="button button-light" to="/discover">Discover travellers →</Link>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <section className="empty-state-card"><h2>Loading requests…</h2></section>
      ) : items.length === 0 ? (
        <section className="discover-empty">
          <div className="discover-illustration">✦</div>
          <h2>No requests yet</h2>
          <p>When another traveller sends you a request, it will appear here.</p>
        </section>
      ) : (
        <>
          {incoming.length > 0 && (
            <section className="request-section">
              <div className="card-heading"><div><span className="section-kicker">INCOMING</span><h2>People who want to travel with you</h2></div></div>
              <div className="request-list">
                {incoming.map((item) => (
                  <article className="request-card" key={item.id}>
                    <div className="mini-avatar large">{(item.sender?.display_name || "T").slice(0, 1).toUpperCase()}</div>
                    <div className="request-main">
                      <h2>{item.sender?.display_name || "Traveller"}</h2>
                      <p>{item.sender?.home_city || "Location private"} · {item.trip?.destination}</p>
                      <small>{item.message || "This traveller sent you a connection request."}</small>
                    </div>
                    <div className="request-actions">
                      <button className="button" disabled={busy[item.id]} onClick={() => updateRequest(item.id, "accepted")}>{busy[item.id] ? "Saving…" : "Accept"}</button>
                      <button className="button button-light" disabled={busy[item.id]} onClick={() => updateRequest(item.id, "declined")}>Decline</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {outgoing.length > 0 && (
            <section className="request-section">
              <div className="card-heading"><div><span className="section-kicker">SENT</span><h2>Requests waiting for a response</h2></div></div>
              <div className="request-list">
                {outgoing.map((item) => (
                  <article className="request-card" key={item.id}>
                    <div className="mini-avatar large">{(item.receiver?.display_name || "T").slice(0, 1).toUpperCase()}</div>
                    <div className="request-main">
                      <h2>{item.receiver?.display_name || "Traveller"}</h2>
                      <p>{item.receiver?.home_city || "Location private"} · {item.trip?.destination}</p>
                    </div>
                    <span className="status-pill pending">Pending</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {resolved.length > 0 && (
            <section className="request-section">
              <div className="card-heading"><div><span className="section-kicker">HISTORY</span><h2>Resolved requests</h2></div></div>
              <div className="request-list">
                {resolved.map((item) => {
                  const other = item.sender_id === user?.id ? item.receiver : item.sender;
                  return (
                    <article className="request-card" key={item.id}>
                      <div className="mini-avatar large">{(other?.display_name || "T").slice(0, 1).toUpperCase()}</div>
                      <div className="request-main">
                        <h2>{other?.display_name || "Traveller"}</h2>
                        <p>{item.trip?.destination || "Trip"} · {item.status}</p>
                      </div>
                      <span className={"status-pill " + item.status}>{item.status}</span>
                      {item.status === "accepted" && <Link className="button" to="/messages">Message →</Link>}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
