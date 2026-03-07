# Urbano Ecommerce

Monorepo de microservicios para ecommerce, construido con **NestJS**, **PostgreSQL** y **RabbitMQ**. Migración del proyecto [nestjs-ecommerce](https://github.com/hsn656/nestjs-ecommerce) a una arquitectura moderna y escalable.

---

## Migración desde nestjs-ecommerce

Este proyecto es la evolución del ecommerce monolítico [hsn656/nestjs-ecommerce](https://github.com/hsn656/nestjs-ecommerce). Cambios principales:

| Antes (monolito) | Ahora (ecommerce-urbano) |
|------------------|---------------------------|
| Una aplicación NestJS | **5 microservicios** independientes |
| Una base PostgreSQL | **Database per service**: 4 instancias PostgreSQL |
| Lógica en un solo proceso | **Comunicación HTTP** entre servicios + **eventos** vía RabbitMQ |
| Despliegue único | Contenedores por servicio, listos para **escalar y desplegar en AWS** |

Se mantiene el stack base (NestJS, TypeORM, PostgreSQL) y se añaden JWT/Passport, Swagger, Config por entorno y bus de eventos.

---

## Arquitectura

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

### Servicios y puertos (host)

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **catalog-service** | 3001 | Catálogo de productos; emite `product_created` y `product_updated` |
| **users-service** | 3002 | Usuarios (registro, validación para login) |
| **auth-service** | 3003 | Login JWT; consume users-service |
| **inventory-service** | 3004 | Stock; escucha `product_created` y `order_created`, descuenta stock |
| **order-service** | 3005 | Órdenes; emite `order_created` |
| **RabbitMQ (management)** | 15672 | UI de gestión del event bus |

Todas las APIs comparten el prefijo **`/api`** y exponen Swagger en **`/api/docs`**.

---

## Stack

- **Runtime:** Node.js 20  
- **Framework:** NestJS 10  
- **ORM:** TypeORM  
- **Bases de datos:** PostgreSQL 15  
- **Event bus:** RabbitMQ 3  
- **Auth:** JWT (Passport)  
- **API docs:** Swagger  

---

## Requisitos previos

- Node.js 20+
- Docker y Docker Compose
- npm 9+ (workspaces)

---

## Instalación y ejecución

### 1. Clonar e instalar dependencias

```bash
git clone <repo>
cd ecommerce-urbano
npm install
```

### 2. Levantar infraestructura (bases de datos + RabbitMQ)

```bash
npm run infrastructure:up
```

Esto levanta en segundo plano: 4 PostgreSQL (catalog, users, orders, inventory) y RabbitMQ con healthchecks.

### 3. Ejecutar la aplicación

**Opción A – Todo con Docker (recomendado para probar el sistema completo)**

```bash
docker-compose up -d
```

Los microservicios se construyen y arrancan tras las dependencias. URLs:

- Catalog: http://localhost:3001/api  
- Users: http://localhost:3002/api  
- Auth: http://localhost:3003/api  
- Inventory: http://localhost:3004/api  
- Orders: http://localhost:3005/api  
- RabbitMQ UI: http://localhost:15672 (guest/guest)

**Opción B – Solo infraestructura + servicios en local**

```bash
npm run infrastructure:up
npm run build
npm run start:dev catalog-service    # en una terminal
npm run start:dev users-service      # en otra
npm run start:dev auth-service
npm run start:dev inventory-service
npm run start:dev order-service
```

Cada servicio usa por defecto su puerto (3001, 3002, 3003, 3004, 3005) si no se define `PORT`.

### 4. Bajar infraestructura

```bash
npm run infrastructure:down
# o, si levantaste todo con Docker:
docker-compose down
```

---

## Variables de entorno (despliegue)

Cada servicio se configura por variables de entorno. En Docker Compose ya vienen definidas; para **AWS** (o otro cloud) conviene centralizarlas en Secrets Manager/Parameter Store o en el task definition.

| Variable | Servicios | Descripción |
|----------|-----------|-------------|
| `PORT` | Todos | Puerto HTTP (por defecto según servicio) |
| `DATABASE_URL` | catalog, users, inventory | URL Postgres (`postgres://user:pass@host:5432/db`) |
| `ORDERS_DATABASE_URL` | order-service | URL Postgres de órdenes |
| `EVENT_BUS_URL` | catalog, inventory, order | URL RabbitMQ (`amqp://host:5672`) |
| `JWT_SECRET` | auth, users | Secreto para firmar/validar JWT |
| `USERS_SERVICE_URL` | auth-service | URL base del users-service (ej. `http://users-service:3000`) |

En producción: desactivar `synchronize` de TypeORM y usar **migraciones**; guardar secretos en un gestor de secretos (AWS Secrets Manager, etc.).

---

## Despliegue en AWS

El proyecto está preparado para AWS en el sentido de que:

- Cada servicio tiene **Dockerfile** y se ejecuta como contenedor.
- Toda la configuración va por **variables de entorno** (sin hardcodear URLs ni secretos).
- La comunicación entre servicios es por **HTTP** y **mensajería (RabbitMQ)**, fácil de reemplazar por servicios gestionados en AWS.

### Componentes recomendados en AWS

| Componente | Uso en el proyecto | Opción en AWS |
|------------|--------------------|----------------|
| **Contenedores** | Una imagen por microservicio | **Amazon ECS (Fargate)** o EKS |
| **Registro de imágenes** | Build desde cada `apps/*/Dockerfile` | **Amazon ECR** (un repositorio por servicio o por app) |
| **Bases de datos** | 4 PostgreSQL (catalog, users, orders, inventory) | **Amazon RDS** (una instancia con 4 BDs) o **Aurora PostgreSQL** (multi-DB) |
| **Event bus** | RabbitMQ en Docker | **Amazon MQ (RabbitMQ)** o **Amazon SQS/SNS** (requiere adaptar el código a SDK AWS) |
| **Secrets** | `JWT_SECRET`, connection strings | **AWS Secrets Manager** o **Systems Manager Parameter Store** |
| **Tráfico entrante** | Varios puertos (3001–3005) | **Application Load Balancer (ALB)** con reglas por path o por subdominio |
| **DNS** | N/A | **Route 53** (opcional) |

### Flujo típico de despliegue en AWS

1. **Build y push de imágenes**  
   Construir cada servicio con su Dockerfile y subir a ECR (por ejemplo con GitHub Actions o AWS CodeBuild).

2. **Infraestructura**  
   - VPC, subnets, security groups.  
   - RDS (o Aurora) con 4 bases de datos (o 4 instancias si se prefiere aislar por servicio).  
   - Amazon MQ para RabbitMQ o migración a SQS/SNS.  
   - ECR para las imágenes.

3. **ECS**  
   - Cluster ECS (Fargate).  
   - Task definitions por servicio: imagen ECR, variables de entorno y secretos (desde Secrets Manager).  
   - Servicios ECS que mantengan N tareas por microservicio.  
   - Health checks sobre `/api` o un endpoint dedicado.

4. **Red y tráfico**  
   - ALB con listeners HTTPS (certificado en ACM).  
   - Reglas por path (ej. `/api/catalog*` → catalog-service, `/api/orders*` → order-service) o por host.  
   - En ECS: target groups por servicio y registro automático de las tareas.

5. **Comunicación entre servicios**  
   - `USERS_SERVICE_URL`: URL interna del ALB o del servicio de discovery (ej. Cloud Map) que apunte al users-service.  
   - `DATABASE_URL` y `EVENT_BUS_URL`: endpoints de RDS y Amazon MQ en la VPC.

El código ya incluye una referencia a **Amazon EventBridge** en `apps/catalog-service/src/infrastructure/adapters/messaging/event-bridge.adapter.ts`; en producción se puede sustituir el envío por RabbitMQ por EventBridge o SNS si se adopta el bus de eventos de AWS.

---

## Scripts del monorepo

| Script | Descripción |
|--------|-------------|
| `npm run build` | Compila todos los servicios (Nest CLI) |
| `npm run start` | Arranca el proyecto por defecto (elegir servicio con `nest start <nombre>`) |
| `npm run start:dev <servicio>` | Modo watch para un servicio (ej. `catalog-service`) |
| `npm run infrastructure:up` | `docker-compose up -d` (solo infra) |
| `npm run infrastructure:down` | `docker-compose down` |
| `npm run lint` | ESLint sobre `src`, `apps`, `libs`, `test` |

---

## Estructura del repositorio

```
ecommerce-urbano/
├── apps/
│   ├── auth-service/      # Login JWT, consume users
│   ├── catalog-service/   # Productos, emite eventos
│   ├── inventory-service/ # Stock, consume product_created y order_created
│   ├── order-service/     # Órdenes, emite order_created
│   └── users-service/     # Usuarios y validación para auth
├── docker-compose.yml     # Infra + todos los microservicios
├── nest-cli.json         # Monorepo Nest (proyectos por app)
└── package.json           # Workspaces: apps/*
```

Cada servicio suele seguir una estructura por capas: `application/`, `infrastructure/`, y en algunos `domain/`.

---

## Plan de mejoras

Roadmap de mejoras en **Deploy**, **Seguridad**, **Observabilidad**, **Costos** y **Operación** en [docs/PLAN-MEJORAS.md](docs/PLAN-MEJORAS.md). Incluye tareas por fases, criterios de éxito y orden sugerido de ejecución.

---

## Licencia

MIT.
