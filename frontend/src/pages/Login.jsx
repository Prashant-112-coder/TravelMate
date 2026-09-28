import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "../lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue your Travel Mate journey.">
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" required minLength="6" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        {error && <p className="form-error">{error}</p>}
        <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <p className="auth-switch">New to Travel Mate? <Link to="/register">Create an account</Link></p>
      </form>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children }) {
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">TRAVEL MATE</p><h1>{title}</h1><p className="lead">{subtitle}</p>{children}</section></main>;
}
