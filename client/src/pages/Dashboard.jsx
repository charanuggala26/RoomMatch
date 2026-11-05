import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import Overlap from "../components/Overlap.jsx";
import { Skeleton, Empty, inr } from "../components/ui.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState(null);
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.groups().then(d => setGroups(d.groups)).catch(e => setError(e.message));
    if (user.profileComplete) api.matches().then(d => setMatches(d.matches)).catch(e => setError(e.message));
  }, [user.profileComplete]);
  const stats = useMemo(() => {
    const homes = groups || [];
    return { homes: homes.length, people: homes.reduce((n,g)=>n+(g.members?.length||0),0) };
  }, [groups]);
  const firstName = user.name?.trim().split(/\s+/)[0] || "there";
  return <div className="page dashboard">
    <header className="dash-hero">
      <div><span className="eyebrow">YOUR ROOMMATCH SPACE</span><h1>Good to see you, {firstName}.</h1>
      <p>Find your people, organise shared living, and keep every rupee in check.</p></div>
      <div className="hero-orbit"><span>RM</span><i/><i/><i/></div>
    </header>
    {error && <p className="error" role="alert">{error}</p>}
    <section className="stat-grid">
      <article className="stat-card"><span className="stat-icon">⌂</span><span className="stat-label">Your homes</span><strong>{groups ? stats.homes : "—"}</strong><small>Shared living spaces</small></article>
      <article className="stat-card"><span className="stat-icon">♧</span><span className="stat-label">Community</span><strong>{groups ? stats.people : "—"}</strong><small>People across your homes</small></article>
      <article className="stat-card"><span className="stat-icon">✳</span><span className="stat-label">Profile status</span><strong>{user.profileComplete ? "Ready" : "Setup"}</strong><small>{user.profileComplete ? "Discover compatible roommates" : "Complete your lifestyle profile"}</small></article>
      <article className="stat-card"><span className="stat-icon">◎</span><span className="stat-label">Your matches</span><strong>{matches ? matches.length : "—"}</strong><small>People ranked for your lifestyle</small></article>
    </section>
    <div className="dash-columns">
      <section className="panel dash-panel">
        <div className="section-heading"><div><span className="eyebrow">DISCOVER</span><h2>Roommate matches</h2></div><Link to="/matches" className="text-btn">View all ↗</Link></div>
        {!user.profileComplete ? <div className="callout"><div className="callout-symbol">✦</div><div><b>Your profile is waiting</b><p className="muted small">Set your lifestyle preferences to see people who could be a great fit.</p><Link className="btn sm" to="/preferences">Complete profile</Link></div></div> :
          !matches ? <Skeleton rows={2}/> : matches.length === 0 ? <Empty title="No matches yet">New people will appear here as they join RoomMatch.</Empty> :
          <div className="dash-match-list">{matches.slice(0,3).map(m=><Link className="dash-match" to="/matches" key={m.id}><Avatar name={m.name} size={42}/><span className="dash-match-name"><b>{m.name}</b><small>{m.location || "Location not set"}</small></span><Overlap score={m.score} size={42} animate={false}/></Link>)}</div>}
      </section>
      <section className="panel dash-panel">
        <div className="section-heading"><div><span className="eyebrow">SHARED LIVING</span><h2>Your homes</h2></div><Link to="/groups" className="text-btn">Manage ↗</Link></div>
        {!groups ? <Skeleton rows={2}/> : groups.length === 0 ? <Empty title="No home added">Create a home or join one with an invite code.</Empty> :
          <div className="dash-home-list">{groups.slice(0,3).map(g=><Link to={`/groups/${g._id}`} className="dash-home" key={g._id}><span className="home-glyph">⌂</span><span><b>{g.name}</b><small>{g.members.length} {g.members.length===1?"member":"members"}</small></span><span className="arrow">↗</span></Link>)}</div>}
        <Link to="/groups" className="btn quiet block" style={{marginTop:"1rem"}}>＋ Create or join a home</Link>
      </section>
    </div>
    <section className="quick-grid">
      <Link to="/matches" className="quick-card"><span>✧</span><div><b>Find a roommate</b><small>Explore compatibility scores and insights</small></div><i>↗</i></Link>
      <Link to="/preferences" className="quick-card"><span>⚙</span><div><b>Update preferences</b><small>Keep your lifestyle profile up to date</small></div><i>↗</i></Link>
      <Link to="/groups" className="quick-card"><span>₹</span><div><b>Split your expenses</b><small>Track bills and settle up with roommates</small></div><i>↗</i></Link>
    </section>
  </div>;
}
