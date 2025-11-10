# User Service

## What the service does
The User Service is responsible for managing all user-related data and operations, including registration, authentication, profile management, and user data storage.

## The language and framework used
- **Language**: Python
- **Framework**: FastAPI

## The responsibilities of the service
- **User Registration**: Handles the creation of new user accounts.
- **User Authentication**: Verifies user credentials (e.g., login) and issues authentication tokens.
- **User Authorization**: Manages user roles and permissions.
- **User Profile Management**: Allows users to view and update their profile information.
- **User Data Storage**: Persists user data in a database.
- **Password Management**: Securely stores and manages user passwords.

## The message queue (RabbitMQ/Kafka) interactions
The User Service will act as a **producer** to RabbitMQ. It will publish events related to user activities (e.g., `user.created`, `user.updated`, `user.deleted`) to a `user_events` exchange, which other services can consume.

## The environment variables required (based on .env.example)
- `DATABASE_URL`: Connection string for the PostgreSQL database (e.g., `postgresql://user:password@postgres:5432/notification_db`)
- `RABBITMQ_HOST`: Hostname for the RabbitMQ server (e.g., `rabbitmq`)
- `RABBITMQ_PORT`: Port for the RabbitMQ server (e.g., `5672`)
- `RABBITMQ_USER`: Username for RabbitMQ (e.g., `user`)
- `RABBITMQ_PASS`: Password for RabbitMQ (e.g., `password`)
- `JWT_SECRET`: Secret key for generating and validating JWT tokens.

## The endpoints the service will expose (just list them, no code)
- `POST /register`
- `POST /login`
- `GET /users/{id}`
- `PUT /users/{id}`
- `DELETE /users/{id}`
- `GET /users/me` (for authenticated user profile)

## How this service communicates with others (REST or MQ)
The User Service exposes its functionalities via **REST APIs** for the API Gateway. It communicates asynchronously with other services by publishing events to **RabbitMQ**.

## A small architecture diagram (ASCII style)
```
+-------------------+
|    API Gateway    |
+---------+---------+
          |
          | HTTP/S
          v
+-------------------+
|    User Service   |
|     (Python)      |
+---------+---------+
          |
          | DB Connection
          v
+-------------------+
|    PostgreSQL     |
+-------------------+
          |
          | MQ (Producer)
          v
+-------------------+
|     RabbitMQ      |
+-------------------+
