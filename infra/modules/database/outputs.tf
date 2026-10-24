output "endpoint" {
  description = "Writer endpoint hostname."
  value       = aws_rds_cluster.this.endpoint
}

output "port" {
  value = aws_rds_cluster.this.port
}

output "database_name" {
  value = aws_rds_cluster.this.database_name
}

output "master_user_secret_arn" {
  description = "Secrets Manager secret holding the generated master password."
  value       = aws_rds_cluster.this.master_user_secret[0].secret_arn
}

output "client_security_group_id" {
  description = "Attach to anything that should be allowed to connect."
  value       = aws_security_group.clients.id
}
