# Deployment Guide - Free Options

This guide outlines the best free deployment options for the Notification Services Suite microservices application.

## 🎯 Recommended Free Deployment Options

### 1. **Railway** ⭐ (Best for Docker Compose)
**Why it's great:**
- Native Docker Compose support
- Free tier: $5 credit/month (enough for small projects)
- Automatic deployments from Git
- Built-in PostgreSQL, Redis, and RabbitMQ support
- Simple configuration

**Limitations:**
- Free tier has limited resources
- Services may sleep after inactivity
- Best for development/testing

**Setup Steps:**
1. Sign up at [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Add services:
   - PostgreSQL (managed service)
   - Redis (managed service)
   - RabbitMQ (deploy from Docker image)
   - Deploy each microservice as separate services
5. Set environment variables from `.env.example`
6. Deploy!

**Cost:** Free tier with $5 credit/month

---

### 2. **Render** ⭐ (Best for Individual Services)
**Why it's great:**
- Free tier: 750 hours/month
- Supports Docker deployments
- Managed PostgreSQL and Redis available
- Easy Git integration

**Limitations:**
- Free services sleep after 15 minutes of inactivity
- No native Docker Compose support (deploy services separately)
- Limited resources on free tier

**Setup Steps:**
1. Sign up at [render.com](https://render.com)
2. Create a new Web Service for each microservice
3. Connect your GitHub repository
4. Use Dockerfile for each service
5. Add managed PostgreSQL and Redis services
6. Deploy RabbitMQ as a separate service
7. Configure environment variables

**Cost:** Free tier (750 hours/month)

---

### 3. **Fly.io** ⭐ (Best for Global Distribution)
**Why it's great:**
- $5 monthly credit for new users
- Global edge deployment
- Excellent for microservices
- Docker support
- Fast cold starts

**Limitations:**
- Requires CLI setup
- More complex configuration
- Credit expires after 3 months

**Setup Steps:**
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Sign up: `fly auth signup`
3. Create apps for each service: `fly apps create <service-name>`
4. Deploy: `fly deploy`
5. Configure volumes for PostgreSQL
6. Set secrets: `fly secrets set KEY=value`

**Cost:** $5 credit/month (first 3 months)

---

### 4. **Koyeb** (Best for Simplicity)
**Why it's great:**
- Free tier: 2 services
- Docker support
- Global load balancing
- Simple Git-based deployment

**Limitations:**
- Only 2 free services
- Limited regions on free tier
- May need to combine some services

**Setup Steps:**
1. Sign up at [koyeb.com](https://www.koyeb.com)
2. Create services from GitHub
3. Use Dockerfile for each service
4. Configure environment variables
5. Add external PostgreSQL/Redis (or use managed services)

**Cost:** Free tier (2 services)

---

### 5. **AWS Free Tier** (Best for Learning AWS)
**Why it's great:**
- 12 months free tier
- 750 hours/month of EC2 t2.micro
- Can use ECS for container orchestration
- Managed RDS PostgreSQL available

**Limitations:**
- Complex setup
- Free tier expires after 12 months
- Limited resources (1 vCPU, 1GB RAM)
- Requires AWS knowledge

**Setup Steps:**
1. Create AWS account
2. Set up EC2 instance or ECS cluster
3. Deploy Docker containers
4. Use RDS for PostgreSQL
5. Use ElastiCache for Redis
6. Set up RabbitMQ on EC2

**Cost:** Free for 12 months, then pay-as-you-go

---

## 🏆 **Recommended Approach: Railway**

For this microservices application, **Railway** is the best free option because:

1. ✅ Native Docker Compose support (or easy multi-service setup)
2. ✅ Managed PostgreSQL and Redis
3. ✅ Simple environment variable management
4. ✅ Automatic deployments
5. ✅ Good free tier for development/testing

### Railway Deployment Steps

#### Step 1: Prepare Your Repository
```bash
# Ensure all services have Dockerfiles
# Ensure docker-compose.yml is in the infra/ directory
# Create .env.example (already done)
```

#### Step 2: Set Up Railway
1. Go to [railway.app](https://railway.app) and sign up
2. Create a new project
3. Connect your GitHub repository

#### Step 3: Add Infrastructure Services
1. **PostgreSQL:**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will provide connection string automatically

2. **Redis:**
   - Click "New" → "Database" → "Redis"
   - Railway will provide connection string automatically

3. **RabbitMQ:**
   - Click "New" → "Template" → Search "RabbitMQ"
   - Or deploy from Docker image: `rabbitmq:3-management-alpine`

#### Step 4: Deploy Microservices
For each service (api_gateway, user_service, email_service, push_service, template_service):

1. Click "New" → "GitHub Repo"
2. Select your repository
3. Set root directory to service folder (e.g., `api_gateway`)
4. Railway will auto-detect Dockerfile
5. Add environment variables from `.env.example`
6. Set service URL variables:
   - `USER_SERVICE_URL`: Use Railway's generated URL
   - `TEMPLATE_SERVICE_URL`: Use Railway's generated URL
   - `DATABASE_URL`: Use Railway's PostgreSQL connection string
   - `REDIS_URL`: Use Railway's Redis connection string
   - `RABBITMQ_URL`: Use Railway's RabbitMQ connection string

#### Step 5: Configure Environment Variables
Set these in each service's environment variables:

**API Gateway:**
```
PORT=8080
RABBITMQ_URL=<railway-rabbitmq-url>
REDIS_URL=<railway-redis-url>
USER_SERVICE_URL=<railway-user-service-url>
TEMPLATE_SERVICE_URL=<railway-template-service-url>
JWT_SECRET=<your-secret>
SKIP_AUTH=false
```

**User Service:**
```
PORT=8081
DATABASE_URL=<railway-postgres-url>
REDIS_URL=<railway-redis-url>
SECRET_KEY=<your-secret>
```

**Email Service:**
```
PORT=8083
RABBITMQ_URL=<railway-rabbitmq-url>
SENDGRID_API_KEY=<your-key>
SENDGRID_FROM_EMAIL=<your-email>
```

**Push Service:**
```
PORT=8082
RABBITMQ_URL=<railway-rabbitmq-url>
FCM_PROJECT_ID=<your-project-id>
FCM_PRIVATE_KEY=<your-private-key>
FCM_CLIENT_EMAIL=<your-client-email>
```

**Template Service:**
```
PORT=8084
DATABASE_URL=<railway-postgres-url>
```

#### Step 6: Set Up Public URLs
1. For API Gateway, click "Settings" → "Generate Domain"
2. This gives you a public URL like: `https://api-gateway-production.up.railway.app`

#### Step 7: Test Deployment
```bash
# Test health endpoint
curl https://your-api-gateway-url.railway.app/health

# Test notification
curl -X POST https://your-api-gateway-url.railway.app/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "template_id": "template-uuid",
    "notification_type": "email",
    "variables": {"name": "Test User"}
  }'
```

---

## 🔄 Alternative: Hybrid Approach

If Railway's free tier isn't enough, consider:

1. **Railway** for microservices (API Gateway, User Service, Template Service)
2. **Render** for Email Service and Push Service (separate free tiers)
3. **Supabase** (free PostgreSQL) or **Upstash** (free Redis) for databases
4. **CloudAMQP** (free RabbitMQ) for message queue

---

## 📊 Comparison Table

| Platform | Free Tier | Docker Compose | Managed DB | Ease of Use | Best For |
|----------|-----------|----------------|------------|-------------|----------|
| **Railway** | $5/month | ✅ Yes | ✅ Yes | ⭐⭐⭐⭐⭐ | Development/Testing |
| **Render** | 750 hrs | ❌ No | ✅ Yes | ⭐⭐⭐⭐ | Production-ready |
| **Fly.io** | $5/month | ✅ Yes | ❌ No | ⭐⭐⭐ | Global distribution |
| **Koyeb** | 2 services | ✅ Yes | ❌ No | ⭐⭐⭐⭐ | Simple projects |
| **AWS** | 12 months | ✅ Yes | ✅ Yes | ⭐⭐ | Enterprise |

---

## 🚀 Quick Start: Railway Deployment

```bash
# 1. Install Railway CLI (optional but helpful)
npm i -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Link to existing project or create new
railway link

# 5. Deploy
railway up
```

---

## ⚠️ Important Notes

1. **Environment Variables:** Never commit `.env` files. Use Railway's environment variable management.

2. **Database Migrations:** Run migrations on first deployment:
   ```bash
   railway run python user_service/manage.py migrate
   ```

3. **Resource Limits:** Free tiers have limited CPU/RAM. Monitor usage in Railway dashboard.

4. **Sleeping Services:** Some free tiers sleep after inactivity. Consider using a ping service to keep them awake.

5. **Secrets Management:** Use Railway's secrets management for sensitive data (API keys, passwords).

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Fly.io Documentation](https://fly.io/docs)
- [Docker Compose on Railway](https://docs.railway.app/deploy/docker-compose)

---

## 🎯 Recommendation

**For this project, use Railway** because:
- Simplest setup for microservices
- Managed databases included
- Good free tier for development
- Easy environment variable management
- Automatic deployments from Git

Start with Railway's free tier, and if you need more resources, you can upgrade or migrate to Render/Fly.io later.

