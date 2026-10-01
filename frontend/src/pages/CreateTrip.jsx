import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

const styles = ["Adventure", "Relaxed", "Backpacking", "Cultural", "Luxury", "Nature"];
const tags = ["Hiking", "Food", "Photography", "Beaches", "Nightlife", "Museums", "Road trips", "Camping"];

const initialForm = {
  title: "",
  destination: "",
  start_date: "",
  end_date: "",
  budget_min: "",
  budget_max: "",
  currency: "INR",
  travel_style: "Adventure",
  interests: [],
  activities: [],
  description: "",
  status: "open",
};

function toForm(trip) {
  return {
    ...initialForm,
    ...trip,
    budget_min: trip.budget_min ?? "",
    budget_max: trip.budget_max ?? "",
    interests: trip.interests || [],
    activities: trip.activities || [],
  };
}

export default function CreateTrip() {
  const nav = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return;
    let active = true;
    setLoading(true);
    apiFetch(`/trips/${id}`)
      .then(({ trip }) => {
        if (active) setForm(toForm(trip));
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
  }, [editing, id]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const toggle = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  };

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    if (form.end_date < form.start_date) {
      setError("End date must be on or after the start date.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...form,
        budget_min: form.budget_min === "" ? null : Number(form.budget_min),
        budget_max: form.budget_max === "" ? null : Number(form.budget_max),
      };

      if (editing) {
        await apiFetch(`/trips/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/trips", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      nav("/my-trips", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="content-wrap">
        <section className="empty-state-card">
          <h2>Loading trip…</h2>
          <p>Fetching your trip details.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{editing ? "EDIT YOUR JOURNEY" : "PLAN A JOURNEY"}</p>
          <h1>{editing ? "Edit trip" : "Create trip"}</h1>
          <p>
            {editing
              ? "Update your journey details before travellers discover it."
              : "Give your journey enough detail for meaningful traveller matching."}
          </p>
        </div>
      </div>

      <form className="profile-card trip-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Trip title
            <input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Weekend in Goa" />
          </label>

          <label>
            Destination
            <input required value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Goa, India" />
          </label>

          <label>
            Start date
            <input required type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </label>

          <label>
            End date
            <input required type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
          </label>

          <label>
            Minimum budget
            <input type="number" min="0" value={form.budget_min} onChange={(e) => set("budget_min", e.target.value)} />
          </label>

          <label>
            Maximum budget
            <input type="number" min="0" value={form.budget_max} onChange={(e) => set("budget_max", e.target.value)} />
          </label>

          <label>
            Travel style
            <select value={form.travel_style || ""} onChange={(e) => set("travel_style", e.target.value)}>
              {styles.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label>
            Status
            <select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="open">Open for matching</option>
              <option value="draft">Save as draft</option>
              {editing && <option value="completed">Completed</option>}
              {editing && <option value="cancelled">Cancelled</option>}
            </select>
          </label>

          <label className="full">
            Description
            <textarea rows="4" value={form.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="What kind of journey are you planning?" />
          </label>
        </div>

        <div className="choice-section">
          <strong>Interests</strong>
          <div className="choice-row">
            {tags.map((item) => (
              <button type="button" key={item} className={form.interests.includes(item) ? "choice selected" : "choice"} onClick={() => toggle("interests", item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="choice-section">
          <strong>Activities</strong>
          <div className="choice-row">
            {tags.map((item) => (
              <button type="button" key={item} className={form.activities.includes(item) ? "choice selected" : "choice"} onClick={() => toggle("activities", item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="actions">
          <button className="button" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create trip"}
          </button>
          <button type="button" className="button button-light" onClick={() => nav("/my-trips")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
