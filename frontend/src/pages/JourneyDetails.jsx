import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function JourneyDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [dayId, setDayId] = useState("");
  const [description, setDescription] = useState("");
  const [interestText, setInterestText] = useState("");
  const [generationInfo, setGenerationInfo] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch("/journeys/" + id);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function createDraft() {
    setBusy(true);
    setError("");
    try {
      await apiFetch("/journeys/" + id + "/itinerary", {
        method: "POST",
        body: JSON.stringify({})
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function generateItinerary() {
    setBusy(true);
    setError("");
    setGenerationInfo(null);
    try {
      const interests = interestText.split(",").map(value => value.trim()).filter(Boolean).slice(0, 5);
      const result = await apiFetch("/journeys/" + id + "/generate-itinerary", {
        method: "POST",
        body: JSON.stringify({ interests })
      });
      setGenerationInfo(result.generation || null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addActivity(event) {
    event.preventDefault();
    if (!dayId || !title.trim()) return;

    setBusy(true);
    setError("");
    try {
      // The database retains its legacy period field internally; it is not shown in the UI.
      await apiFetch("/journeys/" + id + "/activities", {
        method: "POST",
        body: JSON.stringify({
          day_id: dayId,
          title: title.trim(),
          description
        })
      });
      setTitle("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="content-wrap"><section className="journey-empty">Loading journey…</section></div>;
  }

  if (!data) {
    return (
      <div className="content-wrap">
        <p className="form-error">{error || "Journey unavailable."}</p>
        <Link to="/journeys">← My Journeys</Link>
      </div>
    );
  }

  const { journey, itinerary } = data;
  const days = [...(itinerary?.days || [])].sort((a, b) => a.day_number - b.day_number);
  const members = journey.members || [];
  const totalActivities = days.reduce((total, day) => total + (day.activities || []).length, 0);

  return (
    <div className="content-wrap journey-details-page">
      <div className="journey-back"><Link to="/journeys">← My Journeys</Link><span> / Shared journey</span></div>

      <section className="journey-hero journey-hero-modern">
        <div className="journey-hero-copy">
          <span className={"journey-status " + journey.status}>{journey.status}</span>
          <p className="eyebrow">YOUR SHARED JOURNEY</p>
          <h1>{journey.destination}</h1>
          <p>{journey.title}</p>
          <div className="journey-hero-meta">
            <span>◷ {journey.start_date || "Date flexible"} – {journey.end_date || "Date flexible"}</span>
            <span>♧ {members.length} travellers</span>
            <span>₹{journey.budget_min ?? "—"} – ₹{journey.budget_max ?? "—"} / traveller</span>
          </div>
        </div>
        <div className="journey-people">
          {members.map(member => (
            <div className="journey-person" key={member.user_id}>
              <span>{(member.profile?.display_name || "T").slice(0, 1).toUpperCase()}</span>
              <small>{member.profile?.display_name || "Traveller"}{member.user_id === user?.id ? " (You)" : ""}</small>
            </div>
          ))}
        </div>
      </section>

      <nav className="journey-tabs" aria-label="Journey sections">
        <a className="active" href="#overview">Overview</a>
        <a href="#itinerary">Itinerary</a>
        <a href="#places">Places</a>
        <Link to="/messages">Chat</Link>
        <a href="#expenses">Expenses</a>
      </nav>

      <div className="journey-detail-grid">
        <main>
          <section className="journey-panel" id="overview">
            <div className="journey-panel-heading">
              <div><span className="section-kicker">THE PLAN</span><h2>Journey overview</h2></div>
              <span className="journey-draft-chip">Shared with your travel mate</span>
            </div>
            <p className="journey-muted">You and your travel mate are connected. Build your plan together here. Your itinerary can be reviewed and updated by both members.</p>
            <div className="journey-overview-stats">
              <div><strong>{journey.destination}</strong><small>Destination</small></div>
              <div><strong>{journey.start_date || "Flexible"}</strong><small>Start date</small></div>
              <div><strong>{journey.travel_style || "Flexible"}</strong><small>Travel style</small></div>
            </div>
          </section>

          <section className="journey-panel journey-itinerary-panel" id="itinerary">
            <div className="journey-panel-heading">
              <div><span className="section-kicker">YOUR TRAVEL PLAN</span><h2>Day-wise itinerary</h2></div>
              <div className="journey-itinerary-actions">
                {itinerary && <span className="journey-draft-chip">{days.length} days · {totalActivities} activities</span>}
                <button className="button" type="button" disabled={busy} onClick={generateItinerary}>
                  {busy ? "Preparing…" : "Generate itinerary"}
                </button>
              </div>
            </div>
            <div className="journey-generate-controls">
              <label>
                Travel interests <span className="journey-optional">(up to 5, comma-separated)</span>
                <input value={interestText} onChange={event => setInterestText(event.target.value)} placeholder="e.g. history, culture, food, nature" />
              </label>
              <small>Your shared plan will be created from the destination and travel dates. Existing activities are kept safe.</small>
            </div>
            {generationInfo && <p className="journey-generation-success">Your itinerary is ready: {generationInfo.days} days and {generationInfo.activities} activities for {generationInfo.destination}.</p>}

            {!itinerary ? (
              <div className="itinerary-empty">
                <div>✈</div>
                <h3>Your itinerary starts here</h3>
                <p>Create a shared itinerary and plan the places and experiences you want to enjoy together, one day at a time.</p>
                <button className="button" disabled={busy} onClick={createDraft}>
                  {busy ? "Preparing…" : "Create itinerary"}
                </button>
              </div>
            ) : (
              <>
                {days.length === 0 ? (
                  <div className="itinerary-empty"><h3>No days have been added yet</h3><p>Your day-wise plan will appear here.</p></div>
                ) : (
                  <div className="itinerary-days itinerary-days-modern">
                    {days.map(day => {
                      const activities = day.activities || [];
                      return (
                        <article className="itinerary-day itinerary-day-modern" key={day.id}>
                          <header className="itinerary-day-heading itinerary-day-heading-modern">
                            <span className="itinerary-day-number">DAY {day.day_number}</span>
                            <div className="itinerary-day-title">
                              <strong>{day.title || "Explore the destination"}</strong>
                              <small>{day.day_date || "Date to be decided"}</small>
                            </div>
                            <span className="itinerary-activity-count">{activities.length} {activities.length === 1 ? "activity" : "activities"}</span>
                          </header>
                          <div className="itinerary-day-content">
                            <h3>Things to do</h3>
                            {activities.length ? (
                              <div className="itinerary-activity-list">
                                {activities.map((activity, index) => (
                                  <div className="itinerary-activity itinerary-activity-modern" key={activity.id}>
                                    <span className="itinerary-activity-index">{String(index + 1).padStart(2, "0")}</span>
                                    <div>
                                      <strong>{activity.title}</strong>
                                      {activity.description && <p>{activity.description}</p>}
                                      {activity.place_name && <small className="itinerary-place-name">⌖ {activity.place_name}</small>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="itinerary-no-activities">
                                <span>＋</span>
                                <p>No activities planned for this day yet. Add your first experience below.</p>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                <form className="journey-add-activity journey-add-activity-modern" onSubmit={addActivity}>
                  <div className="journey-add-heading">
                    <span className="journey-add-icon">＋</span>
                    <div><h3>Add something to your plan</h3><p>Choose a day and add an activity for your group.</p></div>
                  </div>
                  <label>
                    Select day
                    <select value={dayId} onChange={event => setDayId(event.target.value)} required>
                      <option value="">Choose a day</option>
                      {days.map(day => <option value={day.id} key={day.id}>Day {day.day_number}{day.day_date ? " · " + day.day_date : ""}</option>)}
                    </select>
                  </label>
                  <label>
                    Activity name
                    <input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Explore the local market" required maxLength={120} />
                  </label>
                  <label>
                    Description <span className="journey-optional">(optional)</span>
                    <textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Add useful details for your travel mate…" rows="3" maxLength={500} />
                  </label>
                  <div className="journey-add-submit">
                    <small>Both travellers can view the shared plan.</small>
                    <button className="button" disabled={busy || !dayId || !title.trim()}>{busy ? "Saving…" : "Add activity"}</button>
                  </div>
                </form>
              </>
            )}
          </section>
        </main>

        <aside className="journey-side">
          <section className="journey-panel">
            <span className="section-kicker">TRAVEL MATES</span>
            <h2>Your group</h2>
            {members.map(member => (
              <div className="journey-member-detail" key={member.user_id}>
                <span>{(member.profile?.display_name || "T").slice(0, 1).toUpperCase()}</span>
                <div><strong>{member.profile?.display_name || "Traveller"}</strong><small>{member.profile?.home_city || "Traveller"}</small></div>
              </div>
            ))}
            <Link className="button button-light journey-wide-button" to="/messages">Open messages →</Link>
          </section>
          <section className="journey-panel" id="places">
            <span className="section-kicker">DISCOVER</span>
            <h2>Places & suggestions</h2>
            <p className="journey-muted">Recommended places will appear here when destination discovery is connected.</p>
            <div className="journey-coming-soon">⌖ Places discovery coming next</div>
          </section>
          <section className="journey-panel" id="expenses">
            <span className="section-kicker">SHARED BUDGET</span>
            <h2>Expenses</h2>
            <p className="journey-muted">A shared expense tracker can be added after the itinerary workflow is connected.</p>
          </section>
        </aside>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
