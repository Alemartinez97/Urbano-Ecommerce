output "ecr_repository_urls" {
  description = "ECR repository URLs (use these in ECS task definitions or to pull images)"
  value       = { for k, r in aws_ecr_repository.microservice : k => r.repository_url }
}

output "ecr_registry" {
  description = "ECR registry URL (account + region); used by docker login and GitHub Actions"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

output "github_secrets_instructions" {
  description = "Set these as GitHub repository secrets (Settings → Secrets and variables → Actions)"
  value = <<-EOT
    AWS_ACCESS_KEY_ID    = <IAM user access key with ECR push permissions>
    AWS_SECRET_ACCESS_KEY = <IAM user secret key>
    AWS_REGION           = ${var.aws_region}
  EOT
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
