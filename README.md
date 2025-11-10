# Distributed Notification System

This repository contains a distributed notification system built with multiple microservices.

## System Architecture Overview

The system is designed with a microservices architecture, promoting scalability, resilience, and independent deployment. It consists of an API Gateway as the entry point, and several specialized services for user management, email notifications, push notifications, and template management. Communication between services is handled via REST APIs for synchronous interactions and message queues (RabbitMQ) for asynchronous, event-driven operations. Data is persisted in PostgreSQL, with Redis used for caching and session management.

## Services

| Service           | Language      | Purpose                                                              |
|-------------------|---------------|----------------------------------------------------------------------|
| **API Gateway**   | Go            | Handles incoming requests, routing, authentication, and composition. |
| **User Service**  | Python (FastAPI)| Manages user authentication, authorization, and profile information. |
| **Email Service** | Node.js       | Responsible for sending email notifications.                         |
| **Push Service**  | Java (Spring Boot)| Manages sending push notifications to various devices.             |
| **Template Service**| Java (Spring Boot)| Provides and manages notification templates.                       |

## How to Run the Project (Placeholder)

To run this project locally using Docker Compose:

1.  **Prerequisites**: Ensure Docker and Docker Compose are installed on your system.
2.  **Clone the repository**:
    ```bash
    git clone [repository-url]
    cd notification-services-suite
    ```
3.  **Configure Environment Variables**:
    Each service has a `.env.example` file. Copy these to `.env` files within each service directory and fill in the necessary values.
    ```bash
    cp api_gateway/.env.example api_gateway/.env
    # Repeat for other services
    ```
4.  **Build and Start Services**:
    ```bash
    docker-compose -f infra/docker-compose.yml up --build
    ```
    This will build the Docker images for each service and start all containers, including RabbitMQ, Redis, and PostgreSQL.

## Tech Stack Choices

-   **Go (API Gateway)**: Chosen for its excellent performance, concurrency features (goroutines), and strong ecosystem for building efficient network services.
-   **Python (FastAPI - User Service)**: Selected for rapid API development, high performance (comparable to Node.js and Go for certain workloads), and strong data validation capabilities.
-   **Node.js (Email Service)**: Ideal for I/O-bound operations like sending emails due to its non-blocking, event-driven architecture.
-   **Java (Spring Boot - Push & Template Services)**: A robust and widely adopted framework for enterprise-grade applications, offering comprehensive features for building scalable and maintainable services.
-   **RabbitMQ**: A mature and reliable message broker for asynchronous communication, enabling loose coupling and fault tolerance between services.
-   **PostgreSQL**: A powerful, open-source relational database known for its reliability, feature richness, and strong support for complex queries.
-   **Redis**: An in-memory data store used for caching, session management, and real-time data access, providing high performance.

## Environment Variables

Each microservice relies on environment variables for configuration, such as database connection strings, API keys, and service URLs. Refer to the `.env.example` file within each service directory for a list of required variables. It is recommended to create a `.env` file from the example and populate it with your specific values for local development.

## Contributors

-   [Your Name/Team Member 1]
-   [Team Member 2]
-   [Team Member 3]
