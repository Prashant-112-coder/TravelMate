import { useNavigate } from "react-router-dom";
import { signOut } from "../lib/auth";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-card">
        <p className="eyebrow">TRAVEL MATE</p>
        <h1>Your secure dashboard</h1>
        <p className="lead">You are signed in as <strong>{user?.email}</strong>.</p>
        <div className="status-grid">
          <div><strong>Authentication</strong><span>Supabase Auth ✓</span></div>
          <div><strong>Session</strong><span>Persistent browser session ✓</span></div>
          <div><strong>Profile</strong><span>Auto-created by database trigger ✓</span></div>
          <div><strong>Authorization</strong><span>Protected route ✓</span></div>
        </div>
        <button onClick={handleLogout}>Log out</button>
      </section>
    </main>
  );
}
