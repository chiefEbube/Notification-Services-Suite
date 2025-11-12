// api_gateway/middlewares/correlation.middleware.js
import fp from 'fastify-plugin';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config.js';

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

export default fp(correlationIdMiddleware);
