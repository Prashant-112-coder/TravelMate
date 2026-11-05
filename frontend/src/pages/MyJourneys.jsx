import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";

const statusLabel = (status) => (status || "planning").replace(/_/g, " ");

export default function MyJourneys() {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    let active = true;
    apiFetch("/journeys")
      .then((r) => { if (active) setJourneys(r.journeys || []); })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => ({
    all: journeys.length,
    planning: journeys.filter((j) => ["planning", "pending"].includes((j.status || "").toLowerCase())).length,
    active: journeys.filter((j) => ["active", "ongoing", "in_progress"].includes((j.status || "").toLowerCase())).length,
    completed: journeys.filter((j) => (j.status || "").toLowerCase() === "completed").length,
  }), [journeys]);

  const visibleJourneys = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = journeys.filter((j) => {
      const status = (j.status || "planning").toLowerCase();
      const matchesFilter = filter === "all" ||
        (filter === "planning" && ["planning", "pending"].includes(status)) ||
        (filter === "active" && ["active", "ongoing", "in_progress"].includes(status)) ||
        (filter === "completed" && status === "completed");
      const matchesQuery = !q || [j.destination, j.title, j.travel_style, ...(j.members || []).map((m) => m.profile?.display_name)]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
    return result.sort((a, b) => {
      const aDate = new Date(a.start_date || 0).getTime();
      const bDate = new Date(b.start_date || 0).getTime();
      return sort === "oldest" ? aDate - bDate : bDate - aDate;
    });
  }, [journeys, filter, query, sort]);

  return (
    <div className="content-wrap my-journeys-page">
      <section className="my-journeys-banner">
        <div>
          <p className="eyebrow">TRAVEL TOGETHER</p>
          <h1>My Journeys</h1>
          <p>Every shared plan, connection and destination — all in one place.</p>
        </div>
        <Link className="button" to="/discover">Find travel mates <span aria-hidden="true">→</span></Link>
      </section>

      <section className="journey-summary-grid" aria-label="Journey summary">
        <article><span className="journey-summary-icon">✈</span><div><strong>{counts.all}</strong><small>Total journeys</small></div></article>
        <article><span className="journey-summary-icon">▣</span><div><strong>{counts.planning}</strong><small>Planning</small></div></article>
        <article><span className="journey-summary-icon">➤</span><div><strong>{counts.active}</strong><small>Ongoing</small></div></article>
        <article><span className="journey-summary-icon">✓</span><div><strong>{counts.completed}</strong><small>Completed</small></div></article>
        <Link className="button journey-create-button" to="/my-trips/new">＋ Create new trip</Link>
      </section>

      {error && <p className="form-error">{error}</p>}

      <section className="journey-toolbar">
        <div className="journey-filter-pills" aria-label="Filter journeys">
          {[
            ["all", "All journeys"],
            ["planning", "Planning"],
            ["active", "Ongoing"],
            ["completed", "Completed"],
          ].map(([value, label]) => (
            <button key={value} type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>
              {label} <span>{counts[value]}</span>
            </button>
          ))}
        </div>
        <div className="journey-search-sort">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search journeys…" aria-label="Search journeys" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort journeys">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </section>

      {loading ? (
        <section className="journey-empty"><h2>Gathering your journeys…</h2><p>Your shared travel plans will appear here.</p></section>
      ) : journeys.length === 0 ? (
        <section className="journey-empty"><div className="journey-empty-icon">✈</div><h2>Your next journey starts with a connection</h2><p>Send a travel request from Find Travel Mates. When the other traveller accepts, your shared journey will appear here automatically.</p><Link className="button" to="/discover">Discover travellers</Link></section>
      ) : visibleJourneys.length === 0 ? (
        <section className="journey-empty"><div className="journey-empty-icon">⌕</div><h2>No journeys found</h2><p>Try a different search or select another journey filter.</p><button className="button button-light" type="button" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</button></section>
      ) : (
        <div className="journey-grid">
          {visibleJourneys.map((j, index) => (
            <article className="journey-card" key={j.id}>
              <div className={"journey-card-cover journey-cover-" + (index % 3)}>
                <span className={"journey-status " + (j.status || "planning")}>{statusLabel(j.status)}</span>
                <div><small>YOUR SHARED DESTINATION</small><h2>{j.destination}</h2></div>
              </div>
              <div className="journey-card-body">
                <div className="journey-card-title-row"><h3>{j.title}</h3><span className="journey-duration">{j.start_date && j.end_date ? Math.max(1, Math.ceil((new Date(j.end_date) - new Date(j.start_date)) / 86400000)) + " days" : "Dates flexible"}</span></div>
                <p className="journey-date-line">▣ {j.start_date ? new Date(j.start_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Dates to be planned"}{j.end_date ? " – " + new Date(j.end_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}</p>
                <div className="journey-member-row">{(j.members || []).map((m) => <span className="journey-member" key={m.user_id}>{m.profile?.display_name || "Traveller"}</span>)}</div>
                <div className="journey-card-footer"><span>{j.travel_style || "Travel together"} · {(j.currency || "INR")} {j.budget_min ?? "—"}–{j.budget_max ?? "—"}</span><Link className="button" to={"/journeys/" + j.id}>View details →</Link></div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
