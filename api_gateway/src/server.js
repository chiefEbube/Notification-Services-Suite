// api_gateway/src/server.js
const fastify = require('fastify');
const config = require('../config/config');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const loggerPlugin = require('../middlewares/logger.middleware');
const correlationIdPlugin = require('../middlewares/correlation.middleware');
const authPlugin = require('../middlewares/auth.middleware');
const { connectRabbitMQ } = require('../services/rabbitmq.service'); // Import RabbitMQ connection
const rateLimit = require('@fastify/rate-limit'); // Import rate-limit plugin
const Redis = require('ioredis'); // Import ioredis
const routes = require('./routes/index');

const buildServer = () => {
    const app = fastify({
        logger: { // Configure Fastify's built-in logger
            level: config.LOG_LEVEL,
            transport: {
                target: 'pino-pretty', // Use pino-pretty for development readability
                options: {
                    colorize: true,
                    translateTime: 'SYS:HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            },
        },
        schemaErrorFormatter: (errors, dataVar) => {
            const errorMessage = errors.map(err => err.message).join(', ');
            return new Error(errorMessage);
        },
        genReqId: (req) => req.headers[config.CORRELATION_ID_HEADER] || require('uuid').v4(),
    });

    // Initialize Redis client
    const redis = new Redis(config.REDIS_URL);
    app.decorate('redis', redis); // Decorate Fastify instance with Redis client

    app.addHook('onClose', async (instance) => {
        await instance.redis.quit();
        instance.log.info('Redis client disconnected.');
    });

    // Register plugins
    app.register(cors, {
        origin: '*', // Adjust as per your CORS policy
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', config.CORRELATION_ID_HEADER],
    });
    app.register(helmet);

    // Register rate limiting
    app.register(rateLimit, {
        max: 100, // Max requests per window
        timeWindow: '1 minute', // Time window for rate limiting
        errorResponseBuilder: (request, context) => {
            return {
                success: false,
                message: 'Too many requests',
                error: 'Rate Limit Exceeded',
                meta: {
                    limit: context.max,
                    current: context.current,
                    remaining: context.ttl,
                },
            };
        },
    });

    // Register custom middlewares
    app.register(correlationIdPlugin); // Register as a plugin
    app.register(loggerPlugin); // Register logger as a plugin (now only adds hooks)
    app.register(authPlugin); // Register authentication middleware

    // Register routes
    app.register(require('./routes/notification.routes'), { prefix: '/notifications' });
    // app.register(routes); // Original registration, keeping direct for now

    // Health check route
    app.get('/health', async (request, reply) => {
        reply.send({ status: 'ok' });
    });

    app.setErrorHandler((error, request, reply) => {
        request.log.error(error);
        const { errorResponse } = require('./utils/response');
        const statusCode = error.statusCode || 500;
        const errorMessage = error.validation ? 'Validation Error' : error.message;
        reply.status(statusCode).send(errorResponse(errorMessage, error.message));
    });

    return app;
};

const startServer = async () => {
    const app = buildServer();

    try {
        await connectRabbitMQ(); // Connect to RabbitMQ before starting the server
        await app.listen({ port: config.PORT, host: '0.0.0.0' });
        app.log.info(`API Gateway listening on ${app.server.address().port}`);
    } catch (err) {
        app.log.error(`Failed to start API Gateway: ${err.message}`);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = { buildServer, startServer };
