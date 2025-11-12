// api_gateway/middlewares/auth.middleware.js
const fp = require('fastify-plugin');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const config = require('../config/config'); // Import config for JWT_SECRET
const { errorResponse } = require('../src/utils/response');

async function authMiddleware(fastify, options) {
    fastify.decorateRequest('user', null);

    fastify.addHook('preHandler', async (request, reply) => {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            request.log.warn('Authentication header missing or malformed.');
            return reply.code(401).send(errorResponse('Unauthorized', 'Authentication token required.'));
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            request.user = decoded; // Attach decoded user information to the request
            request.log.info({ userId: request.user.id }, 'Authentication successful.');
        } catch (err) {
            request.log.warn({ error: err.message }, 'Invalid or expired authentication token.');
            return reply.code(401).send(errorResponse('Unauthorized', 'Invalid or expired authentication token.'));
        }
    });
}

module.exports = fp(authMiddleware);
