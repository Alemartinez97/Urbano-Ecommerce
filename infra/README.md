# Infrastructure – Deploy Urbano E-commerce to AWS

This folder contains **Terraform** to create the AWS resources needed so anyone can deploy the application with minimal manual steps.

---

## What gets created

| Resource | Purpose |
|----------|---------|
| **ECR repositories** | One per microservice (`urbano-catalog-service`, etc.). GitHub Actions CD pushes Docker images here on every push to `main`. |
| **Lifecycle policy** | Keeps the last 15 images per repo to limit storage cost. |

After running Terraform, you only need to **set GitHub secrets** and **push to main** (or run the CD workflow manually) to have images in ECR. Then you can run the containers on ECS, EKS, or any other platform that pulls from ECR.

---

## Prerequisites

- **AWS account** with permissions to create ECR repositories (and IAM if you use the optional IAM user).
- **AWS CLI** installed and configured: `aws configure` (Access Key, Secret Key, region).
- **Terraform** >= 1.0 installed: [terraform.io/downloads](https://www.terraform.io/downloads).

---

## Quick start (5 steps)

### 1. Go to the Terraform directory

```bash
cd infra/terraform
```

### 2. Initialize and apply

```bash
terraform init
terraform plan   # optional: review changes
terraform apply  # type yes when prompted
```

This creates the 5 ECR repositories in the region set in your AWS config (or override with `-var="aws_region=eu-west-1"`).

### 3. Note the outputs

After `apply`, Terraform prints:

- **ecr_repository_urls** – URLs for each repo (for ECS task definitions or `docker pull`).
- **ecr_registry** – Registry host (e.g. `123456789012.dkr.ecr.us-east-1.amazonaws.com`).
- **github_secrets_instructions** – Reminder of which GitHub secrets to set.

You can show them again anytime with:

```bash
terraform output
```

### 4. Configure GitHub secrets

In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Secret | Value |
|--------|--------|
| `AWS_ACCESS_KEY_ID` | IAM user access key (must have ECR push permissions). |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key. |
| `AWS_REGION` | Same region used in Terraform (e.g. `us-east-1`). |

To create an IAM user with minimal ECR permissions, use the AWS console or the example in `iam-github-ecr.tf.example` (rename to `iam-github-ecr.tf` and apply).

### 5. Push to main or run the CD workflow

- **Option A:** Push a commit to the `main` (or `master`) branch. The **CD (ECR)** workflow builds and pushes all 5 images to ECR.
- **Option B:** Go to **Actions → CD (ECR) → Run workflow** and run it manually.

After the workflow succeeds, images are available in ECR as `urbano-<service>:latest` and `urbano-<service>:<sha>`.

---

## Next steps: run the containers

Once images are in ECR, you can:

- **ECS Fargate:** See [docs/DEPLOY-AWS.md](../docs/DEPLOY-AWS.md) for task definitions, ALB, RDS, and step-by-step instructions.
- **Other:** Use the ECR URLs from `terraform output ecr_repository_urls` in your own orchestration (EKS, App Runner, etc.).

---

## Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `aws_region` | AWS region for ECR | `us-east-1` |
| `ecr_repository_prefix` | Prefix for repo names | `urbano` |
| `microservices` | List of service names | catalog, users, auth, inventory, order |

Override from the command line:

```bash
terraform apply -var="aws_region=eu-west-1"
```

Or use a `terraform.tfvars` file (do not commit secrets):

```hcl
aws_region = "eu-west-1"
```

---

## Optional: IAM user for GitHub Actions

The file `iam-github-ecr.tf.example` shows how to create an IAM user that can only push to the Urbano ECR repos. To use it:

1. Copy: `cp iam-github-ecr.tf.example iam-github-ecr.tf`
2. Uncomment the contents of `iam-github-ecr.tf`
3. Run `terraform apply`
4. In the AWS console, create an **Access key** for the user `urbano-github-ecr` and set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in GitHub secrets.

---

## State

By default Terraform stores state locally (`.terraform.tfstate`). For team use, configure a **remote backend** (e.g. S3 + DynamoDB) by uncommenting and editing the `backend "s3"` block in `main.tf`.
