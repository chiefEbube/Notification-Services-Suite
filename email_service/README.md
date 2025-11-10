# Email Service

## What the service does
The Email Service is dedicated to sending email notifications to users. It consumes messages from a message queue, processes them, and dispatches emails using an external email provider.

## The language and framework used
- **Language**: Node.js
- **Framework**: (To be determined, likely Express.js or a similar lightweight framework)

## The responsibilities of the service
- **Consume Email Requests**: Listens for `send_email` messages from RabbitMQ.
- **Email Templating**: Integrates with the Template Service to fetch and render email content.
- **Email Dispatch**: Sends emails using a configured email provider (e.g., SendGrid, Mailgun, Nodemailer).
- **Error Handling & Retries**: Manages failures in email sending and implements retry mechanisms.
- **Logging**: Logs email sending attempts and statuses.

## The message queue (RabbitMQ/Kafka) interactions
The Email Service will act as a **consumer** of RabbitMQ. It will subscribe to a queue that receives `send_email` messages, triggered by other services (e.g., API Gateway, User Service).

## The environment variables required (based on .env.example)
- `RABBITMQ_HOST`: Hostname for the RabbitMQ server (e.g., `rabbitmq`)
- `RABBITMQ_PORT`: Port for the RabbitMQ server (e.g., `5672`)
- `RABBITMQ_USER`: Username for RabbitMQ (e.g., `user`)
- `RABBITMQ_PASS`: Password for RabbitMQ (e.g., `password`)
- `EMAIL_PROVIDER_API_KEY`: API key for the chosen email sending service.
- `SENDER_EMAIL`: The default email address from which notifications will be sent.
- `TEMPLATE_SERVICE_URL`: URL for the Template Service (e.g., http://template_service:8084)

## The endpoints the service will expose (just list them, no code)
The Email Service is primarily an asynchronous worker and does not expose public REST endpoints. It might expose internal health check endpoints.

## How this service communicates with others (REST or MQ)
The Email Service primarily communicates asynchronously by consuming messages from **RabbitMQ**. It might make synchronous **REST API** calls to the Template Service to fetch email templates.

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
|   Email Service   |
|     (Node.js)     |
+---------+---------+
          |
          | HTTP/S (Template Service)
          v
+-------------------+
| Template Service  |
+-------------------+
          |
          | External Email Provider
          v
+-------------------+
|  Email Provider   |
+-------------------+
