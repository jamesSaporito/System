# Aurora PostgreSQL (Serverless v2) that pauses when idle. The first connection after a pause
# waits ~15 seconds while it resumes.

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

resource "aws_db_subnet_group" "this" {
  name       = var.name
  subnet_ids = var.subnet_ids
}

# Attach this group to anything that needs the database (e.g. the backend); the database's own
# group only admits members of it.
resource "aws_security_group" "clients" {
  name        = "${var.name}-db-clients"
  description = "Members may connect to the ${var.name} database"
  vpc_id      = var.vpc_id
}

resource "aws_security_group" "database" {
  name        = "${var.name}-db"
  description = "The ${var.name} database"
  vpc_id      = var.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "from_clients" {
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = aws_security_group.clients.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  description                  = "PostgreSQL from database clients"
}

resource "aws_rds_cluster" "this" {
  cluster_identifier = var.name
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  engine_version     = var.engine_version
  database_name      = var.database_name
  master_username    = var.master_username

  # RDS generates the password and keeps it in Secrets Manager, so it never appears in
  # Terraform state or code.
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.database.id]
  storage_encrypted      = true

  serverlessv2_scaling_configuration {
    min_capacity             = 0
    max_capacity             = var.max_capacity
    seconds_until_auto_pause = var.seconds_until_auto_pause
  }

  backup_retention_period = var.backup_retention_days
  copy_tags_to_snapshot   = true

  # Guard rails against losing data: destroying requires turning deletion protection off first,
  # and still leaves a final snapshot behind.
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.name}-final"
}

resource "aws_rds_cluster_instance" "writer" {
  identifier          = "${var.name}-writer"
  cluster_identifier  = aws_rds_cluster.this.id
  instance_class      = "db.serverless"
  engine              = aws_rds_cluster.this.engine
  engine_version      = aws_rds_cluster.this.engine_version
  publicly_accessible = false
}
