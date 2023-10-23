const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const https = require("https");
const {Firestore} = require('@google-cloud/firestore');
const settings = require("./settings");

const firestore = new Firestore();
const adminsCollection = firestore.collection('admins');

function sendMessage(message, chatId) {
  logger.log("Telegram message \"" + message + "\" to chat " + chatId);

  https
    .get(
      "https://api.telegram.org/bot" + settings.telegramBotToken + "/sendMessage?chat_id=" + chatId + "&text=" + encodeURIComponent(message) + "&disable_web_page_preview=1",
      (resp) => {
        resp.on("data", (chunk) => {
          logger.log("Telegram response", chunk.toString());
        });
      }
    )
    .on("error", (err) => {
      logger.log("Telegram error", err);
    });
}

async function handleMessage(requestPayload) {
  const usernameFrom = requestPayload.message.from.username;
  const userIdFrom = requestPayload.message.from.id;
  const messageText = requestPayload.message.text;
  const responceChatId = requestPayload.message.chat.id;

  // handle admins registration request
  if (messageText.startsWith("/start")) {
    // handle auth command
    if (settings.adminToken === messageText.substring(7)) {
      await adminsCollection.doc(usernameFrom).set({
        userId: userIdFrom,
        username: usernameFrom,
        chatId: responceChatId,
      });

      sendMessage("Hello, admin!", responceChatId);
    }

    return;
  }

  // load admins
  const adminsQuery = await adminsCollection.get();
  const admins = adminsQuery.docs.map(doc => doc.data());
  const adminIds = admins.map(admin => admin.userId);

  if (admins.length === 0) {
    logger.info("Admins not registered yet", {structuredData: true});
    return;
  }

  // handle reply from admin to user
  if (requestPayload.message.reply_to_message && adminIds.indexOf(userIdFrom)) {
    const repliedText = requestPayload.message.reply_to_message.text;
    const repliedTextMatch = repliedText.match(/From: @([a-zA-Z0-9_]+) \((\d+)\)\n\n(.+)/);
    if (repliedTextMatch) {
      sendMessage(messageText, repliedTextMatch[2]);

      // broadcast message to admins
      for (let i in admins) {
        sendMessage(
          "Reply to: @" + repliedTextMatch[1] + " (" + userIdFrom + ")\n\n" + messageText,
          admins[i].chatId
        );
      }
    }

    return;
  }

  // broadcast message to admins
  for (let i in admins) {
    sendMessage(
      "From: @" + usernameFrom + " (" + userIdFrom + ")\n\n" + messageText,
      admins[i].chatId
    );
  }
}

exports.acceptFeedbackRequest = onRequest((request, response) => {
  logger.info(request.body, {structuredData: true});

  handleMessage(request.body)

  response.send("OK");
});
