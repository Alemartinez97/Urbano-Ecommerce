# AWS Deployment – Urbano E-commerce

**Operational** step-by-step guide (ECR, ECS Fargate, ALB, RDS, etc.). The **strategy** and **code ready** checklist are in **[ESTRATEGIA-AWS.md](ESTRATEGIA-AWS.md)**.

**Quick deploy:** This repo includes **Terraform** in `infra/terraform/` to create ECR repositories (and optional IAM user) so anyone can deploy with few steps. See **[infra/README.md](../infra/README.md)** for the 5-step quick start (Terraform apply → set GitHub secrets → push to main). The sections below cover manual alternatives and full ECS/ALB/RDS setup.

---

## Prerequisites

- AWS account with permissions for ECR, ECS, ALB, (optional) RDS, Amazon MQ, Secrets Manager.
- **AWS CLI** installed and configured (`aws configure`).
- GitHub repo with the **secrets** listed below (for the CD-to-ECR workflow).

---

## 1. Amazon ECR (Docker images)

**Easiest:** Use Terraform (recommended). From the repo root:

```bash
cd infra/terraform && terraform init && terraform apply
```

Then set GitHub secrets and push to `main`. Full steps: **[infra/README.md](../infra/README.md)**.

---

### 1.1 Create ECR repositories (manual alternative)

If you prefer not to use Terraform, create one repository per service in your region (e.g. `us-east-1`):

```bash
AWS_REGION=us-east-1

for service in catalog-service users-service auth-service inventory-service order-service; do
  aws ecr create-repository \
    --repository-name "urbano-${service}" \
    --region "$AWS_REGION" \
    --image-scanning-configuration scanOnPush=true
done
```

Verify they exist:

```bash
aws ecr describe-repositories --region "$AWS_REGION" --query 'repositories[].repositoryName' --output table
```

### 1.2 GitHub secrets (for CD → ECR workflow)

In the repo: **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key with ECR (and optionally ECS) permissions. |
| `AWS_SECRET_ACCESS_KEY` | Secret key for the same user. |
| `AWS_REGION` | Region where ECR repos live (e.g. `us-east-1`). |

**Recommendation:** use an IAM user for CI/CD only, with a policy that allows `ecr:GetAuthorizationToken` and on `urbano-*` repos: `ecr:BatchCheckLayerAvailability`, `ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, `ecr:PutImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`.

### 1.3 Run CD to ECR

On every **push to `main`** (or `master`) the **CD (ECR)** workflow (`.github/workflows/cd-ecr.yml`) runs. You can also trigger it manually: **Actions → CD (ECR) → Run workflow**.

After a successful run, images are in ECR as:

- `123456789012.dkr.ecr.us-east-1.amazonaws.com/urbano-catalog-service:latest`
- `123456789012.dkr.ecr.us-east-1.amazonaws.com/urbano-users-service:latest`
- (and similarly for auth, inventory, order)

Replace `123456789012` with your **Account ID** and the region with yours.

---

## 2. Network (VPC and subnets)

You can use the **default VPC** or a dedicated one. For Fargate you need:

- **Private** subnets (where ECS tasks run) and, if they need internet (e.g. ECR pull), **NAT Gateway** or NAT instances.
- **Public** subnets for the ALB (and optionally NAT).

If you create a new VPC, ensure subnets have enough CIDR and the **ALB security group** allows 80/443 from the internet and the **ECS** one allows traffic from the ALB on the service port (e.g. 3000).

---

## 3. Databases (RDS PostgreSQL)

One option is **one RDS PostgreSQL instance** with **4 databases** (catalog_db, users_prod, orders_db, inventory_db), one per microservice. Create the instance in the same VPC as ECS, in subnets reachable from tasks (e.g. private).

Minimal example (CLI):

```bash
# Create subnet group and security group first if they don't exist
aws rds create-db-instance \
  --db-instance-identifier urbano-postgres \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username postgres \
  --master-user-password "YOUR_SECURE_PASSWORD" \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name my-db-subnet-group
