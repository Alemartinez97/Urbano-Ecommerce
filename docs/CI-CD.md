# CI/CD – Urbano E-commerce

Pipeline with **GitHub Actions**: CI on every push/PR, CD (Docker images) on push to `main`.

---

## Workflows

### 1. CI (`.github/workflows/ci.yml`)

**When:** on every `push` and `pull_request` to `main`, `master`, or `develop`.

**Steps:**

1. Checkout code.
2. Set up Node.js 20 (with `npm` cache).
3. `npm ci` (clean install from `package-lock.json`).
4. `npm run lint` (ESLint).
5. `npm run build:all` (builds all 5 microservices: catalog, users, auth, inventory, order).

If any step fails, the workflow fails. Use it to avoid merging PRs with broken lint or build.

---

### 2. CD (`.github/workflows/cd.yml`)

**When:** on every `push` to `main` or `master`.

**What it does:** builds the 5 Docker images (one per microservice) and pushes them to **GitHub Container Registry** (ghcr.io).

**Images produced:**

| Service          | Image (example)                          |
|------------------|-------------------------------------------|
| catalog-service  | `ghcr.io/<OWNER>/urbano-catalog-service`  |
| users-service    | `ghcr.io/<OWNER>/urbano-users-service`    |
| auth-service     | `ghcr.io/<OWNER>/urbano-auth-service`    |
| inventory-service| `ghcr.io/<OWNER>/urbano-inventory-service`|
| order-service    | `ghcr.io/<OWNER>/urbano-order-service`    |

**Tags:** `latest` (only on main/master), branch name, and commit SHA.

**Permissions:** uses `GITHUB_TOKEN` with `packages: write`; no extra secrets needed for GHCR in the same repo.

---

### 3. CD (ECR) (`.github/workflows/cd-ecr.yml`)

**When:** on every `push` to `main` or `master`, or manually via **Actions → CD (ECR) → Run workflow**.

**What it does:** builds the 5 Docker images and pushes them to **Amazon ECR** for AWS deployment (ECS Fargate, etc.).

**Requirements:**

- In the repo: **Settings → Secrets and variables → Actions**, configure:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION` (e.g. `us-east-1`)
- ECR repositories: create them with **Terraform** (recommended) from [infra/README.md](../infra/README.md), or manually (see [docs/DEPLOY-AWS.md](DEPLOY-AWS.md)).

**Images:** `<account>.dkr.ecr.<region>.amazonaws.com/urbano-<service>:latest` and `:<sha>`.

Full AWS deployment guide (ECR, ECS, ALB, RDS, Secrets Manager): **[docs/DEPLOY-AWS.md](DEPLOY-AWS.md)**.

---

## Using the images in another environment

After a push to `main`, images are in GHCR. To use them:

1. **Public:** if the repo is public, images are visible; to pull from another machine or cluster you need to log in:
   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u <your-username> --password-stdin
   docker pull ghcr.io/<owner>/urbano-catalog-service:latest
   ```
2. **Private:** the token must have `read:packages` scope (or use a PAT with that permission).

In **Kubernetes** or **ECS** you configure the registry as private and use a Docker or platform secret for the pull.

---

## Disabling or changing CD

- **Stop publishing images:** delete or disable `.github/workflows/cd.yml` (Actions tab → disable the workflow).
- **Other registry (Docker Hub, etc.):** in `cd.yml` replace the `docker/login-action` step with your registry and adjust the image prefix. For **Amazon ECR** use the `cd-ecr.yml` workflow and the [DEPLOY-AWS.md](DEPLOY-AWS.md) guide.

---

## Local scripts equivalent to CI

To reproduce what CI does locally:

```bash
npm ci
npm run lint
npm run build:all
```

To build a single service:

```bash
nest build catalog-service
# or
nest build users-service
# etc.
```

---

## E2E tests in CI (optional)

E2E tests (`npm run test:e2e`) require all five microservices to be running. To run them in CI you can add a job that starts the stack and then runs the tests:

```yaml
# Example: extra job in ci.yml
  e2e:
    name: E2E
    runs-on: ubuntu-latest
    needs: lint-and-build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: docker-compose up -d
      - run: npx wait-on -t 60000 http://localhost:3001/api/health http://localhost:3002/api/health http://localhost:3003/api/health
      - run: npm run test:e2e
      - run: docker-compose down
```

(Requires `wait-on` or another way to wait for services to respond.)
