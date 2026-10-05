import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const factorLabels = [
  ["destination", "Destination"],
  ["dates", "Dates"],
  ["budget", "Budget"],
  ["travelStyle", "Travel style"],
  ["interests", "Interests"],
  ["activities", "Activities"],
];

export default function TravellerProfile() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const sourceTripId = params.get("tripId") || "";
  const candidateTripId = params.get("candidateTripId") || "";

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [match, setMatch] = useState(null);
  const [requestState, setRequestState] = useState("idle");
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      apiFetch("/profile/public/" + id),
      apiFetch("/explore/profile/" + id + "/posts"),
      apiFetch("/requests"),
    ])
      .then(async ([profileResponse, postsResponse, requestsResponse]) => {
        if (!active) return;

        setProfile(profileResponse.profile);
        setPosts(postsResponse.posts || []);

        const existing = (requestsResponse.requests || []).find(
          (item) =>
            user?.id &&
            (item.sender_id === user.id || item.receiver_id === user.id) &&
            (item.sender_id === id || item.receiver_id === id) &&
            ["pending", "accepted"].includes(item.status)
        );

        if (existing) {
          setRequestState(existing.status);
        }

        if (sourceTripId && candidateTripId) {
          setMatchLoading(true);
          try {
            const discoverResponse = await apiFetch(
              "/discover?tripId=" + encodeURIComponent(sourceTripId)
            );
            const found = (discoverResponse.results || []).find(
              (item) => item.trip?.id === candidateTripId
            );
            if (active) setMatch(found || null);
          } finally {
            if (active) setMatchLoading(false);
          }
        }
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
  }, [id, sourceTripId, candidateTripId]);

  async function sendRequest() {
    if (!sourceTripId || !candidateTripId) {
      setError("Open this profile from Discover to send a trip-specific request.");
      return;
    }

    setRequestState("sending");
    setError("");

    try {
      await apiFetch("/requests", {
        method: "POST",
        body: JSON.stringify({
          trip_id: candidateTripId,
          source_trip_id: sourceTripId,
        }),
      });
      setRequestState("pending");
    } catch (e) {
      setError(e.message);
      setRequestState("idle");
    }
  }

  if (loading) {
    return (
      <div className="content-wrap">
        <section className="empty-state-card"><h2>Loading traveller profile…</h2></section>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="content-wrap">
        <button className="button button-light" onClick={() => nav(-1)}>← Back</button>
        <section className="empty-state-card error-text">
          <h2>Profile unavailable</h2>
          <p>{error}</p>
          <button className="button" onClick={() => nav("/discover")}>Back to Discover</button>
        </section>
      </div>
    );
  }

  const initials = (profile?.display_name || "Traveller").slice(0, 1).toUpperCase();

  return (
    <div className="content-wrap">
      <button className="button button-light" onClick={() => nav(-1)}>← Back</button>

      {error && <p className="form-error">{error}</p>}

      <section className="traveller-profile">
        <div
          className="traveller-profile-cover"
          style={
            profile?.background_url || profile?.avatar_url
              ? { backgroundImage: `url("${profile.background_url || profile.avatar_url}")` }
              : undefined
          }
        >
          <span className="profile-cover-label">TRAVELLER PROFILE</span>
        </div>

        <div className="traveller-profile-body">
          <div className="traveller-profile-head">
            <div className="mini-avatar profile-avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name || "Traveller"} />
              ) : initials}
            </div>
            <div>
              <p className="eyebrow">TRAVELLER</p>
              <h1>{profile?.display_name || "Traveller"}</h1>
              <p>{profile?.home_city || "Location private"} · {profile?.travel_style || "Travel style not set"}</p>
            </div>
          </div>

          <p className="profile-bio">
            {profile?.bio || "This traveller has not added a bio yet."}
          </p>

          <div className="profile-sections">
            <div>
              <h3>Interests</h3>
              <div className="tag-list">
                {(profile?.interests || []).map((item) => <span key={item}>{item}</span>)}
              </div>
            </div>
            <div>
              <h3>Activities</h3>
              <div className="tag-list">
                {(profile?.activities || []).map((item) => <span key={item}>{item}</span>)}
              </div>
            </div>
          </div>

          {matchLoading ? (
            <section className="profile-match-card">
              <strong>Checking trip compatibility…</strong>
              <span>Comparing the selected trip with this traveller's open trip.</span>
            </section>
          ) : match ? (
            <section className="profile-match-card">
              <div className="profile-match-summary">
                <div>
                  <span className="section-kicker">TRIP COMPATIBILITY</span>
                  <h2>{match.compatibility}% match</h2>
                  <p>{match.trip.destination} · {new Date(match.trip.start_date).toLocaleDateString()} – {new Date(match.trip.end_date).toLocaleDateString()}</p>
                </div>
                <div className="profile-match-actions">
                  {requestState === "accepted" ? (
                    <Link className="button" to="/messages">Matched · Message →</Link>
                  ) : (
                    <button className="button" disabled={requestState === "sending" || requestState === "pending"} onClick={sendRequest}>
                      {requestState === "sending" ? "Sending…" : requestState === "pending" ? "Request sent" : "Send request"}
                    </button>
                  )}
                </div>
              </div>

              <div className="profile-match-factors">
                {factorLabels.map(([key, label]) => (
                  <div key={key}>
                    <span>{label}</span>
                    <strong>+{match.breakdown?.[key] ?? 0}</strong>
                  </div>
                ))}
              </div>

              {match.missing?.length > 0 && (
                <small className="profile-match-note">
                  Optional data missing: {match.missing.join(", ")}.
                </small>
              )}
            </section>
          ) : (
            <section className="profile-match-card profile-match-unavailable">
              <strong>No active trip match in this view</strong>
              <span>Return to Discover to choose a trip and see the compatibility calculation.</span>
              <Link className="button button-light" to="/discover">Back to Discover</Link>
            </section>
          )}
        </div>
      </section>

      <section className="profile-card public-posts">
        <div className="card-heading">
          <div>
            <span className="section-kicker">TRAVEL MEMORIES</span>
            <h2>Recent travel posts</h2>
          </div>
        </div>
        {posts.length === 0 ? (
          <p className="muted">No optional travel posts shared yet.</p>
        ) : (
          <div className="post-grid">
            {posts.map((item) => (
              <article className="travel-post" key={item.id}>
                <img src={item.image_url} alt={item.destination || "Travel memory"} />
                <div>
                  <strong>{item.destination || "Travel memory"}</strong>
                  <p>{item.caption}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
