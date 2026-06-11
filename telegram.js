const TelegramBot = require('node-telegram-bot-api');
const { getAIResponse } = require('./ai');
const { saveAppointment } = require('./sheets');

const conversations = new Map();
const pendingConfirmations = new Map();

function getHistory(chatId) {
  if (!conversations.has(chatId)) {
    conversations.set(chatId, []);
  }
  return conversations.get(chatId);
}

function isConfirmation(text) {
  const words = ['yes', 'yeah', 'yep', 'sure', 'confirm', 'go ahead', 'ok', 'okay', 'correct', 'right', 'do it'];
  const lower = text.toLowerCase().trim();
  return words.some(w => lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w) || lower.includes(' ' + w + ' '));
}

function isRejection(text) {
  const words = ['no', 'nope', 'nah', 'cancel', 'not now'];
  const lower = text.toLowerCase().trim();
  return words.some(w => lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w) || lower.includes(' ' + w + ' '));
}

function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'your_telegram_bot_token_here') {
    console.error('TELEGRAM_BOT_TOKEN not configured in .env');
    process.exit(1);
  }

  const bot = new TelegramBot(token, { polling: true });
  console.log('Telegram bot started!');

  bot.on('message', async msg => {
    if (msg.text === '/start') {
      const tagline = process.env.BUSINESS_TAGLINE ? ` \u2014 ${process.env.BUSINESS_TAGLINE}` : '';
      const welcome = `Welcome to ${process.env.BUSINESS_NAME}!${tagline} \u{1F44B}\n\nI can help you with:\n- Book an appointment\n- Check our services & prices\n- Business hours & location\n- Answer any questions\n\nJust tell me what you need!`;
      pendingConfirmations.delete(msg.chat.id);
      return bot.sendMessage(msg.chat.id, welcome);
    }

    const chatId = msg.chat.id;
    const userMessage = msg.text;
    if (!userMessage) return;

    const history = getHistory(chatId);
    history.push({ role: 'user', content: userMessage });

    const result = await getAIResponse(history);
    history.push({ role: 'assistant', content: result.text });

    const pending = pendingConfirmations.get(chatId);
    const rejecting = isRejection(userMessage);
    const confirming = isConfirmation(userMessage);
    let bookingSaved = false;

    if (result.booking) {
      if (pending && rejecting) {
        pendingConfirmations.delete(chatId);
        await bot.sendMessage(chatId, "No problem! Let me know if you need anything else.");
      } else if (pending || confirming) {
        pendingConfirmations.delete(chatId);
        const booking = await saveAppointment({
          name: result.booking.name || 'Unknown',
          phone: result.booking.phone || msg.from.username || `TG-${chatId}`,
          service: result.booking.service || 'General',
          date: result.booking.date || 'TBD',
          time: result.booking.time || 'TBD',
        });
        if (booking) {
          const confirmMsg = `\u2705 Your appointment is confirmed!\n\n\u{1F4CB} ${result.booking.service}\n\u{1F4C5} ${result.booking.date}\n\u23F0 ${result.booking.time}\n\u{1F464} ${result.booking.name}\n\nThank you for choosing ${process.env.BUSINESS_NAME}!`;
          await bot.sendMessage(chatId, confirmMsg);
          history.push({ role: 'assistant', content: confirmMsg });
          bookingSaved = true;
        }
      } else {
        pendingConfirmations.set(chatId, result.booking);
      }
    } else if (pending) {
      pendingConfirmations.delete(chatId);
      if (confirming) {
        const booking = await saveAppointment({
          name: pending.name || 'Unknown',
          phone: pending.phone || msg.from.username || `TG-${chatId}`,
          service: pending.service || 'General',
          date: pending.date || 'TBD',
          time: pending.time || 'TBD',
        });
        if (booking) {
          const confirmMsg = `\u2705 Your appointment is confirmed!\n\n\u{1F4CB} ${pending.service}\n\u{1F4C5} ${pending.date}\n\u23F0 ${pending.time}\n\u{1F464} ${pending.name}\n\nThank you for choosing ${process.env.BUSINESS_NAME}!`;
          await bot.sendMessage(chatId, confirmMsg);
          history.push({ role: 'assistant', content: confirmMsg });
          bookingSaved = true;
        }
      } else if (rejecting) {
        await bot.sendMessage(chatId, "No problem! Let me know if you need anything else.");
        bookingSaved = true;
      }
    }

    if (!bookingSaved && result.text) {
      await bot.sendMessage(chatId, result.text);
    }

    if (history.length > 50) {
      conversations.set(chatId, history.slice(-40));
    }
  });

  return bot;
}

module.exports = { startBot };
