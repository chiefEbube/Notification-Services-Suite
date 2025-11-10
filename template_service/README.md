# Template Service

## What the service does
The Template Service is responsible for storing, managing, and rendering notification templates. It provides a centralized mechanism for other services to retrieve and use pre-defined templates for various notification types (email, push, etc.).

## The language and framework used
- **Language**: Java
- **Framework**: Spring Boot

## The responsibilities of the service
- **Template Storage**: Persists notification templates (e.g., HTML for email, JSON for push) in a database or file system.
- **Template Retrieval**: Provides an API for other services to fetch templates by ID or name.
- **Template Rendering**: Renders templates with dynamic data provided by the requesting service.
- **Template Management**: Allows for creation, update, and deletion of templates.
- **Version Control (Optional)**: May support versioning of templates.

## The message queue (RabbitMQ/Kafka) interactions
The Template Service does not directly interact with message queues for its core functionality. It is typically called synchronously by other services (e.g., Email Service, Push Service) to retrieve and render templates.

## The environment variables required (based on .env.example)
- `DATABASE_URL`: Connection string for the database storing templates (e.g., `postgresql://user:password@postgres:5432/notification_db`)
- `PORT`: The port on which the Template Service will listen (e.g., 8084)

## The endpoints the service will expose (just list them, no code)
- `GET /templates/{id}`: Retrieve a template by ID.
- `POST /templates`: Create a new template.
- `PUT /templates/{id}`: Update an existing template.
- `DELETE /templates/{id}`: Delete a template.
- `POST /templates/{id}/render`: Render a template with provided data.

## How this service communicates with others (REST or MQ)
The Template Service communicates with other services primarily via **REST APIs** (synchronous HTTP/HTTPS calls).

## A small architecture diagram (ASCII style)
```
+-------------------+
|   Email Service   |
|   Push Service    |
+---------+---------+
          |
          | HTTP/S
          v
+-------------------+
| Template Service  |
|      (Java)       |
+---------+---------+
          |
          | DB Connection
          v
+-------------------+
|    PostgreSQL     |
+-------------------+
