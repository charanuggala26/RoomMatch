import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import Overlap from "../components/Overlap.jsx";
import Avatar from "../components/Avatar.jsx";
import { Modal, Empty, Skeleton } from "../components/ui.jsx";
import { useToast } from "../Toast.jsx";

const band = (s) => (s >= 75 ? "high" : s >= 50 ? "mid" : "low");
const VERDICT_WORD = { great: "Good fit", okay: "Some difference", clash: "Likely clash" };

function WhyModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.explain(userId).then(setData).catch((e) => setError(e.message));
  }, [userId]);

  return (
    <Modal onClose={onClose} labelledBy="why-title">
      {error && <p className="error" role="alert">{error}</p>}
      {!data && !error && <Skeleton rows={3} />}
      {data && (
        <>
          <div className="why-head">
            <Overlap score={data.score} size={88} />
            <h2 id="why-title">Why you and {data.user.name} are {data.score}% compatible</h2>
            <div className="why-legend">
              <span><i style={{ background: "var(--teal)" }} />You</span>
              <span><i style={{ background: "var(--marigold)" }} />{data.user.name.split(" ")[0]}</span>
            </div>
          </div>

          <div className="summary">
            {data.strengths.length > 0 && <p><b>Works well:</b> {data.strengths.join(", ")}.</p>}
            {data.concerns.length > 0 && <p><b>Talk about before moving in:</b> {data.concerns.join(", ")}.</p>}
          </div>

          {data.breakdown.map((f) => (
            <div className="factor" key={f.key}>
              <div className="factor-top">
                <b>{f.label} <span className={`tag ${f.verdict === "clash" ? "warn" : ""}`}>{VERDICT_WORD[f.verdict]}</span></b>
                <span className="pts">{f.points} / {f.weight}</span>
              </div>
              <div className="meter" role="img" aria-label={`${Math.round(f.similarity * 100)}% similar`}>
                <i className={f.verdict} style={{ width: `${f.similarity * 100}%` }} />
              </div>
              <div className="pair">
                <span><em>You</em>{f.yours}</span>
                <span><em>{data.user.name.split(" ")[0]}</em>{f.theirs}</span>
              </div>
              <p className="muted small">{f.note}</p>
            </div>
          ))}
        </>
      )}
    </Modal>
  );
}

function EmailModal({ match, onClose }) {
  const toast = useToast();
  const [subject, setSubject] = useState("Roommate enquiry via RoomMatch");
  const [message, setMessage] = useState(`Hi ${match.name},\\n\\nI found your profile on RoomMatch and would like to discuss whether we could be compatible roommates. Let me know if you are interested.\\n\\nThanks!`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api.sendEmail(match.id, { subject, message }); toast("Email sent"); onClose(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <Modal onClose={onClose} labelledBy="email-title">
    <form className="stack" onSubmit={submit}>
      <h2 id="email-title">Email {match.name}</h2>
      <p className="muted small">Sent to {match.email} using the RoomMatch email service.</p>
      <label>Subject<input required maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
      <label>Message<textarea required rows={6} maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions"><button className="btn" disabled={busy}>{busy ? "Sending…" : "Send email"}</button><button type="button" className="btn quiet" onClick={onClose}>Cancel</button></div>
    </form>
  </Modal>;
}

function MatchMeta({ m }) {
  return (
    <div className="match-meta">
      {m.strengths.slice(0, 3).map((s) => <span className="tag" key={s}>{s}</span>)}
      {m.concerns.slice(0, 2).map((s) => <span className="tag warn" key={s}>{s}</span>)}
    </div>
  );
}

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("score");
  const [emailMatch, setEmailMatch] = useState(null);
  const [homeNotice, setHomeNotice] = useState("");

  useEffect(() => {
    if (!user.profileComplete) return;
    api.matches().then((d) => { setMatches(d.matches); setHomeNotice(d.message || ""); }).catch((e) => setError(e.message));
  }, [user.profileComplete]);

  const visible = useMemo(() => {
    if (!matches) return [];
    const q = query.trim().toLowerCase();
    const list = matches.filter((m) => !q || m.name.toLowerCase().includes(q) || (m.location || "").toLowerCase().includes(q));
    return sort === "name" ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
  }, [matches, query, sort]);

  if (!user.profileComplete) {
    return (
      <div className="page">
        <div className="empty">
          <h2>Set your preferences first</h2>
          <p>Matches are ranked by how closely other students' lifestyles line up with yours.</p>
          <Link className="btn" to="/preferences">Set preferences</Link>
        </div>
      </div>
    );
  }

  const top = matches?.[0];
  const showTop = top && !query && sort === "score";
  const rest = showTop ? visible.slice(1) : visible;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Your matches</h1>
          <p className="muted">Ranked by how much your lifestyles overlap. Open any match to see exactly why.</p>
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {homeNotice && <div className="preferences-note"><span>⌂</span><p><b>Already in a home?</b> {homeNotice} Set your planned move-out date (within the next 90 days) in <Link to="/preferences">Preferences</Link>. You won't be shown as looking for another home until then.</p></div>}
      {!matches && !error && <Skeleton rows={4} />}

      {matches && matches.length === 0 && (
        <Empty title="No other students yet">
          Share RoomMatch with friends. Once they save their preferences, they'll show up here.
        </Empty>
      )}

      {showTop && (
        <section className="match-top" aria-label="Best match">
          <Overlap score={top.score} size={96} />
          <div>
            <p className="muted small">Best match</p>
            <h2>{top.name}</h2>
            <p className="muted">{top.location || "Area not set"}, {top.score}% in common</p>
            <MatchMeta m={top} />
            <div className="actions">
              <button className="btn" onClick={() => setOpen(top.id)}>Why are we compatible?</button>
              <Link className="btn quiet" to={`/chat?with=${top.id}`}>Chat</Link>
              <button className="btn quiet" onClick={() => setEmailMatch(top)}>Email</button>
            </div>
          </div>
        </section>
      )}

      {matches && matches.length > 1 && (
        <div className="toolbar">
          <input type="search" aria-label="Search matches" placeholder="Search by name or area" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select aria-label="Sort matches" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="score">Highest match first</option>
            <option value="name">Name, A to Z</option>
          </select>
        </div>
      )}

      {matches && query && visible.length === 0 && (
        <Empty title="No one matches that search">Try a different name or area.</Empty>
      )}

      {rest.length > 0 && (
        <div className="panel divided" style={{ padding: "0 1.3rem" }}>
          {rest.map((m) => (
            <div className="match-row" key={m.id}>
              <Avatar name={m.name} size={44} />
              <div>
                <div className="name">{m.name}</div>
                <p className="muted small">{m.location || "Area not set"}{m.availableFrom ? ` · Available ${new Date(m.availableFrom).toLocaleDateString()}` : " · Looking for a home now"}</p>
                <MatchMeta m={m} />
              </div>
              <Overlap score={m.score} size={34} animate={false} />
              <div className={`score ${band(m.score)}`}>{m.score}<small>%</small></div>
              <div className="match-actions">
                <button className="btn quiet sm" onClick={() => setOpen(m.id)}>Why compatible?</button>
                <Link className="btn quiet sm" to={`/chat?with=${m.id}`}>Chat</Link>
                <button className="btn quiet sm" onClick={() => setEmailMatch(m)}>Email</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <WhyModal userId={open} onClose={() => setOpen(null)} />}
      {emailMatch && <EmailModal match={emailMatch} onClose={() => setEmailMatch(null)} />}
    </div>
  );
}
