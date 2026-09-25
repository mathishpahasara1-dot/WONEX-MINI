import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";

import P from "pino";
import qrcode from "qrcode-terminal";
import readline from "readline";

const BOT_NAME = "Wonex-Mini";
const PREFIX = ".";

// qr  = QR code
// pairing = WhatsApp pairing code
const CONNECT_METHOD = process.env.CONNECT_METHOD || "qr";

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
  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Wonex-Mini", "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  /*
   * =========================
   * PAIRING CODE
   * =========================
   */

  if (CONNECT_METHOD === "pairing" && !sock.authState.creds.registered) {
    let phoneNumber = process.env.PHONE_NUMBER;

    if (!phoneNumber) {
      phoneNumber = await askQuestion(
        "\n📱 Enter WhatsApp number with country code:\nExample: 94772016921\n\nNumber: "
      );
    }

    phoneNumber = phoneNumber.replace(/\D/g, "");

    if (!phoneNumber) {
      console.log("❌ Invalid phone number.");
      process.exit(1);
    }

    try {
      const code = await sock.requestPairingCode(phoneNumber);

      console.log("\n================================");
      console.log("🤖 WONEX-MINI PAIRING CODE");
      console.log("================================");
      console.log(`📱 Number: ${phoneNumber}`);
      console.log(`🔐 Code: ${code}`);
      console.log("================================\n");
      console.log("WhatsApp → Linked Devices → Link with phone number");
      console.log("Enter the code shown above.");
    } catch (error) {
      console.error("❌ Pairing code error:", error);
    }
  }

  /*
   * =========================
   * CONNECTION
   * =========================
   */

  sock.ev.on(
    "connection.update",
    ({ connection, lastDisconnect, qr }) => {

      // QR MODE
      if (qr && CONNECT_METHOD === "qr") {
        console.log("\n📱 Scan this QR with WhatsApp:\n");
        qrcode.generate(qr, { small: true });
      }

      // CONNECTED
      if (connection === "open") {
        console.log("\n================================");
        console.log(`✅ ${BOT_NAME} CONNECTED`);
        console.log("================================");
        console.log(`🤖 Bot: ${BOT_NAME}`);
        console.log(`👤 Owner: Mathish`);
        console.log(`🎮 Prefix: ${PREFIX}`);
        console.log("🌐 Mode: PUBLIC");
        console.log("================================\n");
      }

      // DISCONNECTED
      if (connection === "close") {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        const shouldReconnect =
          statusCode !== DisconnectReason.loggedOut;

        console.log("❌ WhatsApp connection closed.");

        if (shouldReconnect) {
          console.log("🔄 Reconnecting...");
          startBot();
        } else {
          console.log("🔐 WhatsApp logged out.");
          console.log("Delete the session folder and connect again.");
        }
      }
    }
  );

  /*
   * =========================
   * MESSAGE HANDLER
   * =========================
   */

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const message = messages[0];

      if (!message?.message) return;
      if (message.key.fromMe) return;

      const text =
        message.message.conversation ||
        message.message.extendedTextMessage?.text ||
        "";

      if (!text.startsWith(PREFIX)) return;

      const args = text
        .slice(PREFIX.length)
        .trim()
        .split(/\s+/);

      const command = args.shift()?.toLowerCase();

      if (!command) return;

      console.log(`📩 Command: ${command}`);

      const jid = message.key.remoteJid;

      /*
       * PING
       */

      if (command === "ping") {
        await sock.sendMessage(jid, {
          text: "🏓 Pong!\n\n🤖 Wonex-Mini is online."
        });
      }

      /*
       * ALIVE
       */

      else if (command === "alive") {
        await sock.sendMessage(jid, {
          text:
            `⚡ *${BOT_NAME}*\n\n` +
            `🤖 Status: Online\n` +
            `👤 Owner: Mathish\n` +
            `🎮 Prefix: ${PREFIX}\n` +
            `🌐 Mode: PUBLIC`
        });
      }

      /*
       * MENU
       */

      else if (command === "menu") {
        await sock.sendMessage(jid, {
          text:
            `⚡ *${BOT_NAME} PREMIUM MENU* ⚡\n\n` +
            `╭━━━〔 🤖 BASIC 〕━━━╮\n` +
            `┃ • .alive\n` +
            `┃ • .ping\n` +
            `┃ • .menu\n` +
            `╰━━━━━━━━━━━━━━━━╯\n\n` +

            `╭━━━〔 📥 DOWNLOAD 〕━━╮\n` +
            `┃ • .yt\n` +
            `┃ • .song\n` +
            `┃ • .tiktok\n` +
            `┃ • .facebook\n` +
            `╰━━━━━━━━━━━━━━━━━━╯\n\n` +

            `╭━━━〔 ⚙️ SETTINGS 〕━━╮\n` +
            `┃ • .settings\n` +
            `┃ • .autoread\n` +
            `┃ • .autotyping\n` +
            `┃ • .autoreact\n` +
            `╰━━━━━━━━━━━━━━━━━━╯\n\n` +

            `╭━━━〔 👑 OWNER 〕━━━╮\n` +
            `┃ • .owner\n` +
            `┃ • .mode\n` +
            `┃ • .setprefix\n` +
            `╰━━━━━━━━━━━━━━━━╯\n\n` +

            `⚡ *${BOT_NAME}*\n` +
            `Made by Mathish`
        });
      }

      /*
       * UNKNOWN COMMAND
       */

      else {
        await sock.sendMessage(jid, {
          text:
            `❌ Unknown command: ${PREFIX}${command}\n\n` +
            `Use ${PREFIX}menu to see available commands.`
        });
      }

    } catch (error) {
      console.error("❌ Message handler error:", error);
    }
  });
}

startBot().catch((error) => {
  console.error("❌ Fatal error:", error);
});