```

Then create the 4 databases on that instance (console, pgAdmin, or `psql`):

```sql
CREATE DATABASE catalog_db;
CREATE DATABASE users_prod;
CREATE DATABASE orders_db;
CREATE DATABASE inventory_db;
```

The **URLs** you will use in task definitions look like:

- `postgres://user:password@urbano-postgres.xxxxx.us-east-1.rds.amazonaws.com:5432/catalog_db`
- (and similarly for users_prod, orders_db, inventory_db)

Store them in **Secrets Manager** (see section 5) and pass them as env in ECS.

---

## 4. Event bus (Amazon MQ for RabbitMQ)

To avoid code changes, the most direct option is **Amazon MQ** with a **RabbitMQ** broker. Create it in the same VPC and note the AMQP URL (and user/vhost if you set them).

In the task definitions for **catalog**, **inventory**, and **order** set:

- `EVENT_BUS_URL=amqp://user:password@b-xxxxx.mq.us-east-1.amazonaws.com:5671`

(Use the port and endpoint from the Amazon MQ console; 5671 is typically TLS.)

If you prefer **SQS/SNS**, you would need to adapt the code (replace the RabbitMQ client with the AWS SDK).

---

## 5. Secrets Manager (recommended)

Store in **AWS Secrets Manager** (or Parameter Store) everything sensitive and reference it from ECS:

- **JWT_SECRET** (string).
- **DATABASE_URL** per service (catalog, users, inventory) or one per DB.
- **ORDERS_DATABASE_URL** for order-service.
- **EVENT_BUS_URL** (if not passed as a plain env var).

Example secret (JSON) for one service:

```json
{
  "JWT_SECRET": "your-jwt-secret-base64",
  "DATABASE_URL": "postgres://user:pass@rds-endpoint:5432/catalog_db"
}
```

In the ECS **task definition** you can inject secrets like this (Fargate example):

```json
{
  "name": "DATABASE_URL",
  "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:urbano/catalog-db:url::"
}
```

Or with a specific key from the JSON:

```json
{
  "name": "JWT_SECRET",
  "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:urbano/jwt:JWT_SECRET::"
}
```

This keeps passwords out of the task definition.

---

## 6. ECS Fargate (cluster, task definition, service)

### 6.1 Cluster

```bash
aws ecs create-cluster --cluster-name urbano-cluster --region us-east-1
```

### 6.2 Task definition (example: catalog-service)

Each service has its own task definition. Minimal example for **catalog-service** (adjust account, region, subnets, security groups, and secret ARNs):

```json
{
  "family": "urbano-catalog-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "catalog",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/urbano-catalog-service:latest",
      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
      "essential": true,
      "environment": [
        { "name": "PORT", "value": "3000" },
        { "name": "NODE_ENV", "value": "production" }
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:urbano/catalog-db:DATABASE_URL::" },
        { "name": "EVENT_BUS_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:urbano/event-bus:EVENT_BUS_URL::" },
        { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:urbano/jwt:JWT_SECRET::" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/urbano-catalog",
          "awslogs-region": "us-east-1"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

Important points:

- **executionRoleArn:** role that allows ECS to pull from ECR and read Secrets Manager (and write to CloudWatch Logs).
- **taskRoleArn:** (optional) task role for accessing other AWS services.
- **portMappings:** container listens on 3000; the ALB will use that port in the target group.
- **healthCheck:** uses `GET /api/health`; ECS uses it to know if the task is healthy.

Register the task definition:

```bash
aws ecs register-task-definition --cli-input-json file://task-definition-catalog.json
```

Repeat the same pattern for **users**, **auth**, **inventory**, and **order**, changing image, container name, variables (e.g. `ORDERS_DATABASE_URL` for order, `USERS_SERVICE_URL` for auth), and log group.

### 6.3 ECS service

For each service, create an **ECS Service** using the corresponding task definition, behind an ALB **target group**:

- Launch type: **Fargate**.
- Desired count: 1 (or more for HA).
- Subnets: same ones the ALB can reach (typically private with NAT or public).
- Security group: allow traffic on the container port (3000) from the ALB security group.
- **Load balancing:** ALB, one target group per service (e.g. `urbano-catalog-tg`), port 3000, health check path `/api/health`.

Example (CLI) for catalog, once the ALB and target group exist:

```bash
aws ecs create-service \
  --cluster urbano-cluster \
  --service-name catalog-service \
  --task-definition urbano-catalog-service \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=catalog,containerPort=3000"
