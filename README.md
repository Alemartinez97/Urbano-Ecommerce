# Urbano Ecommerce

Microservices monorepo for ecommerce, built with **NestJS**, **PostgreSQL**, and **RabbitMQ**. Migration of [nestjs-ecommerce](https://github.com/hsn656/nestjs-ecommerce) to a modern, scalable architecture.

---

## Migration from nestjs-ecommerce

This project is the evolution of the monolithic [hsn656/nestjs-ecommerce](https://github.com/hsn656/nestjs-ecommerce). Main changes:

| Before (monolith) | Now (ecommerce-urbano) |
|-------------------|------------------------|
| Single NestJS app | **5 independent microservices** |
| One PostgreSQL DB | **Database per service**: 4 PostgreSQL instances |
| Logic in one process | **HTTP** between services + **events** via RabbitMQ |
| Single deployment | Containers per service, ready to **scale and deploy on AWS** |

The same stack (NestJS, TypeORM, PostgreSQL) is kept; JWT/Passport, Swagger, env-based config, and event bus are added.

---

## Architecture

```
                    ┌─────────────────┐
                    │   auth-service  │  (JWT, login)
                    │     :3003       │
                    └────────┬────────┘
                             │ HTTP
                             ▼
                    ┌─────────────────┐     ┌──────────────┐
                    │  users-service  │     │   users-db   │
                    │     :3002       │────▶│   (Postgres) │
                    └─────────────────┘     └──────────────┘
                             
┌─────────────────┐     ┌──────────────┐
│ catalog-service │────▶│  catalog-db   │
│     :3001       │     │  (Postgres)   │
└────────┬────────┘     └──────────────┘
         │ emit product_created / order_created
         ▼
┌─────────────────┐     ┌──────────────┐
│ event-bus       │     │ inventory-db  │
│ (RabbitMQ)      │     │ (Postgres)   │
│ :5672 / :15672  │     └──────▲───────┘
└────────┬────────┘            │
         │                     │
┌────────▼────────┐     ┌──────┴───────┐
│order-service    │     │inventory-svc │
│    :3005        │     │   :3004     │
└────────┬────────┘     └─────────────┘
         │ emit order_created
         │     ┌──────────────┐
         └────▶│  orders-db   │
               │  (Postgres)  │
               └──────────────┘
```

### Services and ports (host)

| Service | Port | Description |
|---------|------|-------------|
| **catalog-service** | 3001 | Product catalog; emits `product_created` and `product_updated` |
| **users-service** | 3002 | Users (registration, validation for login) |
| **auth-service** | 3003 | JWT login; consumes users-service |
| **inventory-service** | 3004 | Stock; listens to `product_created` and `order_created`, decrements stock |
| **order-service** | 3005 | Orders; emits `order_created` |
| **RabbitMQ (management)** | 15672 | Event bus management UI |

All APIs use the **`/api`** prefix and expose Swagger at **`/api/docs`**.

**Observability:** each service exposes **GET `/api/health`** (returns `{ status: 'ok', service: '...' }`). Docker Compose uses this for container healthchecks.

**Logs:** all services use a structured logger (`common/logger`): in **development** human-readable output with timestamp, level, service and context; in **production** (`NODE_ENV=production`) one JSON line per event for aggregators (CloudWatch, Loki, etc.).

---

## Stack

- **Runtime:** Node.js 20  
- **Framework:** NestJS 10  
- **ORM:** TypeORM  
- **Databases:** PostgreSQL 15  
- **Event bus:** RabbitMQ 3  
- **Auth:** JWT (Passport)  
- **API docs:** Swagger  

---

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm 9+ (workspaces)

---

## Installation and running

### 1. Clone and install dependencies

```bash
git clone <repo>
cd ecommerce-urbano
npm install
```

### 2. Configure environment variables (recommended)

```bash
cp .env.example .env
# Edit .env to set DB user/password and JWT_SECRET if needed
```

### 3. Start infrastructure (databases + RabbitMQ)

```bash
npm run infrastructure:up
```

This starts in the background: 4 PostgreSQL (catalog, users, orders, inventory) and RabbitMQ with healthchecks.

### 4. Run the application

**Option A – Full stack with Docker (recommended to try the whole system)**

```bash
docker-compose up -d
```

Microservices are built and started after dependencies. URLs:

- Catalog: http://localhost:3001/api  
- Users: http://localhost:3002/api  
- Auth: http://localhost:3003/api  
- Inventory: http://localhost:3004/api  
- Orders: http://localhost:3005/api  
- RabbitMQ UI: http://localhost:15672 (guest/guest)

**Option B – Infrastructure only + run services locally**

```bash
npm run infrastructure:up
npm run build
npm run start:dev catalog-service    # in one terminal
npm run start:dev users-service       # in another
npm run start:dev auth-service
npm run start:dev inventory-service
npm run start:dev order-service
```

Each service uses its default port (3001–3005) if `PORT` is not set.

### 5. Stop infrastructure

```bash
npm run infrastructure:down
# or, if you started everything with Docker:
docker-compose down
```

---

## Environment variables (.env)

The project uses a **`.env`** file for configuration. Docker Compose loads it automatically.

1. **Copy the example and edit values:**
   ```bash
   cp .env.example .env
   ```
2. Set at least `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `JWT_SECRET` in `.env` (use strong values in production).
3. **Do not commit `.env`**; it is in `.gitignore`.

Without `.env`, Docker Compose uses defaults for local development (user/password, example secrets).

| Variable | Used by | Description |
|----------|---------|-------------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Compose + services | User and password for the 4 PostgreSQL databases |
| `POSTGRES_DB_*` | Compose | Name of each database (catalog_db, users_prod, etc.) |
| `JWT_SECRET` | auth, users, catalog, order | JWT secret; in prod: `openssl rand -base64 32` |
| `USERS_SERVICE_URL` | auth-service | URL of users-service (in Docker: `http://users-service:3000`) |
| `EVENT_BUS_URL` | catalog, inventory, order | RabbitMQ URL (in Docker: `amqp://event-bus:5672`) |
| `CORS_ORIGIN` | All | Allowed origins, comma-separated; empty = all (dev) |
| `NODE_ENV` | All | `development` or `production` (affects logs and TypeORM synchronize) |

In production: use a secrets manager (AWS Secrets Manager, Vault, etc.) and disable TypeORM `synchronize`; apply schema changes with **migrations**.

---

## Security

- **Helmet:** security HTTP headers on all services.
- **CORS:** configurable via `CORS_ORIGIN`; restrict origins in production.
- **JWT:** creating a product (catalog) and creating an order (order) require `Authorization: Bearer <token>` (obtained via POST `/api/auth/login`).
- **Rate limiting:** login endpoint is throttled to mitigate brute force.

---

## AWS deployment

The **code is ready** for AWS (Dockerfiles, health checks, env-based config, CD to ECR). This repo only documents the **strategy**; it does not include infrastructure code (Terraform/CloudFormation). Summary:

- Each service has a **Dockerfile** and runs as a container.
- All configuration is via **environment variables** (no hardcoded URLs or secrets).
- Communication between services is **HTTP** and **messaging (RabbitMQ)**.

**Deploy in 5 steps:** Terraform in `infra/terraform/` creates ECR repos; then set GitHub secrets and push to `main`. See **[infra/README.md](infra/README.md)**. Full guide: [docs/DEPLOY-AWS.md](docs/DEPLOY-AWS.md). Strategy: [docs/ESTRATEGIA-AWS.md](docs/ESTRATEGIA-AWS.md).

### Recommended AWS components

| Component | Project usage | AWS option |
|-----------|----------------|------------|
| **Containers** | One image per microservice | **Amazon ECS (Fargate)** or EKS |
| **Image registry** | Build from each `apps/*/Dockerfile` | **Amazon ECR** (one repo per service or per app) |
| **Databases** | 4 PostgreSQL (catalog, users, orders, inventory) | **Amazon RDS** (one instance with 4 DBs) or **Aurora PostgreSQL** |
| **Event bus** | RabbitMQ in Docker | **Amazon MQ (RabbitMQ)** or **SQS/SNS** (would require code changes) |
| **Secrets** | `JWT_SECRET`, connection strings | **AWS Secrets Manager** or **Systems Manager Parameter Store** |
| **Ingress** | Multiple ports (3001–3005) | **Application Load Balancer (ALB)** with path or subdomain rules |
| **DNS** | N/A | **Route 53** (optional) |

### Typical AWS deployment flow

1. **Build and push images** to ECR (e.g. via GitHub Actions or AWS CodeBuild).
2. **Infrastructure:** VPC, subnets, security groups; RDS (or Aurora) with 4 databases; Amazon MQ for RabbitMQ; ECR for images.
3. **ECS:** Cluster (Fargate); task definitions per service with ECR image, env vars and secrets (from Secrets Manager); services with health checks on `/api` or a dedicated endpoint.
4. **Network:** ALB with HTTPS (ACM certificate); path rules (e.g. `/api/catalog*` → catalog-service); target groups and ECS service registration.
5. **Service communication:** `USERS_SERVICE_URL` points to users-service (ALB internal URL or service discovery); `DATABASE_URL` and `EVENT_BUS_URL` from RDS and Amazon MQ in the VPC.

---

## E2E tests (Jest)

E2E tests run against live services (real HTTP).

**Requirement:** stack up (`docker-compose up -d`) and wait for services to be ready.

```bash
docker-compose up -d
# Wait ~20s for all to be healthy
npm run test:e2e
```

They cover:

- **Health:** GET `/api/health` on all 5 microservices.
- **Auth:** user registration and login (token).
- **Catalog:** GET products, POST without token (401), POST with token (create product).
- **Order:** POST without token (401), POST with token (create order).

Default URLs are `http://localhost:3001` … `3005`. Override with `TEST_CATALOG_URL`, `TEST_USERS_URL`, etc. For catalog/order with token you can set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`, or the tests register a new user.

---

## CI/CD

The repo uses **GitHub Actions**:

| Workflow | Trigger | What it does |
|----------|---------|----------------|
| **CI** (`.github/workflows/ci.yml`) | Push and PR to `main`, `master`, `develop` | `npm ci` → `npm run lint` → `npm run build:all` |
| **CD** (`.github/workflows/cd.yml`) | Push to `main` / `master` | Builds 5 images and pushes to **GitHub Container Registry** (ghcr.io) |
| **CD (ECR)** (`.github/workflows/cd-ecr.yml`) | Push to `main` / `master` (or manual) | Builds 5 images and pushes to **Amazon ECR** (for AWS deployment) |

Images on GHCR are published as `ghcr.io/<your-org>/urbano-<service>:latest`. For AWS, set secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`, and create ECR repos `urbano-<service>`. Full guide: [docs/DEPLOY-AWS.md](docs/DEPLOY-AWS.md). CI/CD details: [docs/CI-CD.md](docs/CI-CD.md).

---

## Monorepo scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build default project (Nest CLI) |
| `npm run build:all` | Build all 5 microservices (used in CI) |
| `npm run start` | Start default project (choose service with `nest start <name>`) |
| `npm run start:dev <service>` | Watch mode for one service (e.g. `catalog-service`) |
| `npm run infrastructure:up` | `docker-compose up -d` (infra only) |
| `npm run infrastructure:down` | `docker-compose down` |
| `npm run lint` | ESLint on `src`, `apps`, `test`, `e2e` |
| `npm run test:e2e` | E2E tests with Jest (requires services running) |

---

## Repository structure

```
ecommerce-urbano/
├── .env.example           # Environment variable template (copy to .env)
├── .github/workflows/     # CI (lint + build), CD to GHCR and CD to ECR (AWS)
│   ├── ci.yml
│   ├── cd.yml
│   └── cd-ecr.yml
├── apps/
│   ├── auth-service/      # JWT login, consumes users
│   ├── catalog-service/   # Products, emits events
│   ├── inventory-service/ # Stock, consumes product_created and order_created
│   ├── order-service/     # Orders, emits order_created
│   └── users-service/     # Users and validation for auth
├── docs/
│   ├── CI-CD.md           # GitHub Actions workflows
│   ├── ESTRATEGIA-AWS.md  # AWS strategy and “code ready” checklist
│   ├── DEPLOY-AWS.md      # Full guide: ECR, ECS Fargate, ALB, RDS, Secrets Manager
│   ├── observability-datadog.md  # Datadog APM, trace/log correlation
│   └── PLAN-MEJORAS.md           # Roadmap: Deploy, Security, Observability, Cost, Operations
├── infra/
│   ├── README.md          # 5-step AWS deploy (Terraform + GitHub secrets + push)
│   └── terraform/         # ECR repos (+ optional IAM); run from infra/terraform
├── docker-compose.yml     # Infra + microservices (reads .env)
├── nest-cli.json          # Nest monorepo (projects per app)
└── package.json           # Workspaces: apps/*
```

Each service typically follows a layered structure: `application/`, `infrastructure/`, and in some cases `domain/`.

---

## Further documentation

| Resource | Description |
|----------|-------------|
| [.env.example](.env.example) | Environment variable template; copy to `.env` and adjust. |
| [docs/CI-CD.md](docs/CI-CD.md) | GitHub Actions workflows (CI and CD). |
| [docs/DEPLOY-AWS.md](docs/DEPLOY-AWS.md) | Full AWS deploy guide: ECR, ECS Fargate, ALB, RDS, Secrets Manager. |
| [docs/ESTRATEGIA-AWS.md](docs/ESTRATEGIA-AWS.md) | AWS strategy and "code ready" checklist. |
| [docs/observability-datadog.md](docs/observability-datadog.md) | Datadog APM, trace/log correlation. |
| [docs/PLAN-MEJORAS.md](docs/PLAN-MEJORAS.md) | Roadmap: Deploy, Security, Observability, Cost, Operations. |

---

## License

MIT.
