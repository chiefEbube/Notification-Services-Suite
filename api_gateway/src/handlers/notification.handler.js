// api_gateway/src/handlers/notification.handler.js
const fetch = require('node-fetch'); // Import node-fetch
const { publishToQueue } = require('../utils/publisher');
const config = require('../../config/config');
const { successResponse, errorResponse } = require('../utils/response');

async function sendNotification(request, reply) {
    const { user_id, template_id, notification_type, variables } = request.body;
    const correlationId = request.id;
    const log = request.log;
    const redis = request.redis; // Access Redis client from Fastify instance

    try {
        // 1. Store initial notification status in Redis
        const notificationStatusKey = `notification:${correlationId}`;
        const initialStatus = {
            notification_id: correlationId,
            user_id,
            template_id,
            notification_type,
            status: 'PENDING',
            timestamp: new Date().toISOString(),
            details: 'Notification request received and being processed by API Gateway.',
        };
        await redis.set(notificationStatusKey, JSON.stringify(initialStatus), 'EX', 3600); // Store for 1 hour

        // 2. Fetch user data from User Service
        log.info({ user_id }, 'Fetching user data');
        const userResponse = await fetch(`${config.USER_SERVICE_URL}/api/v1/users/${user_id}`, {
            headers: { [config.CORRELATION_ID_HEADER]: correlationId }
        });
        if (!userResponse.ok) {
            const errorData = await userResponse.json();
            log.error({ user_id, status: userResponse.status, errorData }, 'Failed to fetch user data');
            await redis.set(notificationStatusKey, JSON.stringify({ ...initialStatus, status: 'FAILED', details: `Failed to fetch user data: ${errorData.message || 'Unknown error'}` }));
            return reply.code(userResponse.status).send(errorResponse(
                'User Service Error',
                `Failed to fetch user data: ${errorData.message || 'Unknown error'}`
            ));
        }
        const userData = (await userResponse.json()).data;
        log.info({ user_id, userData }, 'User data fetched successfully');

        // 3. Fetch template data from Template Service
        log.info({ template_id }, 'Fetching template data');
        const templateResponse = await fetch(`${config.TEMPLATE_SERVICE_URL}/templates/${template_id}`, {
            headers: { [config.CORRELATION_ID_HEADER]: correlationId }
        });
        if (!templateResponse.ok) {
            const errorData = await templateResponse.json();
            log.error({ template_id, status: templateResponse.status, errorData }, 'Failed to fetch template data');
            await redis.set(notificationStatusKey, JSON.stringify({ ...initialStatus, status: 'FAILED', details: `Failed to fetch template data: ${errorData.message || 'Unknown error'}` }));
            return reply.code(templateResponse.status).send(errorResponse(
                'Template Service Error',
                `Failed to fetch template data: ${errorData.message || 'Unknown error'}`
            ));
        }
        const templateData = (await templateResponse.json()).data;
        log.info({ template_id, templateData }, 'Template data fetched successfully');


        // 4. Determine routing key based on notification_type
        let routingKey;
        if (notification_type === 'email') {
            routingKey = 'email';
        } else if (notification_type === 'push') {
            routingKey = 'push';
        } else {
            await redis.set(notificationStatusKey, JSON.stringify({ ...initialStatus, status: 'FAILED', details: 'Invalid notification_type.' }));
            return reply.code(400).send(errorResponse(
                'Bad Request',
                'Invalid notification_type. Must be "email" or "push".'
            ));
        }

        const message = {
            user_id,
            template_id,
            notification_type,
            variables,
            user_data: userData, // Include fetched user data
            template_content: templateData.content, // Include fetched template content
            correlation_id: correlationId,
        };

        // 5. Publish message to RabbitMQ
        log.info({ routingKey, message: message.correlation_id }, 'Publishing message to RabbitMQ');
        const published = await publishToQueue(routingKey, message);

        if (published) {
            // Update status to QUEUED
            await redis.set(notificationStatusKey, JSON.stringify({ ...initialStatus, status: 'QUEUED', details: 'Notification message published to RabbitMQ.' }));
            // 6. Return JSON response with 202 Accepted
            reply.code(202).send(successResponse(
                {
                    notification_id: correlationId, // Using correlationId as a temporary notification ID
                    status: 'accepted',
                    routing_key: routingKey
                },
                'Notification request accepted and queued for processing.'
            ));
        } else {
            log.error({ routingKey, message: message.correlation_id }, 'Failed to publish message to RabbitMQ');
            await redis.set(notificationStatusKey, JSON.stringify({ ...initialStatus, status: 'FAILED', details: 'Failed to publish message to RabbitMQ.' }));
            reply.code(500).send(errorResponse(
                'Internal Server Error',
                'Failed to queue notification request.'
            ));
        }

    } catch (error) {
        log.error({ error, user_id, template_id, notification_type }, 'Error processing notification request');
        const notificationStatusKey = `notification:${correlationId}`;
        await redis.set(notificationStatusKey, JSON.stringify({ ...initialStatus, status: 'FAILED', details: `Internal server error: ${error.message}` }));
        reply.code(500).send(errorResponse(
            'Internal Server Error',
            'Failed to process notification request due to an internal error.'
        ));
    }
}

module.exports = { sendNotification };
