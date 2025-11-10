// api_gateway/middlewares/correlation.middleware.js
const { v4: uuidv4 } = require('uuid');

function correlationIdMiddleware(request, reply, done) {
    let correlationId = request.headers['x-correlation-id'];
    if (!correlationId) {
        correlationId = uuidv4();
    }
    request.id = correlationId;
    reply.header('x-correlation-id', correlationId);
    done();
}

module.exports = correlationIdMiddleware;
