// api_gateway/src/server.js
const fastify = require('fastify');
const config = require('../config/config');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const correlationIdMiddleware = require('../middlewares/correlation.middleware');
const { logger, loggerMiddleware } = require('../middlewares/logger.middleware');
const routes = require('./routes/index');

const buildServer = () => {
    const app = fastify({
        logger: logger,
        genReqId: (req) => req.headers['x-correlation-id'] || require('uuid').v4(),
    });

    // Register plugins
    app.register(cors, {
        origin: '*', // Adjust as per your CORS policy
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    });
    app.register(helmet);

    // Register custom middlewares
    app.addHook('onRequest', correlationIdMiddleware);
    app.addHook('onRequest', loggerMiddleware);

    // Register routes
    app.register(routes);

    // Health check route
    app.get('/health', async (request, reply) => {
        reply.send({ status: 'ok' });
    });

    return app;
};

const startServer = async () => {
    const app = buildServer();

    try {
        await app.listen({ port: config.PORT, host: '0.0.0.0' });
        logger.info(`API Gateway listening on ${app.server.address().port}`);
    } catch (err) {
        logger.error(`Failed to start API Gateway: ${err.message}`);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = { buildServer, startServer };
