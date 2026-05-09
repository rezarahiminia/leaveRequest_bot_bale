'use strict';

/**
 * Database access layer.
 * All SQL queries live here; no SQL anywhere else in the codebase.
 * Uses mysql2/promise for async/await support.
 */

const mysql = require('mysql2/promise');
const { DB } = require('../config');
const logger = require('../utils/logger');

// ─── Connection pool ───────────────────────────────────────────────────────
const pool = mysql.createPool(DB);

// ─── Health check ──────────────────────────────────────────────────────────
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    logger.info('Database connected successfully');
    return true;
  } catch (err) {
    logger.error('Database connection failed', { message: err.message });
    return false;
  }
}

// ─── Users ─────────────────────────────────────────────────────────────────

/**
 * Upsert a user record.
 * Phone is only updated when a non-null value is provided (COALESCE pattern).
 */
async function createOrUpdateUser(userId, { username, first_name, last_name, phone } = {}) {
  const sql = `
    INSERT INTO users (user_id, username, first_name, last_name, phone)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      username   = VALUES(username),
      first_name = VALUES(first_name),
      last_name  = VALUES(last_name),
      phone      = COALESCE(VALUES(phone), phone)
  `;
  await pool.execute(sql, [userId, username ?? null, first_name ?? null, last_name ?? null, phone ?? null]);
}

/**
 * Return the user row for the given Bale user_id, or null if not found.
 */
async function getUserById(userId) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE user_id = ?', [userId]);
  return rows[0] ?? null;
}

// ─── Leave requests ────────────────────────────────────────────────────────

/**
 * Insert a new leave request and return the generated auto-increment id.
 *
 * @param {number} userId
 * @param {{
 *   leave_type: 'hourly'|'daily',
 *   leave_date: string,        // YYYY-MM-DD
 *   leave_date_shamsi: string, // "D MonthName YYYY"
 *   start_time?: string,       // HH:MM  (hourly only)
 *   end_time?: string,         // HH:MM  (hourly only)
 *   hours?: number,            // (hourly only)
 *   days?: number,             // (daily only)
 * }} leaveData
 */
async function createLeaveRequest(userId, leaveData) {
  const sql = `
    INSERT INTO leave_requests
      (user_id, leave_type, leave_date, leave_date_shamsi, start_time, end_time, hours, days, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [
    userId,
    leaveData.leave_type,
    leaveData.leave_date,
    leaveData.leave_date_shamsi ?? null,
    leaveData.start_time       ?? null,
    leaveData.end_time         ?? null,
    leaveData.hours            ?? null,
    leaveData.days             ?? null,
    leaveData.reason           ?? null,
  ]);
  return result.insertId;
}

/**
 * Return the last `limit` leave requests for a user, newest first.
 */
async function getUserLeaveRequests(userId, limit = 10) {
  const sql = `
    SELECT id, leave_type, leave_date, leave_date_shamsi,
           start_time, end_time, hours, days, status, created_at
    FROM leave_requests
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `;
  const [rows] = await pool.execute(sql, [userId, limit]);
  return rows;
}

/**
 * Return aggregated leave statistics per leave_type for a user.
 */
async function getUserLeaveSummary(userId) {
  const sql = `
    SELECT
      leave_type,
      COUNT(*)                                                    AS total,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)       AS approved,
      SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END)       AS pending,
      SUM(CASE WHEN leave_type = 'hourly' THEN hours ELSE 0 END) AS total_hours
    FROM leave_requests
    WHERE user_id = ?
    GROUP BY leave_type
  `;
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
}

/**
 * Update the approval status of a leave request.
 * Returns true if a row was actually changed.
 */
async function updateLeaveStatus(leaveId, status) {
  const [result] = await pool.execute(
    'UPDATE leave_requests SET status = ? WHERE id = ?',
    [status, leaveId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  pool,
  testConnection,
  createOrUpdateUser,
  getUserById,
  createLeaveRequest,
  getUserLeaveRequests,
  getUserLeaveSummary,
  updateLeaveStatus,
};
