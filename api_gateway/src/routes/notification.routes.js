// api_gateway/src/routes/notification.routes.js
const { sendNotification } = require('../handlers/notification.handler');

async function notificationRoutes(fastify, options) {
    const sendNotificationSchema = {
        body: {
            type: 'object',
            required: ['user_id', 'template_id', 'notification_type', 'variables'],
            properties: {
                user_id: { type: 'number' },
                template_id: { type: 'string' },
                notification_type: { type: 'string', enum: ['email', 'push'] },
                variables: { type: 'object' },
            },
        },
    };

    fastify.post('/send', { schema: sendNotificationSchema, handler: sendNotification });
}

module.exports = notificationRoutes;
