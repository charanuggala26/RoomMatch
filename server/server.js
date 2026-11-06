
import "dotenv/config";

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dns from "node:dns";
import http from "node:http";

import authRoutes from "./routes/auth.js";
import matchRoutes from "./routes/matches.js";
import groupRoutes from "./routes/groups.js";
import messageRoutes from "./routes/messages.js";
import { initRealtime } from "./realtime.js";

// Configure DNS before connecting to MongoDB
if (process.env.DNS_SERVERS) {
  const servers = process.env.DNS_SERVERS
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  dns.setServers(servers);
  console.log("DNS configured:", servers);
}

const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN || "http://localhost:5173";

const PORT = Number(process.env.PORT) || 5000;

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes);

// Central error handler
app.use((err, _req, res, _next) => {
  console.error("Application error:", err);

  res.status(err.status || 500).json({
    message: err.message || "Server error",
  });
});

// Environment validation
if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is missing from server/.env");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing from server/.env");
  process.exit(1);
}

// Database connection and server startup
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("MongoDB connected successfully");

    initRealtime(server, CLIENT_ORIGIN);

    server.listen(PORT, () => {
      console.log(
        `API + live updates running on http://localhost:${PORT}`
      );
    });

  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
