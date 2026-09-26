import "dotenv/config";

import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "./firebase.js";

import {
  startSession,
  stopSession,
  logoutSession,
  getPublicStatus,
  getQr,
  listSessions,
  normalizeNumber,
  validNumber
} from "./sessionManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = Number(
  process.env.PORT || 3000
);

const WEB_PASSWORD =
  process.env.WEB_PASSWORD;

if (!WEB_PASSWORD) {
  console.error(
    "❌ WEB_PASSWORD is missing. Add it in Railway Variables."
  );

  process.exit(1);
}

app.disable("x-powered-by");

app.use(
  express.json({
    limit: "20kb"
  })
);

app.use(
  express.static(
    path.join(
      __dirname,
      "../public"
    )
  )
);

// ===============================
// AUTH + RATE LIMIT
// ===============================

const tokens = new Set();

const loginAttempts =
  new Map();

const actionAttempts =
  new Map();

function clientIp(req) {
  return (
    req.headers[
      "x-forwarded-for"
    ]
      ?.split(",")[0]
      ?.trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function rateLimit(
  map,
  key,
  max,
  windowMs
) {
  const now = Date.now();

  const old =
    map.get(key) || [];

  const fresh =
    old.filter(
      (time) =>
        now - time < windowMs
    );

  if (
    fresh.length >= max
  ) {
    map.set(
      key,
      fresh
    );

    return false;
  }

  fresh.push(now);

  map.set(
    key,
    fresh
  );

  return true;
}

// ===============================
// AUTH MIDDLEWARE
// ===============================

function auth(
  req,
  res,
  next
) {
  const header =
    req.headers.authorization ||
    "";

  const token =
    header.startsWith(
      "Bearer "
    )
      ? header.slice(7)
      : "";

  if (
    !token ||
    !tokens.has(token)
  ) {
    return res
      .status(401)
      .json({
        ok: false,
        error: "Unauthorized"
      });
  }

  next();
}

// ===============================
// HEALTH
// ===============================

app.get(
  "/api/health",
  (_req, res) => {
    res.json({
      ok: true,
      bot:
        process.env.BOT_NAME ||
        "Wonex-Mini",
      activeSessions:
        listSessions().length
    });
  }
);

// ===============================
// LOGIN
// ===============================

app.post(
  "/api/login",
  (req, res) => {
    const ip =
      clientIp(req);

    if (
      !rateLimit(
        loginAttempts,
        ip,
        5,
        10 * 60 * 1000
      )
    ) {
      return res
        .status(429)
        .json({
          ok: false,
          error:
            "Too many login attempts. Try again later."
        });
    }

    const password =
      String(
        req.body?.password ||
          ""
      );

    if (
      password.length !==
      WEB_PASSWORD.length
    ) {
      return res
        .status(401)
        .json({
          ok: false,
          error:
            "Wrong password."
        });
    }

    const passwordBuffer =
      Buffer.from(
        password
      );

    const webPasswordBuffer =
      Buffer.from(
        WEB_PASSWORD
      );

    if (
      !crypto.timingSafeEqual(
        passwordBuffer,
        webPasswordBuffer
      )
    ) {
      return res
        .status(401)
        .json({
          ok: false,
          error:
            "Wrong password."
        });
    }

    const token =
      crypto.randomBytes(
        32
      ).toString("hex");

    tokens.add(token);

    res.json({
      ok: true,
      token
    });
  }
);

// ===============================
// CONNECT WHATSAPP
// ===============================

app.post(
  "/api/connect",
  auth,
  async (req, res) => {
    const ip =
      clientIp(req);

    if (
