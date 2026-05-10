-- Create database
CREATE DATABASE IF NOT EXISTS bale_leave_bot 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE bale_leave_bot;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT UNIQUE NOT NULL,
    username    VARCHAR(255),
    first_name  VARCHAR(255),
    last_name   VARCHAR(255),
    phone       VARCHAR(20),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id                 INT PRIMARY KEY AUTO_INCREMENT,
    user_id            BIGINT NOT NULL,
    leave_type         ENUM('daily', 'hourly') NOT NULL,
    leave_date         DATE NOT NULL,
    leave_date_shamsi  VARCHAR(20),               -- تاریخ شمسی به صورت متن: «19 اردیبهشت 1405»
    start_time         TIME,
    end_time           TIME,
    hours              DECIMAL(4,2),              -- مرخصی ساعتی
    days               DECIMAL(4,1),              -- مرخصی روزانه (0.5 = نیم روز)
    reason             TEXT,
    status             ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_date  (user_id, leave_date),
    INDEX idx_leave_type (leave_type),
    INDEX idx_status     (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create view for leave summary
CREATE OR REPLACE VIEW leave_summary AS
SELECT 
    u.user_id,
    u.first_name,
    u.last_name,
    lr.leave_type,
    COUNT(*) as total_requests,
    SUM(CASE WHEN lr.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
    SUM(CASE WHEN lr.leave_type = 'hourly' THEN lr.hours ELSE 0 END) as total_hours
FROM users u
LEFT JOIN leave_requests lr ON u.user_id = lr.user_id
GROUP BY u.user_id, u.first_name, u.last_name, lr.leave_type;
