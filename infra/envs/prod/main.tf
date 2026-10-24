locals {
  name = "portfolio-prod"
}

# The backend's network and database. Off until something uses the database, so applying prod for
# the sites doesn't create (or bill for) Aurora.
module "network" {
  source = "../../modules/network"
  count  = var.enable_database ? 1 : 0

  name = local.name
}

module "database" {
  source = "../../modules/database"
  count  = var.enable_database ? 1 : 0

  name       = local.name
  vpc_id     = module.network[0].vpc_id
  subnet_ids = module.network[0].private_subnet_ids
}
