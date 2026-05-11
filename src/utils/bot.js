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
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    logger.error(`Bale API [${method}] failed`, { detail });
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

/**
 * Send a leave notification to the configured group chat.
 * Does nothing if GROUP_CHAT_ID is not set in .env.
 * Errors are swallowed so a group send failure never breaks the user flow.
 */
async function notifyGroup(text) {
  const { GROUP_CHAT_ID } = require('../config');
  if (!GROUP_CHAT_ID) return;
  try {
    await apiPost('sendMessage', { chat_id: GROUP_CHAT_ID, text });
  } catch (err) {
    logger.warn('Failed to send group notification', { message: err.message });
  }
}

/**
 * Send a payment invoice (درخواست پول) via Bale Wallet.
 *
 * @param {string|number} chatId
 * @param {string} title         - product name (1-32 chars)
 * @param {string} description   - product description (1-255 chars)
 * @param {string} payload       - internal payload returned on successful payment (1-128 bytes)
 * @param {Array<{label:string, amount:number}>} prices  - array of LabeledPrice (amount in Rials)
 */
async function sendInvoice(chatId, title, description, payload, prices) {
  const { WALLET } = require('../config');
  await apiPost('sendInvoice', {
    chat_id:        chatId,
    title,
    description,
    payload,
    provider_token: WALLET.TOKEN,
    currency:       'IRR',
    prices,
  });
}

/**
 * Answer a pre-checkout query to approve or reject a pending payment.
 * Must be called within 10 seconds of receiving the pre_checkout_query update.
 *
 * @param {string}  preCheckoutQueryId
 * @param {boolean} ok           - true to approve, false to reject
 * @param {string}  [errorMessage] - required when ok=false
 */
async function answerPreCheckoutQuery(preCheckoutQueryId, ok, errorMessage) {
  const body = { pre_checkout_query_id: preCheckoutQueryId, ok };
  if (!ok && errorMessage) body.error_message = errorMessage;
  await apiPost('answerPreCheckoutQuery', body);
}

module.exports = { sendMessage, editMessageReplyMarkup, answerCallbackQuery, getMe, getUpdates, buildReplyKeyboard, notifyGroup, sendInvoice, answerPreCheckoutQuery };
