'use strict';

require('dotenv').config();

// ─── Validate required environment variables ───────────────────────────────
const REQUIRED = ['BOT_TOKEN', 'DB_NAME'];
for (const key of REQUIRED) {
  if (!process.env[key]) throw new Error(`Missing required env variable: ${key}`);
}

// ─── Bot ───────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE_URL = `https://tapi.bale.ai/bot${BOT_TOKEN}`;

// ─── Polling ───────────────────────────────────────────────────────────────
const POLLING_TIMEOUT = 5; // seconds (short enough to catch pre_checkout_query within 10s deadline)
const POLLING_RETRY_DELAY = 3000; // ms between retries on error

// ─── Database ──────────────────────────────────────────────────────────────
const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// ─── Business rules ────────────────────────────────────────────────────────
const LEAVE = {
  MAX_DAILY_DAYS: 30,
  MAX_HOURLY_HOURS: 24,
  LIST_LIMIT: 10,
};

// ─── Group notifications ───────────────────────────────────────────────────
// Set GROUP_CHAT_ID in .env to enable leave notifications in a group.
// Leave empty to disable group notifications.
const GROUP_CHAT_ID = process.env.GROUP_CHAT_ID || null;

// ─── Bale Wallet Payment ───────────────────────────────────────────────────
// WALLET_ENABLED=true  → require payment before leave is confirmed
// WALLET_TOKEN         → payment provider token from @botfather
// Prices are in Rials (IRR); 10 Rials = 1 Toman
const WALLET = {
  ENABLED:      process.env.WALLET_ENABLED === 'true',
  TOKEN:        process.env.WALLET_TOKEN   || '',
  HOURLY_PRICE: Number(process.env.WALLET_HOURLY_PRICE) || 100000,   // 10,000 Toman
  DAILY_PRICE:  Number(process.env.WALLET_DAILY_PRICE)  || 1000000,  // 100,000 Toman
};

module.exports = { BOT_TOKEN, API_BASE_URL, POLLING_TIMEOUT, POLLING_RETRY_DELAY, DB, LEAVE, GROUP_CHAT_ID, WALLET };
