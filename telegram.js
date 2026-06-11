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
      const tagline = process.env.BUSINESS_TAGLINE ? ` — ${process.env.BUSINESS_TAGLINE}` : '';
      const welcome = `Welcome to ${process.env.BUSINESS_NAME}!${tagline} 👋\n\nI can help you with:\n- Book an appointment\n- Check our services & prices\n- Business hours & location\n- Answer any questions\n\nJust tell me what you need!`;
      return bot.sendMessage(msg.chat.id, welcome);
    }

    const chatId = msg.chat.id;
    const userMessage = msg.text;
    if (!userMessage) return;

    const history = getHistory(chatId);
    history.push({ role: 'user', content: userMessage });

    const result = await getAIResponse(history);
    history.push({ role: 'assistant', content: result.text });

    if (result.booking) {
      const booking = await saveAppointment({
        name: result.booking.name || 'Unknown',
        phone: result.booking.phone || msg.from.username || `TG-${chatId}`,
        service: result.booking.service || 'General',
        date: result.booking.date || 'TBD',
        time: result.booking.time || 'TBD',
      });
      if (booking) {
        const confirmMsg = `✅ Your appointment is confirmed!\n\n📋 ${result.booking.service}\n📅 ${result.booking.date}\n⏰ ${result.booking.time}\n👤 ${result.booking.name}\n\nThank you for choosing ${process.env.BUSINESS_NAME}!`;
        await bot.sendMessage(chatId, confirmMsg);
        history.push({ role: 'assistant', content: confirmMsg });
      }
    } else {
      await bot.sendMessage(chatId, result.text);
    }

    if (history.length > 50) {
      conversations.set(chatId, history.slice(-40));
    }
  });

  return bot;
}

module.exports = { startBot };
