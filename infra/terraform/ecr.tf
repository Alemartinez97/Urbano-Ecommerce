resource "aws_ecr_repository" "microservice" {
  for_each = toset(var.microservices)

  name                 = "${var.ecr_repository_prefix}-${each.value}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Project = "urbano-ecommerce"
    Service = each.value
  }
}

resource "aws_ecr_lifecycle_policy" "microservice" {
  for_each   = toset(var.microservices)
  repository = aws_ecr_repository.microservice[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 15 images"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 15
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
