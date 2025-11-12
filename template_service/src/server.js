const fastify = require('fastify');
const config = require('../config/config');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const { successResponse, errorResponse } = require('./utils/response');
const { query } = require('./db'); // Import database query function
const templateRoutes = require('./routes/template.routes'); // Import template routes

const buildServer = () => {
    const app = fastify({
        logger: {
            level: config.LOG_LEVEL,
            transport: {
                target: 'pino-pretty',
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

    app.register(cors, {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', config.CORRELATION_ID_HEADER],
    });
    app.register(helmet);

    // Register template routes
    app.register(templateRoutes, { prefix: '/templates' });

    // Health check route
    app.get('/health', async (request, reply) => {
        try {
            // Attempt a simple query to check DB connection
            await query('SELECT 1');
            reply.send(successResponse({ status: 'ok', database: 'connected' }, 'Template Service is healthy'));
        } catch (dbError) {
            request.log.error({ dbError }, 'Database connection failed during health check');
            reply.code(500).send(errorResponse('Database Error', 'Template Service is unhealthy: Database connection failed'));
        }
    });

    app.setErrorHandler((error, request, reply) => {
        request.log.error(error);
        const statusCode = error.statusCode || 500;
        const errorMessage = error.validation ? 'Validation Error' : error.message;
        reply.status(statusCode).send(errorResponse(errorMessage, error.message));
    });

    return app;
};

const startServer = async () => {
    const app = buildServer();

    try {
        await app.listen({ port: config.PORT, host: '0.0.0.0' });
        app.log.info(`Template Service listening on ${app.server.address().port}`);
    } catch (err) {
        app.log.error(`Failed to start Template Service: ${err.message}`);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = { buildServer, startServer };
