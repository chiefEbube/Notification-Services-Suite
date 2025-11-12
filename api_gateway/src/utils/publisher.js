const { getChannel, getExchangeName } = require('../services/rabbitmq.service');

const publishToQueue = async (routingKey, message) => {
    try {
        const channel = getChannel();
        const exchangeName = getExchangeName();
        if (!channel) {
            console.error('RabbitMQ channel not available.');
            return false;
        }
        
        // Ensure message is a Buffer
        const messageBuffer = Buffer.from(JSON.stringify(message));
        
        channel.publish(exchangeName, routingKey, messageBuffer, { persistent: true });
        console.log(`Message published to exchange '${exchangeName}' with routing key '${routingKey}'`);
        return true;
    } catch (error) {
        console.error('Error publishing message to RabbitMQ:', error);
        return false;
    }
};

module.exports = {
    publishToQueue,
};
