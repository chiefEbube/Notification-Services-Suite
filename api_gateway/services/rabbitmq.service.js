const amqp = require('amqplib');
const config = require('../config/config'); // Assuming config.js loads .env variables

let connection = null;
let channel = null;
const EXCHANGE_NAME = 'notifications.direct';

const connectRabbitMQ = async () => {
    try {
        // Use the RABBITMQ_URL from config
        connection = await amqp.connect(config.rabbitmq.url);
        channel = await connection.createChannel();
        await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
        console.log('Connected to RabbitMQ and asserted exchange.');
        
        connection.on('error', (err) => {
            console.error('RabbitMQ connection error:', err);
            // Implement reconnection logic here
            if (connection) {
                connection.close();
            }
            setTimeout(connectRabbitMQ, 5000); // Attempt to reconnect after 5 seconds
        });
        connection.on('close', () => {
            console.warn('RabbitMQ connection closed. Reconnecting...');
            setTimeout(connectRabbitMQ, 5000); // Attempt to reconnect after 5 seconds
        });
        
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        setTimeout(connectRabbitMQ, 5000); // Retry connection after 5 seconds
    }
};

const getChannel = () => channel;
const getExchangeName = () => EXCHANGE_NAME;

module.exports = {
    connectRabbitMQ,
    getChannel,
    getExchangeName,
};
