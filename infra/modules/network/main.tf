# A private-only VPC: no internet gateway and no NAT, so nothing in it is reachable from (or can
# reach) the internet. Add public subnets or VPC endpoints here when a service needs them.

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = var.name
  }
}

# One private subnet per availability zone (Aurora requires at least two).
resource "aws_subnet" "private" {
  count = var.az_count

  vpc_id            = aws_vpc.this.id
  availability_zone = data.aws_availability_zones.available.names[count.index]
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index)

  tags = {
    Name = "${var.name}-private-${data.aws_availability_zones.available.names[count.index]}"
  }
}

# Strip the default security group's rules so nothing uses it by accident.
resource "aws_default_security_group" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${var.name}-default-unused"
  }
}
