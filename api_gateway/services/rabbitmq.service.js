// api_gateway/services/rabbitmq.service.js
const amqp = require('amqplib');
const config = require('../config/config');
const { logger } = require('../middlewares/logger.middleware');

let connection = null;
let channel = null;

async function connectRabbitMQ() {
    if (connection && channel) {
        return; // Already connected
    }

    try {
        connection = await amqp.connect(config.RABBITMQ_URL);
        connection.on('error', (err) => {
            logger.error({ error: err }, 'RabbitMQ connection error');
            // Implement reconnection logic here
        });
        connection.on('close', () => {
            logger.warn('RabbitMQ connection closed. Attempting to reconnect...');
            // Implement reconnection logic here
        });

        channel = await connection.createChannel();
        logger.info('Connected to RabbitMQ');
    } catch (error) {
        logger.error({ error }, 'Failed to connect to RabbitMQ');
        // Implement retry logic or graceful degradation
        throw error;
    }
}

async function sendToQueue(queueName, message) {
    if (!channel) {
        await connectRabbitMQ();
    }

    try {
        await channel.assertQueue(queueName, { durable: true });
        const sent = channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
            persistent: true,
            headers: { 'x-correlation-id': message.correlation_id },
        });

        if (sent) {
            logger.info({ queueName, message: message.correlation_id }, 'Message sent to queue');
        } else {
            logger.error({ queueName, message: message.correlation_id }, 'Message not sent to queue (buffer full)');
            // Handle case where buffer is full
        }
    } catch (error) {
        logger.error({ error, queueName, message }, 'Failed to send message to RabbitMQ queue');
        throw error;
    }
}

module.exports = {
    connectRabbitMQ,
    sendToQueue,
};
