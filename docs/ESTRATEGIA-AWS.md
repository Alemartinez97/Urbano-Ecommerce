# AWS Strategy – Urbano E-commerce

This document describes **only the strategy** for mapping to AWS. The repository **does not include infrastructure code** (no Terraform, CloudFormation, or deploy scripts); the **application code is ready** to run on AWS once infrastructure is provisioned and environment variables are set.

---

## 1. Code ready for AWS

The project already meets what is needed to deploy on AWS without changing business logic:

| Requirement | Status | Where |
|-------------|--------|--------|
| **Containers** | Ready | One Dockerfile per service in `apps/<service>/Dockerfile` |
| **Env-based config** | Ready | Everything via environment variables; no hardcoded URLs or secrets |
| **Health check** | Ready | `GET /api/health` on all 5 services (used by ECS/ALB) |
| **Unified API prefix** | Ready | All routes under `/api` (catalog, users, auth, inventory, orders) |
| **Images to ECR** | Ready | Workflow `.github/workflows/cd-ecr.yml` builds and pushes to ECR on push to `main` |
| **Variable template** | Ready | `.env.example` documents `DATABASE_URL`, `JWT_SECRET`, `EVENT_BUS_URL`, `USERS_SERVICE_URL`, etc. |
| **Injectable secrets** | Ready | Services read from env; on AWS you can inject from Secrets Manager or Parameter Store |

No code changes are required to “adapt” to AWS; you only need to **provision infrastructure** and **set variables** in the runtime (task definition, Parameter Store, etc.).

---

## 2. Deployment strategy (decisions only, no infra code)

Recommended order and options. Concrete execution (commands, console, or a separate infra repo) is outside this repo.

### 2.1 Image registry

- **What:** Amazon ECR (one repository per service: `urbano-catalog-service`, etc.).
- **When:** First: create ECR repos and set GitHub secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`); the repo’s CD already pushes images on every push to `main`.
- **Free tier:** ECR public is free; private has 500 MB/month free for 12 months.

### 2.2 Data

- **Databases:** One RDS PostgreSQL (or Aurora) instance with 4 databases: `catalog_db`, `users_prod`, `orders_db`, `inventory_db`. The code already uses `DATABASE_URL` and `ORDERS_DATABASE_URL` per service.
- **Event bus:** Option A) **Amazon MQ (RabbitMQ)** – code already uses `EVENT_BUS_URL` like `amqp://...`. Option B) RabbitMQ on the same compute (e.g. EC2/ECS) to reduce cost. Option C) Move to SQS/SNS later (would require code changes).
- **Free tier:** RDS 750 h/month db.t2.micro or db.t3.micro (12 months). Amazon MQ has no free tier.

### 2.3 Compute

- **What:** Run the 5 images as containers.
- **Options:** ECS Fargate (serverless), ECS with EC2 (control instance size), or a single EC2 with Docker Compose (simplest, one host).
- **Free tier:** EC2 t2.micro 750 h/month (12 months) for one host; Fargate is not in free tier.

### 2.4 Ingress

- **What:** Single entry point that routes by path (`/api/catalog*`, `/api/users*`, etc.).
- **Options:** Application Load Balancer with path rules, or a reverse proxy (Nginx/Caddy) on the same EC2 when using one host. Optional: Route 53 + ACM certificate for HTTPS.
- **Free tier:** ALB has a cost; in free-tier setups you often use the EC2 public IP and optionally Nginx on the same host.

### 2.5 Secrets

- **What:** `JWT_SECRET`, RDS connection strings, `EVENT_BUS_URL`, `USERS_SERVICE_URL`.
- **Options:** AWS Secrets Manager or **Systems Manager Parameter Store** (standard parameters are free). The code does not change; only how env is injected in the task definition or process.

### 2.6 Service-to-service communication

- **auth-service → users-service:** `USERS_SERVICE_URL` must point to users-service (internal ALB URL, or service name if using service discovery). The code already uses this variable.

---

## 3. Strategy summary

1. **ECR** – Repos created; images pushed by the repo’s CD.
2. **Data** – RDS (4 DBs) + RabbitMQ (Amazon MQ or on same host).
3. **Compute** – ECS (Fargate or EC2) or one EC2 with Docker Compose.
4. **Traffic** – ALB by path or Nginx on EC2; optional HTTPS with ACM.
5. **Secrets** – Parameter Store or Secrets Manager; inject as env in ECS/EC2.

The code is ready; you only need to **choose** options (free tier vs full) and **provision** infrastructure (in another repo, console, or tool of your choice).

---

## 4. Operational guide

For concrete steps (create ECR repos, example ECS task definition, ALB, RDS, etc.) see **[docs/DEPLOY-AWS.md](DEPLOY-AWS.md)**. This doc defines the strategy; that one describes how to execute it.
