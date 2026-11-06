const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  register: (b) => request("/auth/register", { method: "POST", body: b }),
  login: (b) => request("/auth/login", { method: "POST", body: b }),
  me: () => request("/auth/me"),
  savePreferences: (b) => request("/auth/preferences", { method: "PUT", body: b }),

  matches: () => request("/matches"),
  explain: (userId) => request(`/matches/${userId}/explain`),
  contacts: () => request("/messages/contacts"),
  conversation: (userId) => request(`/messages/${userId}`),
  sendMessage: (userId, body) => request(`/messages/${userId}`, { method: "POST", body: { body } }),
  sendEmail: (userId, body) => request(`/messages/${userId}/email`, { method: "POST", body }),

  groups: () => request("/groups"),
  createGroup: (name) => request("/groups", { method: "POST", body: { name } }),
  joinGroup: (inviteCode) => request("/groups/join", { method: "POST", body: { inviteCode } }),
  group: (id) => request(`/groups/${id}`),
  addMember: (id, email) => request(`/groups/${id}/members`, { method: "POST", body: { email } }),
  leaveGroup: (id) => request(`/groups/${id}/members/me`, { method: "DELETE" }),
  addExpense: (id, b) => request(`/groups/${id}/expenses`, { method: "POST", body: b }),
  deleteExpense: (id, eid) => request(`/groups/${id}/expenses/${eid}`, { method: "DELETE" }),
  settle: (id, b) => request(`/groups/${id}/settlements`, { method: "POST", body: b }),
};
