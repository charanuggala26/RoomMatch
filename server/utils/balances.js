// Expense math: net balance per user + simplified "who pays whom" list.

const round2 = (n) => Math.round(n * 100) / 100;

export function equalSplit(amount, userIds) {
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / userIds.length);
  let remainder = cents - base * userIds.length;
  return userIds.map((user) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return { user, share: (base + extra) / 100 };
  });
}

// net > 0  => the group owes this person; net < 0 => this person owes the group
export function computeBalances(memberIds, expenses, settlements) {
  const net = Object.fromEntries(memberIds.map((id) => [String(id), 0]));
  const add = (id, v) => {
    const k = String(id);
    if (k in net) net[k] += v;
  };

  for (const e of expenses) {
    add(e.paidBy, e.amount);
    for (const s of e.splits) add(s.user, -s.share);
  }
  for (const s of settlements) {
    add(s.from, s.amount); // paying off debt raises your balance
    add(s.to, -s.amount);
  }

  const balances = Object.entries(net).map(([user, v]) => ({ user, net: round2(v) }));

  // Greedy debt simplification
  const debtors = balances.filter((b) => b.net < -0.009).map((b) => ({ ...b })).sort((a, b) => a.net - b.net);
  const creditors = balances.filter((b) => b.net > 0.009).map((b) => ({ ...b })).sort((a, b) => b.net - a.net);
  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(-debtors[i].net, creditors[j].net);
    if (pay > 0.009) transfers.push({ from: debtors[i].user, to: creditors[j].user, amount: round2(pay) });
    debtors[i].net = round2(debtors[i].net + pay);
    creditors[j].net = round2(creditors[j].net - pay);
    if (Math.abs(debtors[i].net) < 0.01) i++;
    if (Math.abs(creditors[j].net) < 0.01) j++;
  }

  return { balances, transfers };
}
