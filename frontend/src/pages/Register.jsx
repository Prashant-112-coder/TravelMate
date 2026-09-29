import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "../lib/auth";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: "", email: "", password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { session } = await signUp(form);
      if (session) {
        navigate("/dashboard", { replace: true });
      } else {
        setMessage("Account created. Check your email if email confirmation is enabled, then sign in.");
      }
    } catch (err) {
      setError(err.message || "Unable to create your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><span className="auth-brand-mark">⌖</span><span className="auth-brand-name">Travel <b>Mate</b></span></div>
        <p className="eyebrow">TRAVEL MATE</p>
        <h1>Create your account</h1>
        <p className="lead">Start building your solo-travel profile securely.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Display name<input required maxLength="80" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label>
          <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input type="password" required minLength="6" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <label>Confirm password<input type="password" required minLength="6" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></label>
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}
          <button disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
          <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
        </form>
      </section>
    </main>
  );
}
