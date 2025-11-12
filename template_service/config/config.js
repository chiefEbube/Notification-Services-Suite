require('dotenv').config({ path: './template_service/.env' });

const config = {
    PORT: process.env.PORT || 8084,
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@postgres:5432/notification_db',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    CORRELATION_ID_HEADER: process.env.CORRELATION_ID_HEADER || 'x-correlation-id',
};

module.exports = config;
