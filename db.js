const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'bale_leave_bot',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// User operations
async function createOrUpdateUser(userId, userData) {
  try {
    const query = `
      INSERT INTO users (user_id, username, first_name, last_name, phone)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        phone = COALESCE(VALUES(phone), phone)
    `;
    await pool.execute(query, [
      userId,
      userData.username || null,
      userData.first_name || null,
      userData.last_name || null,
      userData.phone || null
    ]);
    return true;
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return false;
  }
}

// Leave request operations
async function createLeaveRequest(userId, leaveData) {
  try {
    const query = `
      INSERT INTO leave_requests 
        (user_id, leave_type, leave_date, leave_date_shamsi, start_time, end_time, hours, days, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(query, [
      userId,
      leaveData.leave_type,
      leaveData.leave_date,
      leaveData.leave_date_shamsi || null,
      leaveData.start_time || null,
      leaveData.end_time || null,
      leaveData.hours || null,
      leaveData.days || null,
      leaveData.reason || null
    ]);
    return result.insertId;
  } catch (error) {
    console.error('Error creating leave request:', error);
    throw error;
  }
}

async function getUserLeaveRequests(userId, limit = 10) {
  try {
    const query = `
      SELECT 
        id, leave_type, leave_date, start_time, end_time, 
        hours, reason, status, created_at
      FROM leave_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    const [rows] = await pool.execute(query, [userId, limit]);
    return rows;
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return [];
  }
}

async function getUserLeaveSummary(userId) {
  try {
    const query = `
      SELECT 
        leave_type,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN leave_type = 'hourly' THEN hours ELSE 0 END) as total_hours
      FROM leave_requests
      WHERE user_id = ?
      GROUP BY leave_type
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows;
  } catch (error) {
    console.error('Error fetching leave summary:', error);
    return [];
  }
}

async function updateLeaveStatus(leaveId, status) {
  try {
    const query = `
      UPDATE leave_requests 
      SET status = ?
      WHERE id = ?
    `;
    const [result] = await pool.execute(query, [status, leaveId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error updating leave status:', error);
    return false;
  }
}

async function getUserById(userId) {
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE user_id = ?', [userId]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

module.exports = {
  pool,
  testConnection,
  createOrUpdateUser,
  getUserById,
  createLeaveRequest,
  getUserLeaveRequests,
  getUserLeaveSummary,
  updateLeaveStatus
};
