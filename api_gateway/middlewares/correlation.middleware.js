// api_gateway/middlewares/correlation.middleware.js
const fp = require('fastify-plugin');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

async function correlationIdMiddleware(fastify, options) {
    fastify.addHook('onRequest', (request, reply, done) => {
        let correlationId = request.headers[config.CORRELATION_ID_HEADER];
        if (!correlationId) {
            correlationId = uuidv4();
        }
        request.id = correlationId; // Attach to request object
        reply.header(config.CORRELATION_ID_HEADER, correlationId); // Add to response header
        done();
    });
}

module.exports = fp(correlationIdMiddleware);
