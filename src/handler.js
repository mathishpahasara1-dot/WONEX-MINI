import config from "./config.js";

export async function handleMessage(sock, message) {
  try {
    if (!message?.message) return;
    if (message.key?.fromMe) return;

    const jid = message.key?.remoteJid;
    if (!jid) return;

    const text =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      message.message.imageMessage?.caption ||
      message.message.videoMessage?.caption ||
      "";

    if (!text) return;

    if (!text.startsWith(config.prefix)) return;

    const parts = text
      .slice(config.prefix.length)
      .trim()
      .split(/\s+/);

    const command = parts.shift()?.toLowerCase();

    if (!command) return;

    console.log(
      `📩 ${config.prefix}${command} | ${jid}`
    );

    // =========================
    // PING
    // =========================

    if (command === "ping") {
      await sock.sendMessage(jid, {
        text:
          `🏓 *PONG!*\n\n` +
          `🤖 ${config.botName}\n` +
          `⚡ Bot is online.`
      });

      return;
    }

    // =========================
    // ALIVE
    // =========================

    if (command === "alive") {
      await sock.sendMessage(jid, {
        text:
          `⚡ *${config.botName}*\n\n` +
          `🤖 Status: Online\n` +
          `👤 Owner: ${config.ownerName}\n` +
          `🎮 Prefix: ${config.prefix}\n` +
          `🌐 Mode: ${config.workMode.toUpperCase()}\n\n` +
          `✅ All systems operational.`
      });

      return;
    }

    // =========================
    // MENU
    // =========================

    if (command === "menu") {
      await sock.sendMessage(jid, {
        text:
          `⚡ *${config.menu.title}* ⚡\n\n` +

          `╭━━〔 🤖 BASIC 〕━━╮\n` +
          `┃ ${config.prefix}alive\n` +
          `┃ ${config.prefix}ping\n` +
          `┃ ${config.prefix}menu\n` +
          `╰━━━━━━━━━━━━━━╯\n\n` +

          `╭━━〔 ⚙️ SETTINGS 〕━━╮\n` +
          `┃ ${config.prefix}settings\n` +
          `╰━━━━━━━━━━━━━━━╯\n\n` +

          `╭━━〔 👑 OWNER 〕━━╮\n` +
          `┃ ${config.prefix}owner\n` +
          `╰━━━━━━━━━━━━━━━╯\n\n` +

          `> ${config.menu.footer}`
      });

      return;
    }

    // =========================
    // SETTINGS
    // =========================

    if (command === "settings") {
      const s = config.settings;

      const status = (value) =>
        value
          ? "『 ✅ ON 』"
          : "『 ❌ OFF 』";

      await sock.sendMessage(jid, {
        text:
          `⚡ *${config.botName} PREMIUM DASHBOARD* ⚡\n\n` +

          `*—「 BASIC CONFIGS 」—*\n\n` +

          `01. 🤖 Bot Name: ${config.botName}\n` +
          `02. 👤 Owner Name: ${config.ownerName}\n` +
          `03. 🎮 Bot Prefix: [ ${config.prefix} ]\n` +
          `04. 🔐 Work Mode: ${config.workMode.toUpperCase()}\n\n` +

          `*—「 BOT SETTINGS 」—*\n\n` +

          `05. 🚀 Always Online: ${status(s.alwaysOnline)}\n` +
          `06. 📩 Auto Read: ${status(s.autoRead)}\n` +
          `07. ⌨️ Auto Typing: ${status(s.autoTyping)}\n` +
          `08. 👁️ Status Seen: ${status(s.statusSeen)}\n` +
          `09. ❤️ Status React: ${status(s.statusReact)}\n` +
          `10. 📑 Read Cmd: ${status(s.readCmd)}\n` +
          `11. 🎙️ Recording Voice: ${status(s.recordingVoice)}\n` +
          `12. 🤖 Auto Reply: ${status(s.autoReply)}\n` +
          `13. 🔔 Connect Msg: ${status(s.connectMessage)}\n` +
          `14. 🔘 Buttons: ${status(s.buttons)}\n` +
          `15. 🎵 Voice Reply: ${status(s.voiceReply)}\n` +
          `16. 🛡️ Anti-Delete: ${status(s.antiDelete)}\n` +
          `17. 📝 Anti-Edit: ${status(s.antiEdit)}\n` +
          `18. ⚡ Auto React: ${status(s.autoReact)}\n` +
          `19. 🛡️ Group Security: ${status(s.groupSecurity)}\n` +
          `20. 📞 Anti-Call: ${status(s.antiCall)}`
      });

      return;
    }

    // =========================
    // OWNER
    // =========================

    if (command === "owner") {
      await sock.sendMessage(jid, {
        text:
          `👑 *BOT OWNER*\n\n` +
          `👤 ${config.ownerName}`
      });

      return;
    }

    // =========================
    // UNKNOWN COMMAND
    // =========================

    await sock.sendMessage(jid, {
      text:
        `❌ *Unknown Command*\n\n` +
        `Command: ${config.prefix}${command}\n\n` +
        `Use ${config.prefix}menu to see available commands.`
    });

  } catch (error) {
    console.error(
      "❌ Handler error:",
      error
    );
  }
}
