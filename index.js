const dotenv = require('dotenv');
dotenv.config();

console.log('========================================');
console.log('  Telegram AI Business Bot');
console.log('  AI: OpenCode Zen DeepSeek V4 Flash Free');
console.log('  Storage: Google Sheets');
console.log('========================================\n');

const reqVars = ['ZEN_API_KEY', 'APPS_SCRIPT_URL', 'TELEGRAM_BOT_TOKEN'];
let missing = false;
for (const v of reqVars) {
  if (!process.env[v] || process.env[v].startsWith('your_')) {
    console.error(`Missing required env var: ${v}`);
    console.error(`  Edit .env and set your ${v}`);
    missing = true;
  }
}
if (missing) {
  console.error('\nPlease configure your .env file first!');
  process.exit(1);
}

const { startBot } = require('./telegram');
const { startDashboard } = require('./server');

const bot = startBot();
startDashboard();
