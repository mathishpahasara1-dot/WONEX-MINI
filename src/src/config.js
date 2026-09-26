const config = {
  botName: process.env.BOT_NAME || "Wonex-Mini",
  ownerName: process.env.OWNER_NAME || "Mathish",
  prefix: process.env.BOT_PREFIX || ".",
  workMode: process.env.WORK_MODE || "public",

  settings: {
    alwaysOnline: false,
    autoRead: false,
    autoTyping: false,

    statusSeen: true,
    statusReact: true,
    readCmd: false,

    recordingVoice: false,
    autoReply: false,
    connectMessage: true,

    buttons: true,
    voiceReply: false,

    antiDelete: false,
    antiEdit: false,
    autoReact: false,

    groupSecurity: false,
    antiCall: false
  },

  menu: {
    title: "WONEX-MINI PREMIUM MENU",
    footer: "Made by Mathish"
  }
};

export default config;
