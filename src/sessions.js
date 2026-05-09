'use strict';

/**
 * In-memory session store for multi-step conversations.
 *
 * Session shape (example):
 * {
 *   type: 'daily' | 'hourly',
 *   step: 'start_date' | 'days' | 'start_time' | 'duration',
 *   data: { leave_date, leave_date_shamsi, start_time, ... }
 * }
 *
 * One session per user (keyed by Telegram/Bale user_id).
 * Sessions are cleared when a flow completes or the user sends /cancel.
 */

const sessions = new Map();

function get(userId) {
  return sessions.get(userId) ?? null;
}

function set(userId, session) {
  sessions.set(userId, session);
}

function del(userId) {
  sessions.delete(userId);
}

function has(userId) {
  return sessions.has(userId);
}

module.exports = { get, set, del, has };
