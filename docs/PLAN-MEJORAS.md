# Improvement plan – Urbano E-commerce

Roadmap for **Deploy**, **Security**, **Observability**, **Cost**, and **Operations**. Tasks by phase with suggested order.

---

## Deploy

- [x] ECR repositories via Terraform (`infra/terraform/`)
- [x] CD workflow to push images to ECR on push to `main`
- [x] Documentation: infra/README, DEPLOY-AWS, ESTRATEGIA-AWS
- [ ] Optional: Terraform modules for ECS Fargate, ALB, RDS (or use manual/console steps in DEPLOY-AWS)
- [ ] Optional: Staging/production environments and promotion flow

---

## Security

- [x] Helmet, CORS config, JWT on protected routes, rate limiting on login
- [ ] Optional: API keys or scope-based tokens for internal services
- [ ] Optional: Dependency scanning (e.g. npm audit, Snyk) in CI
- [ ] In production: disable TypeORM `synchronize`, use migrations; secrets from Parameter Store/Secrets Manager

---

## Observability

- [x] Structured logs (JSON in production), health endpoint `/api/health`
- [x] Datadog APM (dd-trace) + log correlation (trace_id/span_id in logs); see [observability-datadog.md](observability-datadog.md)
- [ ] Optional: Metrics (Prometheus/CloudWatch) and dashboards
- [ ] Optional: Alerting on health check failures or error rate

---

## Cost

- Prefer free-tier–friendly options (see ESTRATEGIA-AWS: EC2 t2.micro, RDS db.t3.micro, Parameter Store).
- ECR lifecycle policy keeps last 15 images per repo to limit storage.
- Review ECS/RDS/ALB usage periodically.

---

## Operations

- [x] Docker Compose for local and optional single-host deploy
- [x] Single-command infra: `npm run infrastructure:up` / `docker-compose up -d`
- [ ] Optional: Runbooks for common incidents (DB down, RabbitMQ full, etc.)
- [ ] Optional: Backup/restore procedure for RDS and critical data

---

## Success criteria

- New contributor can clone, run `docker-compose up -d`, and hit Swagger in under 10 minutes.
- Deployer can provision ECR with Terraform, set GitHub secrets, and have images in ECR after push to `main`.
- Production deploy follows DEPLOY-AWS (ECS, ALB, RDS, secrets) with no hardcoded credentials.
