-- TMember Database Initialization Script
-- This script sets up the initial database structure for the TMember application

-- Create the database if it doesn't exist (though Docker will create it)
CREATE DATABASE IF NOT EXISTS tmember_dev;

-- Use the database
USE tmember_dev;

-- Grant privileges to the tmember user
GRANT ALL PRIVILEGES ON tmember_dev.* TO 'tmember'@'%';
FLUSH PRIVILEGES;

-- The actual table creation will be handled by GORM migrations
-- This script just ensures the database and user permissions are set up correctly