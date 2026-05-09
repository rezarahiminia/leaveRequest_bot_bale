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
const POLLING_TIMEOUT = 30; // seconds (long-polling)
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

module.exports = { BOT_TOKEN, API_BASE_URL, POLLING_TIMEOUT, POLLING_RETRY_DELAY, DB, LEAVE };
