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

## 1. Diagnóstico de la arquitectura actual (monolito)

Razones por las que se migró desde el monolito [nestjs-ecommerce](https://github.com/hsn656/nestjs-ecommerce).

### Problemas de acoplamiento

- **Binario y de memoria:** Al compartir el mismo proceso de Node.js, un leak de memoria en el procesamiento de imágenes del Catálogo tira abajo el flujo de Auth y Órdenes.
- **Base de datos compartida:** El esquema de tablas está entrelazado. Si modificás la tabla de Users para agregar un campo de auditoría, podrías romper accidentalmente la relación con Orders sin previo aviso.

### Límites de dominio poco claros

- **Lógica difusa:** La lógica de "Stock" vive a veces en el controlador de productos y otras en el de ventas. No hay un "dueño" del inventario.
- **Entidades "Dios":** El objeto User termina cargando con perfiles, direcciones, métodos de pago e historial, volviéndose inmanejable y pesado de consultar.

### Riesgos de escalabilidad

- **Escalado todo-o-nada:** No podés escalar solo el proceso de pagos (que requiere alta CPU para cifrado) sin replicar también el catálogo (que requiere mucha RAM). Estás desperdiciando dinero en infraestructura.
- **Bloqueo de I/O:** Un proceso pesado (ej. generar un reporte de ventas) bloquea el Event Loop de Node.js para todos los usuarios, afectando incluso el login.

### Problemas organizacionales implícitos

- **Cuello de botella en el deploy:** Si el equipo de Frontend necesita un cambio mínimo en el Catálogo, tiene que esperar a que se testee todo el sistema de Órdenes para poder desplegar el monolito.
- **Fricción de código:** Varios desarrolladores tocando el mismo `app.module.ts` genera conflictos de merge (git) constantes.

---

## 2. Propuesta: arquitectura objetivo (microservicios)

### Desacoplamiento de responsabilidades

- Se divide el sistema en **5 Bounded Contexts:** Catalog, Users, Auth, Inventory, Order. Cada uno con su propia base de datos y despliegue independiente.
- **Comunicación event-driven:** Se usa RabbitMQ para que los servicios no se "conozcan". Si el servicio de Inventario está caído, el de Órdenes simplemente encola el mensaje y sigue operando. Consistencia eventual.

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

## Arquitectura en AWS

El código está listo para AWS (Dockerfiles, health checks, configuración por variables de entorno, CD a ECR). Este repo documenta la **estrategia**; la infraestructura (Terraform/CloudFormation) se provisiona por separado.

### Mapeo de la arquitectura a servicios AWS

| Componente | Uso en el proyecto | Servicio AWS | Justificación breve |
|------------|-------------------|--------------|----------------------|
| **Contenedores** | Una imagen por microservicio | **Amazon ECS (Fargate)** o **EKS** | ECS Fargate evita gestionar servidores; EKS da más control y portabilidad (Kubernetes). |
| **Registro de imágenes** | Build desde cada `apps/*/Dockerfile` | **Amazon ECR** | Integrado con ECS/EKS; escaneo de vulnerabilidades en push; el CD del repo ya sube imágenes. |
| **Bases de datos** | 4 PostgreSQL (catalog, users, orders, inventory) | **Amazon RDS** o **Aurora PostgreSQL** | Un RDS con 4 bases reduce coste; Aurora aporta mejor disponibilidad y escalado si crece la carga. |
| **Bus de eventos** | RabbitMQ | **Amazon MQ (RabbitMQ)** | Compatible con el código actual (`EVENT_BUS_URL`); alternativa: SQS/SNS con cambios en la aplicación. |
| **Secretos** | JWT, cadenas de conexión | **Secrets Manager** o **Parameter Store** | Parameter Store (estándar) tiene capa gratuita; Secrets Manager rotación automática. |
| **Entrada de tráfico** | Múltiples puertos (3001–3005) | **Application Load Balancer (ALB)** | Enrutado por path (`/api/catalog*` → catalog-service); HTTPS con certificado ACM. |
| **DNS** | Opcional | **Route 53** | Dominios propios y health checks para failover. |

### Deploy

- **Pasos rápidos:** Terraform en `infra/terraform/` crea los repos ECR; configurás los secrets de GitHub y hacés push a `main`. Ver **[infra/README.md](infra/README.md)**.
- **Guía completa:** [docs/DEPLOY-AWS.md](docs/DEPLOY-AWS.md) (ECR, ECS Fargate, ALB, RDS, Secrets Manager).
- **Estrategia y checklist:** [docs/ESTRATEGIA-AWS.md](docs/ESTRATEGIA-AWS.md).

Flujo típico: (1) Build y push de imágenes a ECR (GitHub Actions), (2) VPC, subnets, security groups, (3) RDS con 4 bases y Amazon MQ, (4) ECS: cluster, task definitions con imagen ECR y variables desde Secrets Manager, (5) ALB con reglas por path y HTTPS (ACM).

### Seguridad

- **En la aplicación:** Helmet, CORS, JWT en rutas protegidas, rate limiting en login (ver sección [Security](#security)).
- **En AWS:** VPC y subnets (públicas/privadas) para aislar tráfico; security groups que solo permitan el puerto del ALB hacia ECS y ECS hacia RDS/MQ; secretos en Secrets Manager o Parameter Store, nunca en el código; en producción, desactivar `synchronize` de TypeORM y usar migraciones.

### Observabilidad

- **Hoy:** Cada servicio expone `GET /api/health`; logs estructurados (JSON en producción) para CloudWatch, Loki o Datadog. Ver [docs/observability-datadog.md](docs/observability-datadog.md) para APM y correlación trace/log.
- **En AWS:** CloudWatch Logs para agregar logs; CloudWatch Metrics y alarmas para CPU/memoria y health; opcional X-Ray o Datadog para trazas entre servicios.

### Costos

- **Opciones amigables al free tier:** EC2 t2.micro, RDS db.t3.micro, Parameter Store (estándar), ECR (500 MB/mes gratis 12 meses). ECS Fargate y ALB no están en free tier.
- **Buenas prácticas:** Política de ciclo de vida en ECR (p. ej. últimas 15 imágenes por repo); revisar uso de ECS/RDS/ALB de forma periódica.

### Operación

- **Local / un solo host:** Docker Compose con `docker-compose up -d` o `npm run infrastructure:up`.
- **En producción (recomendado):** Runbooks para incidentes frecuentes (BD caída, RabbitMQ lleno); procedimiento de backup y restore para RDS; definir quién hace rollback y cómo (nuevas imágenes en ECR, actualizar task definition).

### Opción: Orquestación con Kubernetes (Amazon EKS)

Pasar de contenedores aislados a un clúster gestionado permite que la infraestructura sea más "inteligente":

- **Auto-healing:** Si un pod de catalog-service falla, Kubernetes lo detecta y lo levanta en segundos en otro nodo sano.
- **Escalado horizontal (HPA):** Si el uso de CPU del microservicio de orders supera un umbral (p. ej. 70%), Kubernetes puede levantar más réplicas automáticamente.
- **Abstracción de infraestructura:** Los manifiestos YAML permiten mover los microservicios entre nubes o entornos híbridos sin cambiar la lógica del despliegue.

### Opción: Persistencia NoSQL con Amazon DynamoDB

Sustituir o complementar PostgreSQL con DynamoDB en servicios de alta demanda (p. ej. Catalog o Inventory) puede mejorar rendimiento y escalado:

- **Latencia estable:** Respuesta en milisegundos de un solo dígito, sin degradación por volumen de datos (a diferencia de JOINs complejos en SQL).
- **Escalado serverless:** No hay que dimensionar disco ni RAM; DynamoDB escala RCU/WCU bajo demanda.
- **Modelo flexible:** Útil para catálogos donde un producto tiene "talle" y otro "resolución"; atributos distintos sin migraciones de esquema costosas.

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
