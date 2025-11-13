# Notification Services Suite - Architecture & Flow Documentation

This document provides a comprehensive visual explanation of how the Notification Services Suite works.

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Service Details](#service-details)
4. [Request Flow](#request-flow)
5. [Data Flow](#data-flow)
6. [Message Queue Flow](#message-queue-flow)
7. [Technology Stack](#technology-stack)

---

## 🎯 System Overview

The Notification Services Suite is a **distributed microservices system** that handles sending email and push notifications to users. It's designed with:

- **5 Microservices**: API Gateway, User Service, Email Service, Push Service, Template Service
- **3 Infrastructure Services**: PostgreSQL, Redis, RabbitMQ
- **Asynchronous Processing**: Using message queues for scalability
- **RESTful APIs**: For synchronous communication
- **Containerized**: All services run in Docker containers

---

## 🏗️ Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Client[Client Application]
    end
    
    subgraph "API Gateway"
        API[API Gateway<br/>Node.js/Fastify<br/>Port: 8080]
    end
    
    subgraph "Microservices"
        US[User Service<br/>Python/FastAPI<br/>Port: 8081]
        TS[Template Service<br/>Node.js/Fastify<br/>Port: 8084]
        ES[Email Service<br/>Node.js/NestJS<br/>Port: 8083]
        PS[Push Service<br/>Node.js/NestJS<br/>Port: 8082]
    end
    
    subgraph "Message Queue"
        MQ[RabbitMQ<br/>Port: 5672]
        EQ[email_queue]
        PQ[push_queue]
    end
    
    subgraph "Data Storage"
        PG[(PostgreSQL<br/>Port: 5432)]
        RD[(Redis<br/>Port: 6379)]
    end
    
    subgraph "External Services"
        SG[SendGrid<br/>Email Provider]
        FCM[Firebase Cloud Messaging<br/>Push Provider]
    end
    
    Client -->|HTTP Request| API
    API -->|REST API| US
    API -->|REST API| TS
    API -->|Publish Message| MQ
    MQ -->|Consume| ES
    MQ -->|Consume| PS
    ES -->|Fetch Template| TS
    ES -->|Send Email| SG
    PS -->|Send Push| FCM
    US -->|Read/Write| PG
    TS -->|Read/Write| PG
    API -->|Cache/Status| RD
    US -->|Cache| RD
    
    MQ -.->|Routes to| EQ
    MQ -.->|Routes to| PQ
    EQ -.->|Consumes| ES
    PQ -.->|Consumes| PS
```

---

## 🔄 Request Flow: Sending a Notification

### Sequence Diagram

```mermaid
sequenceDiagram
    participant Client
    participant API as API Gateway
    participant Redis
    participant US as User Service
    participant TS as Template Service
    participant MQ as RabbitMQ
    participant ES as Email Service
    participant SG as SendGrid
    
    Client->>API: POST /notifications/send<br/>{user_id, template_id, type, variables}
    
    Note over API: Generate correlation_id
    
    API->>Redis: Store status: PENDING
    
    API->>US: GET /api/v1/users/{user_id}
    US-->>API: User data (email, preferences)
    
    API->>TS: GET /templates/{template_id}?variables={...}
    TS-->>API: Template content
    
    API->>MQ: Publish to email_queue<br/>{user_data, template_content, variables, correlation_id}
    API->>Redis: Update status: QUEUED
    API-->>Client: 202 Accepted<br/>{notification_id, status: "accepted"}
    
    Note over MQ,ES: Asynchronous Processing
    
    MQ->>ES: Deliver message from email_queue
    ES->>ES: Substitute variables in template
    ES->>SG: Send email via SendGrid API
    SG-->>ES: 202 Accepted
    ES->>MQ: Acknowledge message
    
    Note over Client: Client can check status
    
    Client->>API: GET /notifications/{id}/status
    API->>Redis: Get status
    Redis-->>API: Status data
    API-->>Client: {status: "DELIVERED", ...}
```

---

## 📊 Data Flow Diagram

```mermaid
flowchart TD
    Start([Client Request]) --> Validate{Validate Request}
    Validate -->|Invalid| Error[Return 400 Error]
    Validate -->|Valid| StoreStatus[Store Status in Redis: PENDING]
    
    StoreStatus --> FetchUser[Fetch User Data from User Service]
    FetchUser --> UserCheck{User Exists?}
    UserCheck -->|No| Error
    UserCheck -->|Yes| FetchTemplate[Fetch Template from Template Service]
    
    FetchTemplate --> TemplateCheck{Template Exists?}
    TemplateCheck -->|No| Error
    TemplateCheck -->|Yes| CheckPrefs{Check User Preferences}
    
    CheckPrefs -->|Email Disabled| Skip[Skip Email, Return Success]
    CheckPrefs -->|Email Enabled| Publish[Publish to RabbitMQ Queue]
    
    Publish --> UpdateStatus[Update Status in Redis: QUEUED]
    UpdateStatus --> Return[Return 202 Accepted to Client]
    
    Publish -.->|Async| Queue[RabbitMQ Queue]
    Queue -.->|Consume| Process[Email Service Processes]
    Process --> Substitute[Substitute Variables]
    Substitute --> SendEmail[Send via SendGrid]
    SendEmail --> Success{Success?}
    Success -->|Yes| Delivered[Update Status: DELIVERED]
    Success -->|No| Failed[Update Status: FAILED]
    
    style Start fill:#e1f5ff
    style Return fill:#c8e6c9
    style Error fill:#ffcdd2
    style Delivered fill:#c8e6c9
    style Failed fill:#ffcdd2
```

---

## 🗄️ Database Schema Overview

```mermaid
erDiagram
    USERS ||--o{ USER_PREFERENCES : has
    USERS ||--o{ NOTIFICATIONS : receives
    
    USERS {
        uuid id PK
        string name
        string email UK
        string push_token
        timestamp created_at
        timestamp updated_at
    }
    
    USER_PREFERENCES {
        uuid id PK
        uuid user_id FK
        boolean email
        boolean push
        timestamp created_at
    }
    
    TEMPLATES {
        uuid id PK
        string name
        text content
        string type
        string language
        int version
        timestamp created_at
    }
    
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        uuid template_id FK
        string type
        string status
        json variables
        timestamp created_at
    }
```

---

## 🔌 Service Communication Patterns

### 1. Synchronous Communication (REST APIs)

```mermaid
graph LR
    API[API Gateway] -->|HTTP GET| US[User Service]
    API -->|HTTP GET| TS[Template Service]
    
    style API fill:#4CAF50
    style US fill:#2196F3
    style TS fill:#2196F3
```

**Used for:**
- Fetching user data
- Fetching template data
- Health checks
- Status queries

### 2. Asynchronous Communication (Message Queue)

```mermaid
graph LR
    API[API Gateway] -->|Publish| MQ[RabbitMQ]
    MQ -->|Consume| ES[Email Service]
    MQ -->|Consume| PS[Push Service]
    
    style API fill:#4CAF50
    style MQ fill:#FF9800
    style ES fill:#9C27B0
    style PS fill:#9C27B0
```

**Used for:**
- Sending notifications (email/push)
- Decoupling services
- Handling high load
- Retry mechanisms

---

## 📦 Message Queue Architecture

```mermaid
graph TB
    subgraph "RabbitMQ Exchange"
        EX[notifications.direct]
    end
    
    subgraph "Queues"
        EQ[email_queue<br/>Durable: true]
        PQ[push_queue<br/>Durable: true]
        DLQ[dead_letter_queue<br/>Failed messages]
    end
    
    subgraph "Consumers"
        ES[Email Service<br/>Consumer]
        PS[Push Service<br/>Consumer]
    end
    
    API[API Gateway] -->|Publish| EX
    EX -->|Route: email| EQ
    EX -->|Route: push| PQ
    EQ -->|Consume| ES
    PQ -->|Consume| PS
    ES -.->|Failed| DLQ
    PS -.->|Failed| DLQ
    
    style EX fill:#FF9800
    style EQ fill:#E91E63
    style PQ fill:#E91E63
    style DLQ fill:#F44336
```

**Queue Configuration:**
- **email_queue**: Handles email notification requests
- **push_queue**: Handles push notification requests
- **dead_letter_queue**: Stores failed messages for retry

---

## 🛠️ Technology Stack

### Services

| Service | Technology | Framework | Port | Purpose |
|---------|-----------|-----------|------|---------|
| **API Gateway** | Node.js | Fastify | 8080 | Entry point, routing, auth |
| **User Service** | Python | FastAPI | 8081 | User management |
| **Email Service** | Node.js | NestJS | 8083 | Email notifications |
| **Push Service** | Node.js | NestJS | 8082 | Push notifications |
| **Template Service** | Node.js | Fastify | 8084 | Template management |

### Infrastructure

| Component | Technology | Port | Purpose |
|-----------|-----------|------|---------|
| **PostgreSQL** | PostgreSQL 13 | 5432 | Primary database |
| **Redis** | Redis 6 | 6379 | Caching, status tracking |
| **RabbitMQ** | RabbitMQ 3 | 5672 | Message queue |

### External Services

| Service | Purpose |
|---------|---------|
| **SendGrid** | Email delivery |
| **Firebase Cloud Messaging** | Push notification delivery |

---

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as API Gateway
    participant Redis
    participant US as User Service
    
    Client->>API: Request with JWT Token
    API->>API: Extract token from header
    API->>API: Verify JWT signature
    API->>Redis: Check token blacklist
    Redis-->>API: Token valid
    API->>US: Validate user exists
    US-->>API: User valid
    API->>API: Attach user to request
    API->>API: Process request
    API-->>Client: Response
```

**Note:** For testing, `SKIP_AUTH=true` bypasses authentication.

---

## 📈 Notification Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: Request received
    PENDING --> QUEUED: Published to RabbitMQ
    PENDING --> FAILED: Validation error
    QUEUED --> PROCESSING: Service consumes message
    PROCESSING --> DELIVERED: Successfully sent
    PROCESSING --> FAILED: Send error
    DELIVERED --> [*]
    FAILED --> [*]
    
    note right of PENDING
        Stored in Redis
        with 1 hour TTL
    end note
    
    note right of QUEUED
        Message in RabbitMQ
        waiting for consumer
    end note
```

**Status Values:**
- `PENDING`: Request received, being validated
- `QUEUED`: Message published to RabbitMQ
- `PROCESSING`: Service is processing the notification
- `DELIVERED`: Successfully sent to provider
- `FAILED`: Error occurred during processing

---

## 🔄 Complete Notification Flow (Email Example)

### Step-by-Step Process

1. **Client Request**
   ```
   POST /notifications/send
   {
     "user_id": "uuid",
     "template_id": "uuid",
     "notification_type": "email",
     "variables": {"name": "John", "link": "https://..."}
   }
   ```

2. **API Gateway Processing**
   - Generates `correlation_id` (UUID)
   - Stores initial status in Redis: `PENDING`
   - Fetches user data from User Service
   - Fetches template from Template Service
   - Validates user preferences

3. **Message Publishing**
   - Creates message payload with all data
   - Publishes to `email_queue` in RabbitMQ
   - Updates status in Redis: `QUEUED`
   - Returns `202 Accepted` to client

4. **Email Service Processing** (Asynchronous)
   - Consumes message from `email_queue`
   - Substitutes variables in template
   - Calls SendGrid API to send email
   - Updates status in Redis: `DELIVERED` or `FAILED`

5. **Status Checking**
   ```
   GET /notifications/{correlation_id}/status
   Returns: {
     "status": "DELIVERED",
     "timestamp": "...",
     "details": "..."
   }
   ```

---

## 🎨 Visual Component Diagram

```mermaid
graph TB
    subgraph "Frontend/Client"
        WEB[Web Application]
        MOBILE[Mobile App]
    end
    
    subgraph "API Layer"
        GATEWAY[API Gateway<br/>Fastify]
    end
    
    subgraph "Business Logic"
        USER[User Service<br/>FastAPI]
        TEMPLATE[Template Service<br/>Fastify]
    end
    
    subgraph "Notification Workers"
        EMAIL[Email Service<br/>NestJS]
        PUSH[Push Service<br/>NestJS]
    end
    
    subgraph "Message Broker"
        RABBIT[RabbitMQ]
    end
    
    subgraph "Data Layer"
        POSTGRES[(PostgreSQL)]
        REDIS[(Redis Cache)]
    end
    
    subgraph "External APIs"
        SENDGRID[SendGrid]
        FIREBASE[Firebase FCM]
    end
    
    WEB --> GATEWAY
    MOBILE --> GATEWAY
    GATEWAY --> USER
    GATEWAY --> TEMPLATE
    GATEWAY --> RABBIT
    RABBIT --> EMAIL
    RABBIT --> PUSH
    EMAIL --> TEMPLATE
    EMAIL --> SENDGRID
    PUSH --> FIREBASE
    USER --> POSTGRES
    TEMPLATE --> POSTGRES
    GATEWAY --> REDIS
    USER --> REDIS
    
    style GATEWAY fill:#4CAF50
    style USER fill:#2196F3
    style TEMPLATE fill:#2196F3
    style EMAIL fill:#9C27B0
    style PUSH fill:#9C27B0
    style RABBIT fill:#FF9800
    style POSTGRES fill:#009688
    style REDIS fill:#F44336
```

---

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Docker Network: notification_network"
        subgraph "Services"
            AG[api_gateway:8080]
            US[user_service:8081]
            ES[email_service:8083]
            PS[push_service:8082]
            TS[template_service:8084]
        end
        
        subgraph "Infrastructure"
            PG[(postgres:5432)]
            RD[(redis:6379)]
            MQ[rabbitmq:5672]
        end
    end
    
    CLIENT[External Client] -->|HTTP| AG
    AG -.->|Internal Network| US
    AG -.->|Internal Network| TS
    AG -->|AMQP| MQ
    MQ -.->|AMQP| ES
    MQ -.->|AMQP| PS
    US -->|SQL| PG
    TS -->|SQL| PG
    AG -->|Redis Protocol| RD
    US -->|Redis Protocol| RD
    
    style AG fill:#4CAF50
    style US fill:#2196F3
    style ES fill:#9C27B0
    style PS fill:#9C27B0
    style TS fill:#2196F3
    style PG fill:#009688
    style RD fill:#F44336
    style MQ fill:#FF9800
```

---

## 📝 Key Design Patterns

### 1. **API Gateway Pattern**
- Single entry point for all requests
- Handles authentication, routing, and composition
- Reduces client complexity

### 2. **Message Queue Pattern**
- Decouples services
- Enables asynchronous processing
- Provides resilience and scalability

### 3. **Microservices Pattern**
- Each service has a single responsibility
- Independent deployment and scaling
- Technology diversity (Node.js, Python)

### 4. **Caching Pattern**
- Redis for fast status lookups
- Reduces database load
- Improves response times

### 5. **Template Pattern**
- Centralized template management
- Variable substitution
- Multi-language support

---

## 🔍 Monitoring & Observability

```mermaid
graph LR
    subgraph "Services"
        AG[API Gateway]
        US[User Service]
        ES[Email Service]
        PS[Push Service]
        TS[Template Service]
    end
    
    subgraph "Health Checks"
        HC1[/health endpoints]
    end
    
    subgraph "Logging"
        LOGS[Service Logs]
    end
    
    subgraph "Metrics"
        METRICS[Redis Status<br/>RabbitMQ Metrics]
    end
    
    AG --> HC1
    US --> HC1
    ES --> HC1
    PS --> HC1
    TS --> HC1
    
    AG --> LOGS
    US --> LOGS
    ES --> LOGS
    PS --> LOGS
    TS --> LOGS
    
    AG --> METRICS
    ES --> METRICS
    PS --> METRICS
```

**Health Check Endpoints:**
- `GET /health` - Available on all services
- Returns service status and dependencies

---

## 📚 Summary

The Notification Services Suite is a **well-architected microservices system** that:

✅ **Scales horizontally** - Each service can scale independently  
✅ **Resilient** - Message queues handle failures gracefully  
✅ **Fast** - Redis caching and asynchronous processing  
✅ **Maintainable** - Clear separation of concerns  
✅ **Flexible** - Easy to add new notification types  

The system follows **best practices** for microservices architecture, using appropriate communication patterns (REST for sync, queues for async) and proper data storage strategies (PostgreSQL for persistence, Redis for caching).

---

## 🔗 Related Documentation

- [Deployment Guide](./DEPLOYMENT.md) - How to deploy the system
- [API Documentation](./docs/API_SPEC.md) - API endpoints and schemas
- [Queue Design](./docs/QUEUE_DESIGN.md) - Message queue architecture details
- [Architecture Details](./docs/ARCHITECTURE.md) - Technical architecture

---

**Last Updated:** November 2025

