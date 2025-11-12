// api_gateway/middlewares/auth.middleware.js
const fp = require('fastify-plugin');
const { errorResponse } = require('../src/utils/response');

async function authMiddleware(fastify, options) {
    fastify.decorateRequest('user', null);

    fastify.addHook('preHandler', async (request, reply) => {
        // For now, we'll simulate a basic authentication check.
        // In a real scenario, this would involve:
        // 1. Extracting a token (e.g., JWT) from the Authorization header.
        // 2. Verifying the token's signature and expiration.
        // 3. Decoding the token to get user information.
        // 4. Potentially fetching user details from the User Service.

        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            request.log.warn('Authentication header missing or malformed.');
            return reply.code(401).send(errorResponse('Unauthorized', 'Authentication token required.'));
        }

        const token = authHeader.split(' ')[1];

        // Mock authentication: accept any token for now, but log it.
        // In a real system, this would be a call to a user service or token validation library.
        if (token) {
            request.user = { id: 1, roles: ['admin'], token_provided: token }; // Mock user data
            request.log.info({ userId: request.user.id }, 'Mock authentication successful.');
        } else {
            request.log.warn('Invalid or empty token provided.');
            return reply.code(401).send(errorResponse('Unauthorized', 'Invalid authentication token.'));
        }
    });
}

module.exports = fp(authMiddleware);
