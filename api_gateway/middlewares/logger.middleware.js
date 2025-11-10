// api_gateway/middlewares/logger.middleware.js
const pino = require('pino');
const config = require('../config/config');

const logger = pino({
    level: config.LOG_LEVEL,
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss Z',
            ignore: 'pid,hostname',
        },
    },
});

function loggerMiddleware(request, reply, done) {
    request.log = logger.child({ correlationId: request.id });
    done();
}

module.exports = { logger, loggerMiddleware };
