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

    fastify.get('/:notification_id/status', async (request, reply) => {
        const { notification_id } = request.params;
        const redis = request.redis;
        const log = request.log;
        const { successResponse, errorResponse } = require('../utils/response');

        try {
            const statusData = await redis.get(`notification:${notification_id}`);
            if (!statusData) {
                log.warn({ notification_id }, 'Notification status not found in Redis.');
                return reply.code(404).send(errorResponse('Not Found', 'Notification status not found.'));
            }
            reply.code(200).send(successResponse(JSON.parse(statusData), 'Notification status retrieved successfully.'));
        } catch (error) {
            log.error({ error, notification_id }, 'Error retrieving notification status from Redis.');
            reply.code(500).send(errorResponse('Internal Server Error', 'Failed to retrieve notification status.'));
        }
    });
}

module.exports = notificationRoutes;
