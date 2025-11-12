// api_gateway/middlewares/logger.middleware.js
const fp = require('fastify-plugin');
const config = require('../config/config');

async function loggerPlugin(fastify, options) {
    // Fastify's built-in logger is now configured in server.js
    // We just need to ensure our hooks use the request.log instance
    // and add correlationId to it.

    fastify.addHook('onRequest', (request, reply, done) => {
        request.log = request.log.child({
            correlationId: request.id,
            method: request.method,
            url: request.url,
        });
        request.log.info('Incoming request');
        done();
    });

    fastify.addHook('onResponse', (request, reply, done) => {
        request.log.info({
            correlationId: request.id,
            statusCode: reply.statusCode,
        }, 'Request completed');
        done();
    });
}

module.exports = fp(loggerPlugin);
