import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import { io as connect } from "socket.io-client";
import { initRealtime, emitUser } from "../realtime.js";

process.env.JWT_SECRET = "test-secret";

const server = http.createServer();
initRealtime(server, "http://localhost:5173");
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}`;

const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));

// 1. Bad / missing token is rejected
const bad = connect(url, { auth: { token: "nope" }, reconnection: false });
const err = await once(bad, "connect_error");
assert.equal(err.message, "unauthorized");
bad.close();

// 2. Valid token connects and receives events sent to its private user room
const token = jwt.sign({ id: "user123" }, process.env.JWT_SECRET);
const good = connect(url, { auth: { token }, reconnection: false });
await once(good, "connect");
const received = once(good, "groups:changed");
emitUser("user123", { groupId: "g1" });
assert.deepEqual(await received, { groupId: "g1" });

// 3. Events for other users never reach this socket
let leaked = false;
good.on("groups:changed", () => (leaked = true));
emitUser("someone-else", {});
await new Promise((r) => setTimeout(r, 150));
assert.equal(leaked, false);

good.close();
server.close();
console.log("realtime tests passed");
process.exit(0);
