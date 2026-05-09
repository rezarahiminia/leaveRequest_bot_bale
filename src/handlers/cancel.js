'use strict';

/**
 * /cancel command — abort any in-progress conversation for the user.
 */

const sessions = require('../sessions');
const { sendMessage } = require('../utils/bot');

async function handleCancel(message) {
  const { from, chat } = message;

  if (sessions.has(from.id)) {
    sessions.del(from.id);
    await sendMessage(chat.id, '❌ عملیات لغو شد.');
  } else {
    await sendMessage(chat.id, 'هیچ عملیاتی در حال انجام نیست.');
  }
}

module.exports = { handleCancel };
