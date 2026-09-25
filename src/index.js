import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} from "@whiskeysockets/baileys";

import P from "pino";
import qrcode from "qrcode-terminal";

import config from "./config.js";
import { handleMessage } from "./handler.js";
import "./firebase.js";

const CONNECT_METHOD =
  process.env.CONNECT_METHOD || "pairing";

async function startBot() {
  console.log("\n======================================");
  console.log(`🤖 ${config.botName}`);
  console.log("🚀 Starting WhatsApp Bot...");
  console.log("======================================\n");

  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,

    logger: P({
      level: "silent"
    }),

    printQRInTerminal: false,

    browser: Browsers.macOS("Chrome"),

    markOnlineOnConnect: false,

    syncFullHistory: false
  });

  sock.ev.on(
    "creds.update",
    saveCreds
  );

  let pairingCodeRequested = false;

  sock.ev.on(
    "connection.update",
    async (update) => {

      const {
        connection,
        lastDisconnect,
        qr
      } = update;

      // ==================================
      // 🔐 PAIRING CODE
      // ==================================
      //
      // IMPORTANT:
      // Wait for QR event before asking
      // WhatsApp for pairing code.
      //

      if (
        CONNECT_METHOD === "pairing" &&
        qr &&
        !state.creds.registered &&
        !pairingCodeRequested
      ) {

        pairingCodeRequested = true;

        let phoneNumber =
          process.env.PHONE_NUMBER || "";

        phoneNumber =
          phoneNumber.replace(/\D/g, "");

        if (!phoneNumber) {

          console.log(
            "\n❌ PHONE_NUMBER is missing."
          );

          return;
        }

        console.log(
          "\n🔐 WhatsApp socket is ready."
        );

        console.log(
          "📱 Requesting pairing code..."
        );

        try {

          const code =
            await sock.requestPairingCode(
              phoneNumber
            );

          console.log(
            "\n======================================"
          );

          console.log(
            "🤖 WONEX-MINI PAIRING"
          );

          console.log(
            "======================================"
          );

          console.log(
            `📱 Number: ${phoneNumber}`
          );

          console.log(
            `🔐 PAIRING CODE: ${code}`
          );

          console.log(
            "======================================"
          );

          console.log(
            "\n📱 WhatsApp:"
          );

          console.log(
            "Linked Devices"
          );

          console.log(
            "→ Link a device"
          );

          console.log(
            "→ Link with phone number instead"
          );

          console.log(
            `→ Enter ${code}\n`
          );

        } catch (error) {

          console.error(
            "\n❌ PAIRING CODE ERROR"
          );

          console.error(
            error
          );

        }
      }

      // ==================================
      // 📱 QR MODE
      // ==================================

      if (
        CONNECT_METHOD === "qr" &&
        qr
      ) {

        console.log(
          "\n📱 Scan this QR code:\n"
        );

        qrcode.generate(
          qr,
          {
            small: true
          }
        );
      }

      // ==================================
      // ✅ CONNECTED
      // ==================================

      if (
        connection === "open"
      ) {

        console.log(
          "\n======================================"
        );

        console.log(
          `✅ ${config.botName} CONNECTED`
        );

        console.log(
          "======================================"
        );

        console.log(
          `🤖 Bot: ${config.botName}`
        );

        console.log(
          `👤 Owner: ${config.ownerName}`
        );

        console.log(
          `🎮 Prefix: ${config.prefix}`
        );

        console.log(
          `🌐 Mode: ${config.workMode.toUpperCase()}`
        );

        console.log(
          "======================================\n"
        );
      }

      // ==================================
      // ❌ CONNECTION CLOSED
      // ==================================

      if (
        connection === "close"
      ) {

        const statusCode =
          lastDisconnect
            ?.error
            ?.output
            ?.statusCode;

        console.log(
          "\n❌ WhatsApp connection closed."
        );

        console.log(
          `📛 Status: ${statusCode}`
        );

        // 401 = logged out
        const shouldReconnect =
          statusCode !==
          DisconnectReason.loggedOut;

        if (
          shouldReconnect
        ) {

          console.log(
            "🔄 Restarting WhatsApp socket..."
          );

          setTimeout(
            () => {
              startBot();
            },
            3000
          );

        } else {

          console.log(
            "🔐 WhatsApp session logged out."
          );

          console.log(
            "A new session is required."
          );
        }
      }
    }
  );

  // ==================================
  // 💬 MESSAGE HANDLER
  // ==================================

  sock.ev.on(
    "messages.upsert",
    async (event) => {

      if (
        event.type &&
        event.type !== "notify"
      ) {
        return;
      }

      try {

        for (
          const message
          of event.messages
        ) {

          await handleMessage(
            sock,
            message
          );
        }

      } catch (error) {

        console.error(
          "❌ Message handler error:",
          error
        );

      }
    }
  );
}

// ======================================
// 🚀 START
// ======================================

startBot().catch(
  (error) => {

    console.error(
      "\n❌ FATAL BOT ERROR\n"
    );

    console.error(
      error
    );

    process.exit(1);
  }
);
