// api_gateway/src/handlers/notification.handler.js
const { publishToQueue } = require('../utils/publisher'); // Use the new publisher utility
const config = require('../../config/config');
const { successResponse, errorResponse } = require('../utils/response');

// Mock fetch function for external services
async function mockFetch(url, options) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    if (url.includes(config.USER_SERVICE_URL)) {
        // Mock user service response
        return {
            ok: true,
            status: 200,
            json: async () => ({
                success: true,
                data: {
                    id: 1,
                    email: 'test@example.com',
                    push_token: 'mock_push_token_123',
                    preferences: { email: true, push: true }
                },
                message: 'User data fetched successfully',
                meta: {}
            })
        };
    } else if (url.includes(config.TEMPLATE_SERVICE_URL)) {
        // Mock template service response
        return {
            ok: true,
            status: 200,
            json: async () => ({
                success: true,
                data: {
                    id: 'template-123',
                    name: 'welcome_email',
                    content: 'Hello {{name}}, welcome to our service!',
                    type: 'email'
                },
                message: 'Template data fetched successfully',
                meta: {}
            })
        };
    }
    return { ok: false, status: 404, json: async () => ({ error: 'Not Found' }) };
}


async function sendNotification(request, reply) {
    const { user_id, template_id, notification_type, variables } = request.body;
    const correlationId = request.id; // Get correlation ID from request
    const log = request.log; // Use the logger from the request


    try {
        // 2. Mock fetch user data
        log.info({ user_id }, 'Mock fetching user data');
        const userResponse = await mockFetch(`${config.USER_SERVICE_URL}/users/${user_id}`, {
            headers: { [config.CORRELATION_ID_HEADER]: correlationId }
        });
        if (!userResponse.ok) {
            const errorData = await userResponse.json();
            log.error({ user_id, status: userResponse.status, errorData }, 'Failed to mock fetch user data');
            return reply.code(userResponse.status).send(errorResponse(
                'User Service Error',
                `Failed to fetch user data: ${errorData.message || 'Unknown error'}`
            ));
        }
        const userData = (await userResponse.json()).data;
        log.info({ user_id, userData }, 'Mock user data fetched successfully');


        // 3. Mock fetch template data
        log.info({ template_id }, 'Mock fetching template data');
        const templateResponse = await mockFetch(`${config.TEMPLATE_SERVICE_URL}/templates/${template_id}`, {
            headers: { [config.CORRELATION_ID_HEADER]: correlationId }
        });
        if (!templateResponse.ok) {
            const errorData = await templateResponse.json();
            log.error({ template_id, status: templateResponse.status, errorData }, 'Failed to mock fetch template data');
            return reply.code(templateResponse.status).send(errorResponse(
                'Template Service Error',
                `Failed to fetch template data: ${errorData.message || 'Unknown error'}`
            ));
        }
        const templateData = (await templateResponse.json()).data;
        log.info({ template_id, templateData }, 'Mock template data fetched successfully');


        // 4. Determine routing key based on notification_type
        let routingKey;
        if (notification_type === 'email') {
            routingKey = 'email';
        } else if (notification_type === 'push') {
            routingKey = 'push';
        } else {
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
            reply.code(500).send(errorResponse(
                'Internal Server Error',
                'Failed to queue notification request.'
            ));
        }

    } catch (error) {
        log.error({ error, user_id, template_id, notification_type }, 'Error processing notification request');
        reply.code(500).send(errorResponse(
            'Internal Server Error',
            'Failed to process notification request due to an internal error.'
        ));
    }
}

module.exports = { sendNotification };
