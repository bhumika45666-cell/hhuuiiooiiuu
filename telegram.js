const TelegramBot = require('node-telegram-bot-api');
const { getAIResponse } = require('./ai');
const { saveAppointment } = require('./sheets');

const conversations = new Map();

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
      return bot.sendMessage(msg.chat.id, welcome);
    }

    const chatId = msg.chat.id;
    const userMessage = msg.text;
    if (!userMessage) return;

    const history = getHistory(chatId);
    history.push({ role: 'user', content: userMessage });

    const result = await getAIResponse(history);
    history.push({ role: 'assistant', content: result.text });

    if (result.booking && isConfirmation(userMessage)) {
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
      } else {
        await bot.sendMessage(chatId, `Sorry, there was a technical issue saving your appointment. Please try again or contact us at ${process.env.BUSINESS_PHONE || '+91 98765 43210'}.`);
      }
    } else if (result.text) {
      await bot.sendMessage(chatId, result.text);
    } else if (result.booking) {
      await bot.sendMessage(chatId, `I have your details ready. Would you like me to book this? Reply "yes" to confirm.`);
    }

    if (history.length > 50) {
      conversations.set(chatId, history.slice(-40));
    }
  });

  return bot;
}

module.exports = { startBot };
