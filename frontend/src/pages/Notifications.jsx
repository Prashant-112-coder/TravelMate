import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/notifications");
      setItems(response.notifications || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markRead(id) {
    try {
      const response = await apiFetch("/notifications/" + id + "/read", { method: "PATCH" });
      setItems((current) => current.map((item) => item.id === id ? response.notification : item));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">UPDATES</p>
          <h1>Notifications</h1>
          <p>Stay updated on requests, matches and your travel activity.</p>
        </div>
        <Link className="button button-light" to="/settings">Notification settings</Link>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <section className="empty-state-card"><h2>Loading notifications…</h2></section>
      ) : items.length === 0 ? (
        <section className="discover-empty">
          <div className="discover-illustration">✦</div>
          <h2>No notifications yet</h2>
          <p>New connection requests and responses will appear here.</p>
        </section>
      ) : (
        <div className="notification-list">
          {items.map((item) => (
            <article
              className={"notification " + (item.read_at ? "read" : "unread")}
              key={item.id}
            >
              <span>{item.type === "match_accepted" ? "✓" : item.type === "match_declined" ? "×" : "♡"}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <small>{new Date(item.created_at).toLocaleString()}</small>
              </div>
              {!item.read_at && (
                <button className="button button-light" onClick={() => markRead(item.id)}>
                  Mark read
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
