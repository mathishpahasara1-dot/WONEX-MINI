import fs from "node:fs/promises";
import path from "node:path";

import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";

import P from "pino";
import QRCode from "qrcode";

import config from "./config.js";
import { handleMessage } from "./handler.js";


const BASE_DIR = path.resolve(
  process.env.SESSIONS_DIR || "./sessions"
);

const MAX_SESSIONS = Math.max(
  1,
  Number.parseInt(
    process.env.MAX_SESSIONS || "10",
    10
  )
);


const sessions = new Map();


function normalizeNumber(value) {
  return String(value || "")
    .replace(/\D/g, "");
}


function validNumber(number) {
  return /^\d{8,15}$/.test(number);
}


function publicSession(session) {
  return {
    number: session.number,
    method: session.method,
    status: session.status,
    connected:
      session.status === "connected",
    pairingCode:
      session.pairingCode || null,
    hasQr:
      Boolean(session.qr),
    error:
      session.error || null,
    createdAt:
      session.createdAt
  };
}


async function ensureBaseDir() {
  await fs.mkdir(
    BASE_DIR,
    {
      recursive: true
    }
  );
}


async function startSession(
  number,
  method
) {

  await ensureBaseDir();


  number =
    normalizeNumber(number);


  if (!validNumber(number)) {
    throw new Error(
      "Enter a valid international number using digits only. Example: 9477XXXXXXXX."
    );
  }


  if (
    !["pairing", "qr"]
      .includes(method)
  ) {
    throw new Error(
      "Login method must be pairing or qr."
    );
  }


  const existing =
    sessions.get(number);


  if (
    existing?.status ===
    "connected"
  ) {
    return existing;
  }


  if (
    !existing &&
    sessions.size >=
    MAX_SESSIONS
  ) {
    throw new Error(
      `Maximum active sessions reached (${MAX_SESSIONS}).`
    );
  }


  if (existing) {
    await stopSession(number);
  }


  const session = {

    number,

    method,

    status:
      "starting",

    pairingCode:
      null,

    qr:
      null,

    qrDataUrl:
      null,

    error:
      null,

    createdAt:
      new Date().toISOString(),

    sock:
      null,

    reconnecting:
      false,

    pairingRequested:
      false

  };


  sessions.set(
    number,
    session
  );


  const sessionDir =
    path.join(
      BASE_DIR,
      number
    );


  const {
    state,
    saveCreds
  } =
    await useMultiFileAuthState(
      sessionDir
    );


  const sock =
    makeWASocket({

      auth: state,

      logger:
        P({
          level: "silent"
        }),

      printQRInTerminal:
        false,

      browser:
        Browsers.macOS(
          "Chrome"
        ),

      markOnlineOnConnect:
        false,

      syncFullHistory:
        false

    });


  session.sock =
    sock;


  sock.ev.on(
    "creds.update",
    saveCreds
  );


  sock.ev.on(
    "connection.update",
    async (
      update
    ) => {

      const {
        connection,
        lastDisconnect,
        qr
      } = update;


      // =========================
      // QR CODE
      // =========================

      if (qr) {

        session.qr =
          qr;


        try {

          session.qrDataUrl =
            await QRCode.toDataURL(
              qr,
              {
                width: 320,
                margin: 2
              }
            );

        } catch (error) {

          session.error =
            error?.message ||
            String(error);

        }


        if (
          session.method ===
          "qr"
        ) {

          session.status =
            "waiting_qr";

        }

      }


      // =========================
      // PAIRING CODE
      // =========================

      if (

        session.method ===
        "pairing" &&

        !state.creds.registered &&

        !session.pairingRequested &&

        (
          connection ===
          "connecting" ||
          Boolean(qr)
        )

      ) {

        session.pairingRequested =
          true;


        try {

          const code =
            await sock
              .requestPairingCode(
                number
              );


          session.pairingCode =
            code;


          session.status =
            "waiting_pairing";


          console.log(
            `🔐 Pairing code for ${number}: ${code}`
          );

        } catch (error) {

          session.error =
            error?.message ||
            String(error);


          session.status =
            "error";


          console.error(
            `❌ Pairing failed for ${number}:`,
            error
          );

        }

      }


      // =========================
      // CONNECTED
      // =========================

      if (
        connection ===
        "open"
      ) {

        session.status =
          "connected";

        session.error =
          null;

        session.qr =
          null;

        session.qrDataUrl =
          null;

        console.log(
          `✅ ${config.botName} connected: ${number}`
        );

      }


      // =========================
      // CONNECTION CLOSED
      // =========================

      if (
        connection ===
        "close"
      ) {

        const statusCode =
          lastDisconnect
            ?.error
            ?.output
            ?.statusCode;


        console.log(
          `❌ Session closed: ${number} | ${statusCode}`
        );


        if (
          statusCode ===
          DisconnectReason.loggedOut
        ) {

          session.status =
            "logged_out";

          return;

        }


        if (
          !session.reconnecting
        ) {

          session.reconnecting =
            true;


          setTimeout(
            async () => {

              const current =
                sessions.get(
                  number
                );


              if (
                !current ||
                current !== session
              ) {
                return;
              }


              try {

                current.reconnecting =
                  false;

                current.pairingRequested =
                  false;

                current.status =
                  "reconnecting";


                await startSession(
                  number,
                  method
                );

              } catch (
                error
              ) {

                current.reconnecting =
                  false;

                current.status =
                  "error";

                current.error =
                  error?.message ||
                  String(error);

              }

            },
            3000
          );

        }

      }

    }
  );


  // =========================
  // MESSAGES
  // =========================

  sock.ev.on(
    "messages.upsert",
    async ({
      messages
    }) => {

      for (
        const message
        of messages || []
      ) {

        try {

          await handleMessage(
            sock,
            message
          );

        } catch (
          error
        ) {

          console.error(
            "❌ Message handler error:",
            error
          );

        }

      }

    }
  );


  return session;
}


// =========================
// STOP SESSION
// =========================

async function stopSession(
  number
) {

  number =
    normalizeNumber(number);


  const session =
    sessions.get(number);


  if (!session) {
    return false;
  }


  try {

    session.sock
      ?.end?.();

  } catch {}


  sessions.delete(
    number
  );


  return true;
}


// =========================
// LOGOUT + DELETE SESSION
// =========================

async function logoutSession(
  number
) {

  number =
    normalizeNumber(number);


  const session =
    sessions.get(number);


  if (!session) {
    return false;
  }


  try {

    await session.sock
      ?.logout?.();

  } catch {}


  try {

    session.sock
      ?.end?.();

  } catch {}


  sessions.delete(
    number
  );


  const sessionDir =
    path.join(
      BASE_DIR,
      number
    );


  await fs.rm(
    sessionDir,
    {
      recursive: true,
      force: true
    }
  );


  return true;
}


// =========================
// GET SESSION
// =========================

function getSession(
  number
) {

  return sessions.get(
    normalizeNumber(number)
  );

}


// =========================
// GET PUBLIC STATUS
// =========================

function getPublicStatus(
  number
) {

  const session =
    getSession(number);


  return session
    ? publicSession(session)
    : null;

}


// =========================
// GET QR
// =========================

function getQr(
  number
) {

  const session =
    getSession(number);


  return (
    session?.qrDataUrl ||
    null
  );

}


// =========================
// LIST ALL SESSIONS
// =========================

function listSessions() {

  return [
    ...sessions.values()
  ].map(
    publicSession
  );

}


export {

  startSession,

  stopSession,

  logoutSession,

  getSession,

  getPublicStatus,

  getQr,

  listSessions,

  normalizeNumber,

  validNumber

};
