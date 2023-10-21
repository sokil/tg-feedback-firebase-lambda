const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const https = require("https");
const {Firestore} = require('@google-cloud/firestore');
const settings = require("./settings");

const firestore = new Firestore();
const adminsCollection = firestore.collection('admins');

function sendMessage(message, chatId) {
  logger.log("Telegram message", message);

  https
    .get(
      "https://api.telegram.org/bot" + settings.telegramBotToken + "/sendMessage?chat_id=" + chatId + "&text=" + message + "&disable_web_page_preview=1",
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

  if (admins.length === 0) {
    logger.info("Admins not registered yet", {structuredData: true});
    return;
  }

  // broadcast message to admins
  for (let i in admins) {
    sendMessage(JSON.stringify(requestPayload), admins[i].chatId);
  }
}

exports.acceptFeedbackRequest = onRequest((request, response) => {
  logger.info(request.body, {structuredData: true});

  handleMessage(request.body)

  response.send("OK");
});