```

---

## 7. Application Load Balancer (ALB)

### 7.1 Create ALB

- Scheme: **internet-facing** (or internal for private only).
- Subnets: public (or those you expose to clients).
- Security group: allow 80 and 443 from 0.0.0.0/0 (or only your IPs).

### 7.2 Listeners and target groups

- **Listener 443 (HTTPS):** certificate in ACM; redirect or serve traffic.
- **Listener 80 (HTTP):** optional redirect to 443.

Create **one target group per microservice**, HTTP protocol, port 3000, VPC, health check path `/api/health`. Associate each target group with the corresponding **ECS service** (via “Load balancing” when creating the service).

### 7.3 Path-based (or host-based) rules

On the listener (e.g. 443), add rules to route by **path**:

| Priority | Condition (path) | Action |
|----------|------------------|--------|
| 1 | `/api/catalog*` | Forward to → `urbano-catalog-tg` |
| 2 | `/api/users*` | Forward to → `urbano-users-tg` |
| 3 | `/api/auth*` | Forward to → `urbano-auth-tg` |
| 4 | `/api/inventory*` | Forward to → `urbano-inventory-tg` |
| 5 | `/api/orders*` | Forward to → `urbano-order-tg` |
| 6 | (default) | Fixed response 404 or forward to a frontend if you have one |

Then a single URL (or domain) serves everything: `https://api.yourdomain.com/api/catalog/...`, `https://api.yourdomain.com/api/orders/...`, etc.

### 7.4 Internal URL for auth → users

In the **auth-service** task definition, `USERS_SERVICE_URL` must point to users-service. Options:

- **Via ALB:** `https://api.yourdomain.com` (auth calls `https://api.yourdomain.com/api/users/validate`). The ALB routes `/api/users*` to users-service.
- **Via internal service:** if you use **Cloud Map** (service discovery), you can have a name like `users-service.urbano.local` and set `USERS_SERVICE_URL=http://users-service.urbano.local:3000`. The simplest approach at first is to use the same ALB URL.

---

## 8. Summary and checklist

| Step | Action |
|------|--------|
| 1 | Create 5 ECR repos (`urbano-<service>`). |
| 2 | Configure GitHub secrets (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION). |
| 3 | Push to `main` or run **CD (ECR)** manually to have images in ECR. |
| 4 | VPC and subnets (or use default); security groups for ALB and ECS. |
| 5 | RDS PostgreSQL with 4 DBs; note endpoints and store URLs in Secrets Manager. |
| 6 | (Optional) Amazon MQ RabbitMQ; store EVENT_BUS_URL in Secrets Manager. |
| 7 | Create secrets in Secrets Manager (JWT, DATABASE_URLs, EVENT_BUS_URL, etc.). |
| 8 | Create ECS cluster; register 5 task definitions (one per service) with ECR image and secrets. |
| 9 | Create ALB, target groups, and path rules; create 5 ECS services linked to target groups. |
| 10 | Set USERS_SERVICE_URL for auth (ALB or service discovery). |
| 11 | (Optional) DNS in Route 53 and ACM certificate for HTTPS on the ALB. |

Once everything is in place, traffic hits the ALB and it routes by path to each microservice on Fargate. Images are updated on every push to `main` via the **CD (ECR)** workflow; to deploy the new version, update the ECS service (new task definition revision or “force new deployment”) so it uses `:latest` or the SHA tag you use.

---

## References

- [ECS Task Definition Parameters](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html)
- [ALB Path-based routing](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listener.html#path-conditions)
- [Secrets in ECS tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html)
