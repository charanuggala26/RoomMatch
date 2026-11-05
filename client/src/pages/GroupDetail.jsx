import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { useGroupLive } from "../useLive.js";
import { useToast } from "../Toast.jsx";
import Avatar from "../components/Avatar.jsx";
import Icon from "../components/Icon.jsx";
import { Empty, Skeleton, inr } from "../components/ui.jsx";

const CATS = [
  ["rent", "Rent", "#0e7c7b"],
  ["electricity", "Electricity", "#f0a22e"],
  ["wifi", "Wi-Fi", "#4a6fa5"],
  ["grocery", "Groceries", "#7a8f3c"],
  ["shared", "Shared purchases", "#8a5a8c"],
  ["other", "Other", "#d8503f"],
];
const CAT = Object.fromEntries(CATS.map(([k, label, color]) => [k, { label, color }]));
const EPS = 0.009;

function eventText(e) {
  switch (e.type) {
    case "expense:added": return `${e.by} added ${e.title} (${inr(e.amount)})`;
    case "expense:deleted": return `${e.by} removed ${e.title}`;
    case "settlement:added": return `${e.by} paid ${e.to} ${inr(e.amount)}`;
    case "member:joined": return `${e.by} joined the home`;
    default: return "This home was updated";
  }
}

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("balances");
  const [inviteEmail, setInviteEmail] = useState("");
  const [form, setForm] = useState({ title: "", category: "grocery", amount: "", splitType: "equal" });
  const [included, setIncluded] = useState(null);
  const [custom, setCustom] = useState({});
  const [expenseQuery, setExpenseQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [expenseSort, setExpenseSort] = useState("newest");

  const load = useCallback(
    () => api.group(id).then(setData).catch((e) => setError(e.message)),
    [id]
  );
  useEffect(() => { load(); }, [load]);

  // Anyone's change refreshes this screen at once; others' changes also show a toast
  const live = useGroupLive(id, (e) => {
    if (e.by !== user.name) toast(eventText(e));
    load();
  });

  const nameOf = useMemo(() => {
    const m = Object.fromEntries((data?.group.members || []).map((x) => [x.id, x.name]));
    return (uid) => (uid === user.id ? "You" : m[uid] || "Someone");
  }, [data, user.id]);

  if (error && !data) return <div className="page"><p className="error" role="alert">{error}</p></div>;
  if (!data) return <div className="page"><Skeleton rows={3} /></div>;

  const { group, expenses, balances, transfers, pairs, totalsByCategory } = data;
  const selected = included ?? group.members.map((m) => m.id);
  const myBalance = balances.find((b) => b.user === user.id)?.net ?? 0;
  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const myTransfers = transfers.filter((t) => t.from === user.id || t.to === user.id);
  const amountValue = Number(form.amount) || 0;
  const customShares = group.members.map((m) => ({ user: m.id, share: Number(custom[m.id] || 0) }));
  const customTotal = customShares.reduce((sum, share) => sum + share.share, 0);
  const splitError = form.splitType === "custom"
    ? amountValue > 0 && Math.abs(customTotal - amountValue) > EPS
      ? `Custom shares must total ${inr(amountValue)} (currently ${inr(customTotal)}).`
      : ""
    : selected.length === 0 ? "Choose at least one roommate to split this expense with." : "";
  const splitPreview = form.splitType === "equal"
    ? selected.length > 0 && amountValue > 0 ? amountValue / selected.length : 0
    : null;

  const run = (fn, okMessage) => async () => {
    setError("");
    try { await fn(); if (okMessage) toast(okMessage); load(); } catch (err) { setError(err.message); }
  };

  async function addExpense(e) {
    e.preventDefault();
    setError("");
    try {
      const body = { title: form.title, category: form.category, amount: Number(form.amount), splitType: form.splitType };
      if (form.splitType === "custom") {
        body.customShares = customShares;
      } else {
        body.splitBetween = selected;
      }
      if (splitError) {
        setError(splitError);
        return;
      }
      await api.addExpense(id, body);
      toast(`Added ${form.title}`);
      setForm({ ...form, title: "", amount: "" });
      setCustom({});
      load();
    } catch (err) { setError(err.message); }
  }

  async function copyCode() {
    try { await navigator.clipboard.writeText(group.inviteCode); toast("Invite code copied"); }
    catch { toast(`Invite code: ${group.inviteCode}`); }
  }

  const catEntries = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1]);
  const visibleExpenses = expenses
    .filter((e) => `${e.title} ${e.category} ${nameOf(e.paidBy)}`.toLowerCase().includes(expenseQuery.trim().toLowerCase()))
    .filter((e) => categoryFilter === "all" || e.category === categoryFilter)
    .filter((e) => {
      if (periodFilter === "all") return true;
      const date = new Date(e.date);
      const now = new Date();
      if (periodFilter === "month") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return date.getMonth() === previousMonth.getMonth() && date.getFullYear() === previousMonth.getFullYear();
    })
    .sort((a, b) => {
      if (expenseSort === "oldest") return new Date(a.date) - new Date(b.date);
      if (expenseSort === "amount") return b.amount - a.amount;
      return new Date(b.date) - new Date(a.date);
    });
  const filteredTotal = visibleExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  function exportExpenses() {
    const rows = [["Title", "Category", "Amount (INR)", "Paid by", "Date", "Split count"], ...visibleExpenses.map((e) => [e.title, e.category, e.amount, nameOf(e.paidBy), new Date(e.date).toLocaleDateString("en-IN"), e.splits.length])];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${group.name.replace(/[^a-z0-9-_]+/gi, "-")}-expenses.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="page">
      <div className="group-head">
        <div>
          <Link to="/groups" className="crumb">My homes</Link>
          <h1 style={{ marginTop: "0.3rem" }}>{group.name}</h1>
          <p style={{ marginTop: "0.5rem" }} aria-live="polite">
            <span className={live ? "live on" : "live"}><i />{live ? "Live: updates appear instantly" : "Reconnecting…"}</span>
          </p>
        </div>
        <div className="code">
          <span className="muted small">Invite code</span> <b>{group.inviteCode}</b>
          <button className="icon-btn" onClick={copyCode} aria-label="Copy invite code"><Icon name="copy" size={18} /></button>
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <section className="ledger" aria-label="Your balance">
        <h2>
          {myBalance < -EPS && <>You owe <span className="neg">{inr(-myBalance)}</span></>}
          {myBalance > EPS && <>You're owed <span className="pos">{inr(myBalance)}</span></>}
          {Math.abs(myBalance) <= EPS && <>You're all settled up</>}
        </h2>
        <p className="muted">
          {inr(total)} spent so far by {group.members.length} {group.members.length === 1 ? "person" : "people"}.
        </p>
      </section>

      <div className="tabs" role="tablist">
        {[["balances", "Balances"], ["expenses", "Expenses"], ["people", "People"]].map(([k, label]) => (
          <button key={k} role="tab" className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "balances" && (
        <>
          <section className="panel">
            <h3>Who pays whom</h3>
            {transfers.length === 0 && <p className="muted">Nobody owes anything right now.</p>}
            <div className="divided">
              {transfers.map((t, i) => (
                <div className="transfer" key={i}>
                  <span>
                    <b>{nameOf(t.from)}</b> {t.from === user.id ? "pay" : "pays"} <b>{nameOf(t.to)}</b>
                  </span>
                  <span className="list-main">
                    <span className="amt">{inr(t.amount)}</span>
                    {t.from === user.id && (
                      <button className="btn sm quiet" onClick={run(() => api.settle(id, { to: t.to, amount: t.amount }), "Payment recorded")}>
                        Mark as paid
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {myTransfers.length === 0 && transfers.length > 0 && <p className="muted small" style={{ marginTop: "0.6rem" }}>None of these involve you.</p>}
          </section>

          <section className="panel">
            <h3>Everyone's balance</h3>
            <div className="divided">
              {balances.map((b) => (
                <div className="list-row" key={b.user}>
                  <span className="list-main"><Avatar name={nameOf(b.user) === "You" ? user.name : nameOf(b.user)} size={34} />{nameOf(b.user)}</span>
                  <span className={b.net < -EPS ? "neg" : b.net > EPS ? "pos" : "muted"}>
                    {b.net > EPS ? `Gets ${inr(b.net)}` : b.net < -EPS ? `Owes ${inr(-b.net)}` : "Settled"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {catEntries.length > 0 && (
            <section className="panel">
              <h3>Where the money went</h3>
              <div className="stacked" role="img" aria-label="Spending by category">
                {catEntries.map(([c, v]) => <i key={c} style={{ width: `${(v / total) * 100}%`, background: CAT[c]?.color }} />)}
              </div>
              <div className="legend">
                {catEntries.map(([c, v]) => (
                  <div className="legend-row" key={c}>
                    <i style={{ background: CAT[c]?.color }} />
                    <span>{CAT[c]?.label || c}</span>
                    <b>{inr(v)}</b>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {tab === "expenses" && (
        <>
          <form className="panel stack" onSubmit={addExpense}>
            <h3>Add an expense</h3>
            <div className="row expense-form-row">
              <label>What was it for?
                <input required placeholder="For example, November rent" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </label>
              <label>Category
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </label>
              <label>Amount (₹)
                <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </label>
            </div>

            <div>
              <span className="field-label">How to split</span>
              <div className="chips">
                <button type="button" className="chip" aria-pressed={form.splitType === "equal"} onClick={() => setForm({ ...form, splitType: "equal" })}>Equally</button>
                <button type="button" className="chip" aria-pressed={form.splitType === "custom"} onClick={() => setForm({ ...form, splitType: "custom" })}>Custom amounts</button>
              </div>
            </div>

            {form.splitType === "equal" ? (
              <div>
                <span className="field-label">Split between</span>
                <div className="split-row">
                  {group.members.map((m) => (
                    <label key={m.id} className="check">
                      <input type="checkbox" checked={selected.includes(m.id)}
                        onChange={(e) => setIncluded(e.target.checked ? [...selected, m.id] : selected.filter((x) => x !== m.id))} />
                      {nameOf(m.id)}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="row">
                {group.members.map((m) => (
                  <label key={m.id}>{nameOf(m.id)}
                    <input type="number" min="0" step="0.01" value={custom[m.id] ?? ""} onChange={(e) => setCustom({ ...custom, [m.id]: e.target.value })} />
                  </label>
                ))}
              </div>
            )}
            <div className={`split-preview${splitError ? " invalid" : ""}`} aria-live="polite">
              <span className="preview-icon">{splitError ? "!" : "✓"}</span>
              <span>
                <b>{splitError || (form.splitType === "equal"
                  ? splitPreview > 0 ? `${inr(splitPreview)} per person · ${selected.length} selected` : "Add an amount to preview the split"
                  : amountValue > 0 ? `${inr(customTotal)} assigned of ${inr(amountValue)}` : "Add an amount to preview the custom split")}</b>
                <small>{splitError ? "Update the split before saving." : "You paid this bill. Roommates owe their assigned share."}</small>
              </span>
            </div>
            <div><button className="btn" disabled={Boolean(splitError) || !form.title.trim() || amountValue <= 0}>Add expense</button></div>
          </form>

          <section className="panel">
            <div className="section-heading"><div><h3>Expense history</h3><p className="muted small">Search, filter and export a spreadsheet-ready CSV.</p></div><button type="button" className="btn quiet sm" onClick={exportExpenses} disabled={!visibleExpenses.length}>Export {visibleExpenses.length ? `${visibleExpenses.length} ` : ""}CSV ↓</button></div>
            <div className="expense-stats" aria-live="polite">
              <div><span>Showing</span><b>{visibleExpenses.length} <small>{visibleExpenses.length === 1 ? "expense" : "expenses"}</small></b></div>
              <div><span>Filtered total</span><b>{inr(filteredTotal)}</b></div>
              <div><span>Average bill</span><b>{visibleExpenses.length ? inr(filteredTotal / visibleExpenses.length) : inr(0)}</b></div>
            </div>
            <div className="expense-filters">
              <input type="search" aria-label="Search expenses" placeholder="Search title or payer…" value={expenseQuery} onChange={(e) => setExpenseQuery(e.target.value)} />
              <select aria-label="Filter by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All categories</option>
                {CATS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select aria-label="Filter by month" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
                <option value="all">All time</option><option value="month">This month</option><option value="previous">Last month</option>
              </select>
              <select aria-label="Sort expenses" value={expenseSort} onChange={(e) => setExpenseSort(e.target.value)}>
                <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount">Highest amount</option>
              </select>
            </div>
            {visibleExpenses.length === 0 && <p className="muted small" style={{paddingTop:"1rem"}}>No expenses match this search.</p>}
            {expenses.length === 0 && <Empty title="No expenses yet">Add the first one above and everyone's balance updates.</Empty>}
            <div className="divided">
              {visibleExpenses.map((e) => (
                <div className="exp-row" key={e._id}>
                  <div>
                    <b>{e.title}</b> <span className="tag" style={{ background: "transparent", border: `1px solid ${CAT[e.category]?.color}`, color: "var(--ink)" }}>{CAT[e.category]?.label}</span>
                    <p className="muted small">
                      {nameOf(e.paidBy)} paid on {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, split {e.splits.length} {e.splits.length === 1 ? "way" : "ways"}
                    </p>
                  </div>
                  <div className="exp-amt">
                    {inr(e.amount)}
                    {e.paidBy === user.id && (
                      <button className="icon-btn" aria-label={`Delete ${e.title}`} onClick={run(() => api.deleteExpense(id, e._id), "Expense deleted")}>
                        <Icon name="trash" size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === "people" && (
        <>
          <section className="panel">
            <h3>Roommates</h3>
            <div className="divided">
              {group.members.map((m) => (
                <div className="list-row" key={m.id}>
                  <span className="list-main"><Avatar name={m.name} size={38} /><div><b>{m.id === user.id ? `${m.name} (you)` : m.name}</b><p className="muted small">{m.email}</p></div></span>
                </div>
              ))}
            </div>
          </section>

          {pairs.length > 0 && (
            <section className="panel">
              <h3>How well you fit together</h3>
              <div className="divided">
                {pairs.map((p, i) => (
                  <div className="list-row" key={i}>
                    <span>{nameOf(p.a)} and {nameOf(p.b)}</span>
                    <b className="pts">{p.score}%</b>
                  </div>
                ))}
              </div>
            </section>
          )}

          <form className="panel stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.addMember(id, inviteEmail); setInviteEmail(""); }, "Roommate added")(); }}>
            <h3>Add a roommate</h3>
            <label>Their email
              <input type="email" required placeholder="They need a RoomMatch account" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </label>
            <div><button className="btn">Add roommate</button></div>
          </form>
        </>
      )}
    </div>
  );
}
