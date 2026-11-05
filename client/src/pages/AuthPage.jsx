import { useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import Overlap from "../components/Overlap.jsx";
import BrandMark from "../components/BrandMark.jsx";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isLogin = mode === "login";

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      isLogin ? await login(form) : await register(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth-hero">
        <span className="brand"><BrandMark /> RoomMatch</span>
        <div>
          <div className="auth-mark"><Overlap score={78} size={96} label="Two roommates, 78% in common" /></div>
          <h1>Share a flat with someone who fits.</h1>
          <p>Tell us how you live. We rank other students by how much you have in common, then help you split rent and bills fairly.</p>
        </div>
        <p className="small" style={{ opacity: 0.8, margin: 0 }}>Sleep, food, cleanliness, noise, study habits, budget and area.</p>
      </section>

      <section className="auth-form">
        <form onSubmit={submit}>
          <div>
            <h2>{isLogin ? "Log in" : "Create your account"}</h2>
            <p className="muted" style={{ marginTop: "0.4rem" }}>
              {isLogin ? "Welcome back." : "It takes a minute. You'll set your preferences next."}
            </p>
          </div>
          {!isLogin && (
            <label>Full name<input required autoComplete="name" value={form.name} onChange={set("name")} /></label>
          )}
          <label>Email<input type="email" required autoComplete="email" value={form.email} onChange={set("email")} /></label>
          <label>Password
            <input type="password" required minLength={6} autoComplete={isLogin ? "current-password" : "new-password"} value={form.password} onChange={set("password")} />
            {!isLogin && <span className="hint">At least 6 characters.</span>}
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn block" disabled={busy}>{busy ? "Please wait…" : isLogin ? "Log in" : "Create account"}</button>
          <p className="muted small">
            {isLogin ? "New to RoomMatch?" : "Already have an account?"}{" "}
            <button type="button" className="text-btn" onClick={() => { setMode(isLogin ? "register" : "login"); setError(""); }}>
              {isLogin ? "Create an account" : "Log in"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}
