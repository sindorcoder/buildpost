require("dotenv").config();
const { Telegraf } = require("telegraf");
const fs = require("fs").promises;

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

const CONFIG_FILE = "config.json";

let channelConfig = {
  channelUsername: "",
  replacementLink: "",
  replacementUrl: "",
};

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf8");
    channelConfig = JSON.parse(data);
    return true;
  } catch (err) {
    return false;
  }
}

async function saveConfig() {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(channelConfig, null, 2));
}

let setupStage = {};

bot.command("start", async (ctx) => {
  const userId = ctx.from.id;

  // Konfiguratsiya mavjudligini tekshirish
  const configExists = await loadConfig();

  if (!configExists) {
    setupStage[userId] = "channel";
    await ctx.reply(
      "Assalomu alaykum! Botni sozlash uchun quyidagi ma'lumotlarni kiriting.\n\nIltimos, kanal usernameni kiriting (@ belgisi bilan):"
    );
  } else {
    await ctx.reply(
      `Bot sozlangan va ishlashga tayyor!\n\nJoriy kanal: ${channelConfig.channelUsername}\nHavola: ${channelConfig.replacementLink}`
    );
  }
});

bot.command("setup", async (ctx) => {
  const userId = ctx.from.id;
  setupStage[userId] = "channel";
  await ctx.reply("Iltimos, kanal usernameni kiriting (@ belgisi bilan):");
});

bot.command("settings", async (ctx) => {
  await loadConfig();
  await ctx.reply(
    `Joriy sozlamalar:\n\nKanal: ${channelConfig.channelUsername}\nHavola nomi: ${channelConfig.replacementLink}\nHavola manzili: ${channelConfig.replacementUrl}`
  );
});

bot.on("message", async (ctx) => {
  const userId = ctx.from.id;
  const message = ctx.message;

  if (setupStage[userId]) {
    switch (setupStage[userId]) {
      case "channel":
        if (!message.text.startsWith("@")) {
          await ctx.reply(
            "Kanal username @ belgisi bilan boshlanishi kerak. Qaytadan kiriting:"
          );
          return;
        }
        channelConfig.channelUsername = message.text;
        setupStage[userId] = "link_name";
        await ctx.reply(
          "Kanal saqlandi. Endi havola nomini kiriting (masalan: 'Mening Kanalim'):"
        );
        break;

      case "link_name":
        channelConfig.replacementLink = message.text;
        channelConfig.replacementUrl = `https://t.me/${channelConfig.channelUsername.substring(
          1
        )}`;
        setupStage[userId] = null;
        await saveConfig();
        await ctx.reply(
          `Sozlamalar saqlandi!\n\nKanal: ${channelConfig.channelUsername}\nHavola: ${channelConfig.replacementLink}\n\nEndi menga xabarlarni forward qilishingiz mumkin.`
        );
        break;

      default:
        if (message.forward_from || message.forward_from_chat) {
          await handleForwardedMessage(ctx, message);
        } else {
          await ctx.reply("Iltimos, forward qilingan xabar yuboring.");
        }
    }
    return;
  }

  if (message.forward_from || message.forward_from_chat) {
    await handleForwardedMessage(ctx, message);
  } else {
    await ctx.reply("Iltimos, forward qilingan xabar yuboring.");
  }
});

async function handleForwardedMessage(ctx, message) {
  try {
    if (!channelConfig.channelUsername) {
      await ctx.reply(
        "Bot to'g'ri sozlanmagan. /setup buyrug'ini ishlatib sozlang."
      );
      return;
    }

    const messageData = await formatMessage(message);
    await sendToChannel(messageData);
    await ctx.reply("Xabar kanalga muvaffaqiyatli yuborildi! ✅");
  } catch (err) {
    console.error("Xatolik:", err);
    await ctx.reply("Siz Meni Kanalingizga Admin Qilmadingiz");
  }
}

async function formatMessage(message) {
  let formattedText = "";
  let mediaId = null;
  let type = "text";

  if (message.caption) {
    formattedText = processLinks(message.caption);
  } else if (message.text) {
    formattedText = processLinks(message.text);
  }

  if (message.photo) {
    type = "photo";
    mediaId = message.photo[message.photo.length - 1].file_id;
  } else if (message.video) {
    type = "video";
    mediaId = message.video.file_id;
  } else if (message.animation) {
    type = "animation";
    mediaId = message.animation.file_id;
  } else if (message.document) {
    type = "document";
    mediaId = message.document.file_id;
  }

  return {
    type,
    text: formattedText,
    mediaId,
  };
}

async function sendToChannel(messageData) {
  const options = {
    parse_mode: "HTML",
    caption: messageData.text,
  };

  switch (messageData.type) {
    case "photo":
      await bot.telegram.sendPhoto(
        channelConfig.channelUsername,
        messageData.mediaId,
        options
      );
      break;
    case "video":
      await bot.telegram.sendVideo(
        channelConfig.channelUsername,
        messageData.mediaId,
        options
      );
      break;
    case "animation":
      await bot.telegram.sendAnimation(
        channelConfig.channelUsername,
        messageData.mediaId,
        options
      );
      break;
    case "document":
      await bot.telegram.sendDocument(
        channelConfig.channelUsername,
        messageData.mediaId,
        options
      );
      break;
    default:
      await bot.telegram.sendMessage(
        channelConfig.channelUsername,
        messageData.text,
        options
      );
  }
}

function processLinks(text) {
  if (!text) return "";

  const hasChannelMention = text.match(/@\w+/);

  if (hasChannelMention) {
    return text.replace(
      /@\w+/g,
      `<a href="${channelConfig.replacementUrl}">${channelConfig.replacementLink}</a>`
    );
  } else {
    return `${text}\n\n<a href="${channelConfig.replacementUrl}">${channelConfig.replacementLink}</a>`;
  }
}

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
