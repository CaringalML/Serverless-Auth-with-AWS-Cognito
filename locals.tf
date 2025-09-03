locals {
  # Computed domain values
  api_domain    = "${var.api_subdomain}.${var.root_domain}"
  frontend_url  = "https://${var.root_domain}"
  api_url       = "https://${local.api_domain}"
}