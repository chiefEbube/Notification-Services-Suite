# API Gateway Service

## What the service does
The API Gateway acts as the single entry point for all client requests into the microservices ecosystem. It handles request routing, composition, and protocol translation.

## The language and framework used
- **Language**: Node.js
- **Framework**: Fastify

## The responsibilities of the service
- **Request Routing**: Directs incoming requests to the appropriate microservice based on predefined rules.
- **Authentication & Authorization**: Verifies user credentials and permissions before forwarding requests.
- **Rate Limiting**: Controls the number of requests a client can make within a given timeframe.
- **Load Balancing**: Distributes incoming traffic across multiple instances of microservices.
- **API Composition**: Aggregates responses from multiple microservices into a single response for the client.
- **Protocol Translation**: Converts client-specific protocols to internal service protocols if necessary.

## The message queue (RabbitMQ/Kafka) interactions
The API Gateway primarily communicates synchronously via REST. It does not directly interact with message queues for its core routing functions, but it might trigger asynchronous operations in downstream services that do.

## The environment variables required (based on .env.example)
- `PORT`: The port on which the API Gateway will listen (e.g., 8080)
- `RABBITMQ_URL`: URL for the RabbitMQ server (e.g., `amqp://user:password@rabbitmq:5672`)
- `USER_SERVICE_URL`: URL for the User Service (e.g., http://user_service:8081)
- `TEMPLATE_SERVICE_URL`: URL for the Template Service (e.g., http://template_service:8084)
- `JWT_SECRET`: Secret key for JWT token validation.
- `NOTIFICATION_DB_URL`: Connection string for the Notification Database (e.g., `postgresql://user:password@postgres:5432/notification_db`)
- `LOG_LEVEL`: Logging level (e.g., `info`, `debug`, `error`)

## The endpoints the service will expose (just list them, no code)
- `GET /health`
- `POST /users`
- `GET /users/{id}`
- `PUT /users/{id}`
- `POST /notifications/email`
- `POST /notifications/push`

## How this service communicates with others (REST or MQ)
The API Gateway communicates with other microservices primarily via **REST APIs** (synchronous HTTP/HTTPS calls).

## A small architecture diagram (ASCII style)
```
+-------------------+
|   Client Device   |
+---------+---------+
          |
          | HTTP/S
          v
+-------------------+
|    API Gateway    |
|    (Node.js)      |
+---------+---------+
          |
          | HTTP/S
          +---------------------------------+
          |                                 |
          v                                 v
+-------------------+             +-------------------+
|   User Service    |             |   Email Service   |
|     (Python)      |             |     (Node.js)     |
+-------------------+             +-------------------+
          |                                 |
          | HTTP/S                          | HTTP/S
          v                                 v
+-------------------+             +-------------------+
|   Push Service    |             | Template Service  |
|      (Java)       |             |      (Java)       |
+-------------------+             +-------------------+
