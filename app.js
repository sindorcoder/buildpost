require("dotenv").config();
const { Telegraf } = require("telegraf");

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

const channelUsername = "@sindorblog";
const replacementLink = "@Sindor Blog";
const replacementUrl = "https://t.me/@sindorblog";

bot.on("message", async (ctx) => {
  try {
    const message = ctx.message;

    if (message.forward_from || message.forward_from_chat) {
      await handleForwardedMessage(ctx, message);
    } else {
      await ctx.reply("Iltimos, forward qilingan xabar yuboring.");
    }
  } catch (err) {
    console.error("Xatolik yuz berdi:", err);
    await ctx.reply("Xabarni qayta ishlashda xatolik yuz berdi.");
  }
});

async function handleForwardedMessage(ctx, message) {
  try {
    const messageData = await formatMessage(message);

    await sendToChannel(messageData);

    await ctx.reply("Xabar kanalga muvaffaqiyatli yuborildi! ✅");
  } catch (err) {
    throw new Error(`Forward xabarni qayta ishlashda xatolik: ${err.message}`);
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
        channelUsername,
        messageData.mediaId,
        options
      );
      break;
    case "video":
      await bot.telegram.sendVideo(
        channelUsername,
        messageData.mediaId,
        options
      );
      break;
    case "animation":
      await bot.telegram.sendAnimation(
        channelUsername,
        messageData.mediaId,
        options
      );
      break;
    case "document":
      await bot.telegram.sendDocument(
        channelUsername,
        messageData.mediaId,
        options
      );
      break;
    default:
      await bot.telegram.sendMessage(
        channelUsername,
        messageData.text,
        options
      );
  }
}

function processLinks(text) {
  return text.replace(
    /@\w+/g,
    `<a href="${replacementUrl}">${replacementLink}</a>`
  );
}

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
