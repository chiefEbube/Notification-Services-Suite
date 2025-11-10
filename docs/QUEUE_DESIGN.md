# Queue Design

This document describes the design of the message queues used in the notification system, primarily utilizing RabbitMQ.

## Purpose

Message queues facilitate asynchronous communication between microservices, ensuring decoupling, scalability, and resilience.

## Key Concepts

- **Producers**: Services that send messages to a queue (e.g., User Service sending a "user created" event).
- **Consumers**: Services that receive and process messages from a queue (e.g., Email Service consuming "send email" requests).
- **Exchanges**: Receive messages from producers and route them to message queues.
- **Queues**: Store messages until they are consumed.
- **Bindings**: Rules that connect exchanges to queues.

## Examples of Queue Usage

- **User Events**: User Service publishes events (e.g., `user.created`, `user.updated`) to a `user_events` exchange.
- **Notification Requests**: Other services publish `send_email`, `send_push` messages to a `notification_requests` exchange, which are then routed to the respective Email and Push services.
