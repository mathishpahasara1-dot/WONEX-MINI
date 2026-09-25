// ========================================
// 🤖 WONEX-MINI BOT CONFIGURATION
// ========================================

const config = {
  // =========================
  // BASIC CONFIG
  // =========================

  botName: "Wonex-Mini",
  ownerName: "Mathish",

  // Bot owner WhatsApp number
  ownerNumber: "94729169740",

  // Command prefix
  prefix: ".",

  // public / private
  workMode: "public",

  // Bot image URL
  botImage: "",


  // =========================
  // BOT SETTINGS
  // =========================

  settings: {

    // Always show online
    alwaysOnline: false,

    // Automatically read messages
    autoRead: false,

    // Show typing indicator
    autoTyping: false,

    // Automatically view WhatsApp statuses
    statusSeen: true,

    // React to WhatsApp statuses
    statusReact: true,

    // Read command messages
    readCmd: false,

    // Recording indicator
    recordingVoice: false,

    // Automatic replies
    autoReply: false,

    // Send message when bot connects
    connectMessage: true,

    // Buttons support
    buttons: true,

    // Voice replies
    voiceReply: false,

    // Anti delete
    antiDelete: false,

    // Anti edit
    antiEdit: false,

    // Automatic reactions
    autoReact: false,

    // Group security
    groupSecurity: false,

    // Anti call
    antiCall: false
  },


  // =========================
  // MENU
  // =========================

  menu: {
    title: "WONEX-MINI PREMIUM MENU",
    footer: "Made by Mathish"
  },


  // =========================
  // DOWNLOAD SETTINGS
  // =========================

  downloads: {

    youtube: true,
    song: true,
    tiktok: true,
    facebook: true,

    // These will only be implemented
    // where the content/API is permitted.
    movie: false,
    cinesubz: false,
    biscope: false
  }
};

export default config;
