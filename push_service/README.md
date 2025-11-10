# Push Service

## What the service does
The Push Service is responsible for sending push notifications to various client devices (e.g., mobile apps, web browsers). It consumes messages from a message queue, processes them, and dispatches notifications through appropriate push notification providers.

## The language and framework used
- **Language**: Java
- **Framework**: Spring Boot

## The responsibilities of the service
- **Consume Push Requests**: Listens for `send_push` messages from RabbitMQ.
- **Notification Templating**: Integrates with the Template Service to fetch and render push notification content.
- **Device Token Management**: Potentially interacts with a database to retrieve device tokens for users.
- **Push Notification Dispatch**: Sends push notifications using configured providers (e.g., Firebase Cloud Messaging, Apple Push Notification Service).
- **Error Handling & Retries**: Manages failures in push notification sending and implements retry mechanisms.
- **Logging**: Logs push notification sending attempts and statuses.

## The message queue (RabbitMQ/Kafka) interactions
The Push Service will act as a **consumer** of RabbitMQ. it will subscribe to a queue that receives `send_push` messages, triggered by other services (e.g., API Gateway, User Service).

## The environment variables required (based on .env.example)
- `RABBITMQ_HOST`: Hostname for the RabbitMQ server (e.g., `rabbitmq`)
- `RABBITMQ_PORT`: Port for the RabbitMQ server (e.g., `5672`)
- `RABBITMQ_USER`: Username for RabbitMQ (e.g., `user`)
- `RABBITMQ_PASS`: Password for RabbitMQ (e.g., `password`)
- `FCM_SERVER_KEY`: Server key for Firebase Cloud Messaging (if used).
- `APNS_CERTIFICATE_PATH`: Path to Apple Push Notification Service certificate (if used).
- `TEMPLATE_SERVICE_URL`: URL for the Template Service (e.g., http://template_service:8084)

## The endpoints the service will expose (just list them, no code)
The Push Service is primarily an asynchronous worker and does not expose public REST endpoints. It might expose internal health check endpoints.

## How this service communicates with others (REST or MQ)
The Push Service primarily communicates asynchronously by consuming messages from **RabbitMQ**. It might make synchronous **REST API** calls to the Template Service to fetch notification templates.

## A small architecture diagram (ASCII style)
```
+-------------------+
|    API Gateway    |
|   User Service    |
+---------+---------+
          |
          | MQ (Producer)
          v
+-------------------+
|     RabbitMQ      |
+---------+---------+
          |
          | MQ (Consumer)
          v
+-------------------+
|    Push Service   |
|      (Java)       |
+---------+---------+
          |
          | HTTP/S (Template Service)
          v
+-------------------+
| Template Service  |
+-------------------+
          |
          | External Push Provider
          v
+-------------------+
|  Push Provider    |
+-------------------+
