require('dotenv').config({ path: './api_gateway/.env' });

const config = {
    PORT: process.env.PORT || 8080,
    USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://user_service:8081',
    TEMPLATE_SERVICE_URL: process.env.TEMPLATE_SERVICE_URL || 'http://template_service:8084',
    RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://user:password@rabbitmq:5672',
    EMAIL_QUEUE_NAME: process.env.EMAIL_QUEUE_NAME || 'email_queue',
    PUSH_QUEUE_NAME: process.env.PUSH_QUEUE_NAME || 'push_queue',
    JWT_SECRET: process.env.JWT_SECRET || 'supersecretjwtkey',
    NOTIFICATION_DB_URL: process.env.NOTIFICATION_DB_URL || 'postgresql://user:password@postgres:5432/notification_db',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS || '5000', 10),
    CORRELATION_ID_HEADER: process.env.CORRELATION_ID_HEADER || 'x-correlation-id',
    REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379', // Add Redis URL
};

module.exports = config;
