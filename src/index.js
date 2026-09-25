import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";

import P from "pino";
import qrcode from "qrcode-terminal";
import readline from "readline";

import config from "./config.js";
import { handleMessage } from "./handler.js";

const CONNECT_METHOD =
  process.env.CONNECT_METHOD || "qr";

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function startBot() {
  console.log("\n================================");
  console.log(`🤖 ${config.botName}`);
  console.log("🚀 Starting WhatsApp Bot...");
  console.log("================================\n");

  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,

    logger: P({
      level: "silent"
    }),

    printQRInTerminal: false,

    browser: [
      config.botName,
      "Chrome",
      "1.0.0"
    ]
  });

  /*
  ========================================
  AUTH CREDENTIALS
  ========================================
  */

  sock.ev.on(
    "creds.update",
    saveCreds
  );

  /*
  ========================================
  PAIRING CODE
  ========================================
  */

  if (
    CONNECT_METHOD === "pairing" &&
    !sock.authState.creds.registered
  ) {
    let phoneNumber =
      process.env.PHONE_NUMBER;

    if (!phoneNumber) {
      phoneNumber = await askQuestion(
        "\n📱 Enter WhatsApp number with country code:\n" +
        "Example: 94729169740\n\n" +
        "Number: "
      );
    }

    phoneNumber =
      phoneNumber.replace(/\D/g, "");

    if (!phoneNumber) {
      console.log(
        "❌ Invalid phone number."
      );

      process.exit(1);
    }

    try {
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
        "================================\n"
      );

      console.log(
        "WhatsApp → Linked Devices → " +
        "Link with phone number"
      );

      console.log(
        "Enter the code shown above."
      );

    } catch (error) {

      console.error(
        "❌ Pairing error:",
        error
      );
    }
  }

  /*
  ========================================
  CONNECTION UPDATE
  ========================================
  */

  sock.ev.on(
    "connection.update",
    ({
      connection,
      lastDisconnect,
      qr
    }) => {

      /*
      QR CODE
      */

      if (
        qr &&
        CONNECT_METHOD === "qr"
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

      /*
      CONNECTED
      */

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

      /*
      CONNECTION CLOSED
      */

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
            "Delete the session folder " +
            "and connect again."
          );
        }
      }
    }
  );

  /*
  ========================================
  MESSAGE SYSTEM
  ========================================
  */

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

/*
========================================
START BOT
========================================
*/

startBot().catch(
  (error) => {

    console.error(
      "\n❌ Fatal Bot Error:\n",
      error
    );

    process.exit(1);
  }
);
