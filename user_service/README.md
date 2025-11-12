# User Service

## What the service does
The User Service is responsible for managing all user-related data and operations, including registration, authentication, profile management, and user data storage.

## The language and framework used
- **Language**: Python
- **Framework**: FastAPI

## The responsibilities of the service
- **User Registration**: Handles the creation of new user accounts.
- **User Profile Management**: Allows users to view and update their profile information.
- **User Data Storage**: Persists user data in a database.
- **Password Management**: Securely stores and manages user passwords.


## The environment variables required (based on .env.example)
- `DATABASE_URL`: Connection string for the PostgreSQL database (e.g., `postgresql://user:password@postgres:5432/notification_db`)
- `RABBITMQ_HOST`: Hostname for the RabbitMQ server (e.g., `rabbitmq`)
- `RABBITMQ_PORT`: Port for the RabbitMQ server (e.g., `5672`)
- `RABBITMQ_USER`: Username for RabbitMQ (e.g., `user`)
- `RABBITMQ_PASS`: Password for RabbitMQ (e.g., `password`)
- `JWT_SECRET`: Secret key for generating and validating JWT tokens.

## The endpoints the service will expose (just list them, no code)
- `POST /api/v1/users/create-user`
- `GET /api/v1/users/{user_id}`
- `DELETE /api/v1/users/{user_id}`
- `GET /api/v1/users/email/{email}`
- `PUT /api/v1/users/update-push-token/{user_id}`
- `GET /api/v1/users/preferences/{user_id}`
- `PUT /api/v1/users/preferences/{user_id}`
- `POST /api/v1/users/verify-password`
- `PUT /api/v1/users/update-password/{user_id}`
- `GET /api/v1/users/all/users`

## For Other Services

### How to Use This Service

**From API Gateway (Node.js example):**
```javascript
// Create user
const response = await fetch('http://user-service:3001/api/v1/users/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "John",
    email: "john@example.com",
    password: "secure123",
    preferences: { email: true, push: true }
  })
});

// Get user
const user = await fetch('http://user-service:3001/api/v1/users/USER_ID');

// Verify password (for login)
const verified = await fetch('http://user-service:3001/api/v1/users/verify-password', {
  method: 'POST',
  body: JSON.stringify({
    email: "john@example.com",
    password: "secure123"
  })
});
```

## A small architecture diagram (ASCII style)
```
+-------------------+
|  Client Request   |
+---------+---------+
          |
          | 
          v
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
+---------------------------+
|    PostgreSQL  or Redis   |
+---------------------------+
         
