import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";

import P from "pino";
import qrcode from "qrcode-terminal";

import config from "./config.js";
import { handleMessage } from "./handler.js";
import "./firebase.js";

const CONNECT_METHOD =
  process.env.CONNECT_METHOD || "qr";

async function startBot() {
  console.log("\n================================");
  console.log(`🤖 ${config.botName}`);
  console.log("🚀 Starting WhatsApp Bot...");
  console.log("================================\n");

  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false,

    browser: [
  "Windows",
  "Chrome",
  "114.0.5735.198"
],
markOnlineOnConnect: false,
syncFullHistory: false,
  });

  sock.ev.on(
    "creds.update",
    saveCreds
  );

  let pairingRequested = false;

  sock.ev.on(
    "connection.update",
    async ({
      connection,
      lastDisconnect,
      qr
    }) => {

      // ==============================
      // 📱 QR LOGIN
      // ==============================

      if (
        CONNECT_METHOD === "qr" &&
        qr
      ) {
        console.log(
          "\n📱 Scan this QR code:\n"
        );

        qrcode.generate(
          qr,
          { small: true }
        );
      }

      // ==============================
      // 🔐 PAIRING CODE LOGIN
      // ==============================

      if (
        CONNECT_METHOD === "pairing" &&
        !state.creds.registered &&
        !pairingRequested &&
        (
          connection === "connecting" ||
          qr
        )
      ) {

        pairingRequested = true;

        let phoneNumber =
          process.env.PHONE_NUMBER;

        if (!phoneNumber) {
          console.log(
            "\n❌ PHONE_NUMBER is missing."
          );
          return;
        }

        phoneNumber =
          phoneNumber.replace(/\D/g, "");

        if (!phoneNumber) {
          console.log(
            "\n❌ Invalid phone number."
          );
          return;
        }

        try {

          // Wait a little for WhatsApp socket
          await new Promise(
            (resolve) =>
              setTimeout(resolve, 1500)
          );

          console.log(
            "\n🔐 Requesting pairing code..."
          );

          const code =
            await sock.requestPairingCode(
              phoneNumber
            );

          console.log(
            "\n================================"
          );

          console.log(
            "🤖 WONEX-MINI PAIRING"
          );

          console.log(
            "================================"
          );

          console.log(
            `📱 Number: ${phoneNumber}`
          );

          console.log(
            `🔐 Pairing Code: ${code}`
          );

          console.log(
            "================================"
          );

          console.log(
            "\n📱 WhatsApp → Linked Devices"
          );

          console.log(
            "→ Link a device"
          );

          console.log(
            "→ Link with phone number instead"
          );

          console.log(
            `→ Enter: ${code}\n`
          );

        } catch (error) {

          console.error(
            "\n❌ Pairing error:",
            error
          );

        }
      }

      // ==============================
      // ✅ CONNECTED
      // ==============================

      if (
        connection === "open"
      ) {

        console.log(
          "\n================================"
        );

        console.log(
          `✅ ${config.botName} CONNECTED`
        );

        console.log(
          "================================"
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
          "================================\n"
        );
      }

      // ==============================
      // ❌ CONNECTION CLOSED
      // ==============================

      if (
        connection === "close"
      ) {

        const statusCode =
          lastDisconnect
            ?.error
            ?.output
            ?.statusCode;

        const shouldReconnect =
          statusCode !==
          DisconnectReason.loggedOut;

        console.log(
          "\n❌ WhatsApp connection closed."
        );

        console.log(
          `📛 Status Code: ${statusCode}`
        );

        if (shouldReconnect) {

          console.log(
            "🔄 Reconnecting..."
          );

          setTimeout(
            startBot,
            3000
          );

        } else {

          console.log(
            "🔐 WhatsApp logged out."
          );

          console.log(
            "Delete the session folder and connect again."
          );
        }
      }
    }
  );

  // ==============================
  // 💬 MESSAGE HANDLER
  // ==============================

  sock.ev.on(
    "messages.upsert",
    async ({
      messages
    }) => {

      try {

        for (
          const message of messages
        ) {

          await handleMessage(
            sock,
            message
          );

        }

      } catch (error) {

        console.error(
          "❌ Message error:",
          error
        );

      }
    }
  );
}

// ==============================
// 🚀 START BOT
// ==============================

startBot().catch(
  (error) => {

    console.error(
      "\n❌ Fatal Bot Error:\n",
      error
    );

    process.exit(1);

  }
);
