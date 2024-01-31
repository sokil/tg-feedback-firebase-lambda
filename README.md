# Telegram Feedback Bot

Built over Google Firebase Functions

## How to install

1. Create new google project

2. Create new telegram bot in @bothfather
   
3. Rename `firebasercz.example` to `firebasercz` and configure you project id where you want to deploy function.

4. Rename `functions/settings.js.example` to `functions/settings.js` and define Telegram bot token. Also you need to define admin token to authorize in bot as admin.

5. Deploy function:

```
firebase deploy
```

## How to use

Open you bot in telegram and start with command:

```
/start {adminToken}
```

Now you will reseive all messages sent to bot.

To reply to sender, just reply with response to this message.

Have fun!



