import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import { Empty, Skeleton } from "../components/ui.jsx";
import { useToast } from "../Toast.jsx";

export default function Chat() {
  const { user } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [contacts, setContacts] = useState(null);
  const [active, setActive] = useState(params.get("with") || "");
  const [thread, setThread] = useState(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadContacts = useCallback(() => api.contacts().then((d) => setContacts(d.contacts)).catch((e) => setError(e.message)), []);
  const loadThread = useCallback(() => {
    if (!active) return;
    api.conversation(active).then((d) => setThread(d)).catch((e) => setError(e.message));
  }, [active]);

  useEffect(() => { loadContacts(); }, [loadContacts]);
  useEffect(() => { loadThread(); const timer = setInterval(loadThread, 4000); return () => clearInterval(timer); }, [loadThread]);

  async function send(event) {
    event.preventDefault();
    if (!body.trim() || !active) return;
    setBusy(true); setError("");
    try { await api.sendMessage(active, body.trim()); setBody(""); loadThread(); loadContacts(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return <div className="page chat-page">
    <div className="page-head"><div><h1>Messages</h1><p className="muted">Talk directly with people you are considering as roommates.</p></div></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="chat-layout panel">
      <aside className="chat-contacts">
        <h3>Conversations</h3>
        {!contacts ? <Skeleton rows={3}/> : contacts.length === 0 ? <p className="muted small">No conversations yet. Start one from a match.</p> :
          contacts.map((c) => <button key={c._id} className={`chat-contact ${active === c._id ? "active" : ""}`} onClick={() => setActive(c._id)}><Avatar name={c.name} size={38}/><span><b>{c.name}</b><small>{c.email}</small></span></button>)}
      </aside>
      <section className="chat-thread">
        {!active ? <Empty title="Choose a conversation">Open a match and select Chat to start talking.</Empty> :
          !thread ? <Skeleton rows={4}/> : <>
            <header className="chat-thread-head"><Avatar name={thread.contact.name} size={38}/><span><b>{thread.contact.name}</b><small>{thread.contact.email}</small></span></header>
            <div className="chat-messages">
              {thread.messages.length === 0 ? <p className="muted small">Say hello and introduce yourself.</p> : thread.messages.map((m) => <div key={m._id} className={`chat-bubble ${String(m.from) === String(user.id) ? "mine" : ""}`}><p>{m.body}</p><small>{new Date(m.createdAt).toLocaleString()}</small></div>)}
            </div>
            <form className="chat-compose" onSubmit={send}><input maxLength={4000} placeholder="Write a message…" value={body} onChange={(e) => setBody(e.target.value)}/><button className="btn" disabled={busy || !body.trim()}>{busy ? "Sending…" : "Send"}</button></form>
          </>}
      </section>
    </div>
  </div>;
}
