# System Architecture

This document outlines the overall architecture of the distributed notification system.

## Microservices

- **API Gateway**: Entry point for all client requests.
- **User Service**: Manages user registration, authentication, and profiles.
- **Email Service**: Handles sending email notifications.
- **Push Service**: Manages sending push notifications to devices.
- **Template Service**: Provides templates for various notification types.

## Communication

- **REST APIs**: For synchronous communication between API Gateway and services.
- **Message Queues (RabbitMQ)**: For asynchronous communication and event-driven interactions.

## Data Storage

- **PostgreSQL**: Primary database for persistent data (e.g., user data, notification logs).
- **Redis**: Caching and session management.

## Infrastructure

- **Docker & Docker Compose**: Containerization and orchestration for development.
