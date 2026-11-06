import { useEffect, useState } from "react";
import { Routes, Route, Navigate, NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import Avatar from "./components/Avatar.jsx";
import Icon from "./components/Icon.jsx";
import BrandMark from "./components/BrandMark.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Preferences from "./pages/Preferences.jsx";
import Matches from "./pages/Matches.jsx";
import Groups from "./pages/Groups.jsx";
import GroupDetail from "./pages/GroupDetail.jsx";
import Chat from "./pages/Chat.jsx";

function Shell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem("roommatch-theme") || "dark");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("roommatch-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const actions = [
    { label: "Overview", detail: "Your RoomMatch dashboard", path: "/dashboard", icon: "⌂" },
    { label: "Find matches", detail: "Discover compatible roommates", path: "/matches", icon: "✧" },
    { label: "Chat", detail: "Message potential roommates", path: "/chat", icon: "✉" },
    { label: "My homes", detail: "Manage shared homes and expenses", path: "/groups", icon: "▦" },
    { label: "Preferences", detail: "Update your lifestyle profile", path: "/preferences", icon: "⚙" },
  ];
  const filteredActions = actions.filter((action) =>
    `${action.label} ${action.detail}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="shell">
      <aside className="rail">
        <Link to="/matches" className="brand"><BrandMark /> RoomMatch</Link>
        <nav className="nav" aria-label="Main">
          <NavLink to="/dashboard" className="nav-link"><Icon name="homes" /> Overview</NavLink>
          <NavLink to="/matches" className="nav-link"><Icon name="matches" /> Matches</NavLink>
          <NavLink to="/chat" className="nav-link"><Icon name="matches" /> Chat</NavLink>
          <NavLink to="/groups" className="nav-link"><Icon name="homes" /> My homes</NavLink>
          <NavLink to="/preferences" className="nav-link"><Icon name="prefs" /> Preferences</NavLink>
        </nav>
        <div className="rail-foot">
          <div className="who"><Avatar name={user.name} size={34} /><span className="who-name">{user.name}</span></div>
          <button className="nav-link" onClick={logout}><Icon name="logout" /> Log out</button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <button className="palette-trigger" onClick={() => { setQuery(""); setPaletteOpen(true); }} aria-label="Open quick navigation">
            <Icon name="search" size={18} /><span>Jump to anything...</span><kbd>Ctrl K</kbd>
          </button>
          <button
            className="theme-toggle"
            onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
        {children}
      </main>
      {paletteOpen && (
        <div className="command-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaletteOpen(false); }}>
          <section className="command-panel" role="dialog" aria-modal="true" aria-labelledby="command-title">
            <h2 id="command-title" className="sr-only">Quick navigation</h2>
            <div className="command-search">
              <Icon name="search" size={20} />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Where do you want to go?" aria-label="Search navigation" />
              <kbd>ESC</kbd>
            </div>
            <div className="command-results">
              <span className="command-label">QUICK NAVIGATION</span>
              {filteredActions.map((action) => (
                <button className="command-action" key={action.path} onClick={() => { setPaletteOpen(false); navigate(action.path); }}>
                  <span className="command-icon">{action.icon}</span>
                  <span><b>{action.label}</b><small>{action.detail}</small></span>
                  <span className="command-enter">↵</span>
                </button>
              ))}
              {filteredActions.length === 0 && <p className="command-empty">No destinations found. Try “matches” or “homes”.</p>}
            </div>
            <div className="command-footer"><span>Navigate faster with <kbd>Ctrl</kbd> + <kbd>K</kbd></span><span>RoomMatch quick switcher</span></div>
          </section>
        </div>
      )}
    </div>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted" style={{ padding: "2rem" }}>Loading…</p>;
  if (!user) return <Navigate to="/auth" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route path="/auth" element={!loading && user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/preferences" element={<Protected><Preferences /></Protected>} />
      <Route path="/matches" element={<Protected><Matches /></Protected>} />
      <Route path="/chat" element={<Protected><Chat /></Protected>} />
      <Route path="/groups" element={<Protected><Groups /></Protected>} />
      <Route path="/groups/:id" element={<Protected><GroupDetail /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
