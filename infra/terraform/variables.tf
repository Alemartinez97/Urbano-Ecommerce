variable "aws_region" {
  description = "AWS region for ECR and other resources"
  type        = string
  default     = "us-east-1"
}

variable "ecr_repository_prefix" {
  description = "Prefix for ECR repository names (e.g. urbano -> urbano-catalog-service)"
  type        = string
  default     = "urbano"
}

variable "microservices" {
  description = "List of microservice names (used for ECR repo names)"
  type        = list(string)
  default = [
    "catalog-service",
    "users-service",
    "auth-service",
    "inventory-service",
    "order-service"
  ]
}
