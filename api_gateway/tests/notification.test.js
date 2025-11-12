// api_gateway/tests/notification.test.js
process.env.NODE_ENV = 'test'; // Set NODE_ENV to test for RabbitMQ mocking

const { test } = require('node:test');
const assert = require('node:assert');
const { buildServer } = require('../src/server');
const config = require('../config/config');
const { v4: uuidv4 } = require('uuid');

// Mock RabbitMQ service to prevent actual queueing during tests
// This mock is now less critical as rabbitmq.service.js handles NODE_ENV=test
require('node:test').mock.method(require('../services/rabbitmq.service'), 'sendToQueue', async (queueName, message) => {
    console.log(`MOCK: Message sent to queue ${queueName}: ${JSON.stringify(message)}`);
    return true;
});

test('API Gateway Health Check', async (t) => {
    const app = buildServer();
    await app.ready();

    t.after(async () => {
        await app.close();
    });

    const response = await app.inject({
        method: 'GET',
        url: '/health',
    });

    assert.strictEqual(response.statusCode, 200, 'GET /health should return 200 OK');
    assert.deepStrictEqual(JSON.parse(response.payload), { status: 'ok' }, 'GET /health should return { status: "ok" }');
});

test('POST /notifications/send with valid body returns 202', async (t) => {
    const app = buildServer();
    await app.ready();

    t.after(async () => {
        await app.close();
    });

    const correlationId = uuidv4();
    const payload = {
        user_id: 123,
        template_id: 'welcome-email',
        notification_type: 'email',
        variables: { name: 'John Doe' },
    };

    const response = await app.inject({
        method: 'POST',
        url: '/notifications/send',
        headers: {
            [config.CORRELATION_ID_HEADER]: correlationId,
            'Content-Type': 'application/json',
        },
        payload: JSON.stringify(payload),
    });

    assert.strictEqual(response.statusCode, 202, 'POST /notifications/send should return 202 Accepted');
    const responseBody = JSON.parse(response.payload);
    assert.strictEqual(responseBody.success, true, 'Response should indicate success');
    assert.strictEqual(responseBody.data.status, 'accepted', 'Response status should be accepted');
    assert.strictEqual(response.headers[config.CORRELATION_ID_HEADER], correlationId, 'Response should include correlation ID header');
});

test('POST /notifications/send with invalid notification_type returns 400', async (t) => {
    const app = buildServer();
    await app.ready();

    t.after(async () => {
        await app.close();
    });

    const correlationId = uuidv4();
    const payload = {
        user_id: 123,
        template_id: 'welcome-email',
        notification_type: 'sms', // Invalid type
        variables: { name: 'John Doe' },
    };

    const response = await app.inject({
        method: 'POST',
        url: '/notifications/send',
        headers: {
            [config.CORRELATION_ID_HEADER]: correlationId,
            'Content-Type': 'application/json',
        },
        payload: JSON.stringify(payload),
    });

    assert.strictEqual(response.statusCode, 400, 'POST /notifications/send with invalid type should return 400 Bad Request');
    const responseBody = JSON.parse(response.payload);
    assert.strictEqual(responseBody.success, false, 'Response should indicate failure');
    assert.strictEqual(responseBody.error, 'Validation Error', 'Response error should be "Validation Error"');
});

test('POST /notifications/send with missing required fields returns 400', async (t) => {
    const app = buildServer();
    await app.ready();

    t.after(async () => {
        await app.close();
    });

    const correlationId = uuidv4();
    const payload = {
        template_id: 'welcome-email',
        notification_type: 'email',
        variables: { name: 'John Doe' },
    }; // user_id is missing

    const response = await app.inject({
        method: 'POST',
        url: '/notifications/send',
        headers: {
            [config.CORRELATION_ID_HEADER]: correlationId,
            'Content-Type': 'application/json',
        },
        payload: JSON.stringify(payload),
    });

    assert.strictEqual(response.statusCode, 400, 'POST /notifications/send with missing fields should return 400 Bad Request');
    const responseBody = JSON.parse(response.payload);
    assert.strictEqual(responseBody.success, false, 'Response should indicate failure');
    assert.strictEqual(responseBody.error, 'Validation Error', 'Response error should be "Validation Error"');
});
