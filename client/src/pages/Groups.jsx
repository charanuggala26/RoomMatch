import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useHomesLive } from "../useLive.js";
import Avatar from "../components/Avatar.jsx";
import { Empty, Skeleton } from "../components/ui.jsx";
import { useToast } from "../Toast.jsx";

export default function Groups() {
  const toast = useToast();
  const [groups, setGroups] = useState(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [busy, setBusy] = useState("");

  const load = useCallback(() => api.groups().then((d) => setGroups(d.groups)).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  useHomesLive(() => { load(); toast("You were added to a home"); });

  const visibleGroups = useMemo(() => {
    if (!groups) return [];
    const q = query.trim().toLowerCase();
    const filtered = groups.filter((group) =>
      group.name.toLowerCase().includes(q) ||
      group.members.some((member) => member.name.toLowerCase().includes(q))
    );
    return sort === "name"
      ? [...filtered].sort((a, b) => a.name.localeCompare(b.name))
      : [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [groups, query, sort]);

  async function create(e) {
    e.preventDefault();
    setError("");
    setBusy("create");
    try { await api.createGroup(name.trim()); setName(""); toast("Home created"); load(); } catch (err) { setError(err.message); }
    finally { setBusy(""); }
  }
  async function join(e) {
    e.preventDefault();
    setError("");
    setBusy("join");
    try { await api.joinGroup(code.trim().toUpperCase()); setCode(""); toast("You joined the home"); load(); } catch (err) { setError(err.message); }
    finally { setBusy(""); }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>My homes</h1>
          <p className="muted">A home is the group you share bills with. Create one, or join with an invite code from a roommate.</p>
        </div>
        {groups && <span className="home-count">{groups.length} {groups.length === 1 ? "home" : "homes"}</span>}
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {!groups && <Skeleton rows={2} />}
      {groups?.length === 0 && (
        <Empty title="You're not in a home yet">Create one below, or ask a roommate for their invite code.</Empty>
      )}
      {groups?.length > 0 && (
        <>
          <div className="home-toolbar">
            <label className="home-search"><span className="sr-only">Search homes and roommates</span>
              <input type="search" placeholder="Search homes or roommates…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <label className="home-sort"><span className="sr-only">Sort homes</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recent">Recently added</option>
                <option value="name">Name, A to Z</option>
              </select>
            </label>
          </div>
          {visibleGroups.length > 0 ? <div className="panel divided homes-list">
          {visibleGroups.map((g) => (
            <Link className="home-row" to={`/groups/${g._id}`} key={g._id}>
              <span className="home-tile">⌂</span>
              <div className="home-info">
                <h3>{g.name}</h3>
                <p className="muted small">{g.members.length} {g.members.length === 1 ? "person" : "people"}</p>
              </div>
              <div className="faces" aria-label={`${g.members.length} home members`}>{g.members.slice(0, 5).map((m) => <Avatar key={m._id} name={m.name} size={34} />)}{g.members.length > 5 && <span className="face-more">+{g.members.length - 5}</span>}</div>
              <span className="home-open">Open home <span aria-hidden="true">↗</span></span>
            </Link>
          ))}
          </div> : <Empty title="No homes found">Try another home or roommate name.</Empty>}
        </>
      )}

      <div className="home-actions">
        <form className="panel stack" onSubmit={create}>
          <span className="home-action-icon">＋</span>
          <h3>Create a home</h3>
          <p className="muted small">Start a shared space and invite your roommates to join.</p>
          <label>Home name<input required placeholder="For example, Flat 302" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <button className="btn" disabled={busy !== "" || !name.trim()}>{busy === "create" ? "Creating…" : "Create home"}</button>
        </form>
        <form className="panel stack" onSubmit={join}>
          <span className="home-action-icon join">↗</span>
          <h3>Join a home</h3>
          <p className="muted small">Got an invite? Enter the code shared by someone in the home.</p>
          <label>Invite code<input required autoCapitalize="characters" maxLength={12} placeholder="For example, A1B2C3" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></label>
          <button className="btn quiet" disabled={busy !== "" || !code.trim()}>{busy === "join" ? "Joining…" : "Join home"}</button>
        </form>
      </div>
    </div>
  );
}
