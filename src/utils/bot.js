'use strict';

/**
 * Thin wrapper around the Bale Bot HTTP API.
 * All network calls go through this module so the rest of the code
 * stays free of axios / HTTP concerns.
 */

const axios = require('axios');
const { API_BASE_URL } = require('../config');
const logger = require('./logger');

// ─── Internal helper ───────────────────────────────────────────────────────
async function apiPost(method, body) {
  const url = `${API_BASE_URL}/${method}`;
  try {
    const res = await axios.post(url, body);
    return res.data;
  } catch (err) {
    logger.error(`Bale API [${method}] failed`, { message: err.message });
    throw err;
  }
}

async function apiGet(method, params = {}) {
  const url = `${API_BASE_URL}/${method}`;
  try {
    const res = await axios.get(url, { params });
    return res.data;
  } catch (err) {
    logger.error(`Bale API [${method}] failed`, { message: err.message });
    throw err;
  }
}

// ─── Public API helpers ───────────────────────────────────────────────────

/**
 * Send a text message. replyMarkup is optional (keyboard or inline_keyboard).
 */
async function sendMessage(chatId, text, replyMarkup = null) {
  const payload = { chat_id: chatId, text };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  await apiPost('sendMessage', payload);
}

/**
 * Edit the reply markup of an already-sent message (used to remove calendars).
 */
async function editMessageReplyMarkup(chatId, messageId, replyMarkup) {
  await apiPost('editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup,
  });
}

/**
 * Acknowledge a callback query to remove the loading indicator.
 */
async function answerCallbackQuery(callbackQueryId) {
  await apiPost('answerCallbackQuery', { callback_query_id: callbackQueryId });
}

/**
 * Fetch the bot's own info. Returns result object.
 */
async function getMe() {
  const data = await apiGet('getMe');
  if (!data.ok) throw new Error('getMe returned ok=false');
  return data.result;
}

/**
 * Long-poll for new updates starting from `offset`.
 * Returns array of update objects.
 */
async function getUpdates(offset, timeout) {
  const data = await apiGet('getUpdates', { offset, timeout });
  if (!data.ok) return [];
  return data.result;
}

/**
 * Build a standard reply keyboard layout.
 * @param {Array<Array<{text: string}>>} rows
 */
function buildReplyKeyboard(rows) {
  return { keyboard: rows, resize_keyboard: true, one_time_keyboard: true };
}

module.exports = { sendMessage, editMessageReplyMarkup, answerCallbackQuery, getMe, getUpdates, buildReplyKeyboard };
