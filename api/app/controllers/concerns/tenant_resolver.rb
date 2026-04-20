# frozen_string_literal: true

# ============================================================================
# TenantResolver — identifica el tenant desde el request.
# ============================================================================
# Prioridad:
#   1. Subdominio (`micasita.crm.iswo.com.co` → slug "micasita").
#   2. Header `X-Tenant-Slug` (fallback para tests y clientes internos).
#
# Si no resuelve, responde 400 para evitar caer en `ActsAsTenant::NoTenantSet`
# más profundo con un mensaje poco útil.
# ----------------------------------------------------------------------------
module TenantResolver
  extend ActiveSupport::Concern

  RESERVED_SUBDOMAINS = %w[www api app admin].freeze

  included do
    before_action :resolve_tenant!
    around_action :scope_to_tenant
  end

  attr_reader :current_tenant

  private

  def resolve_tenant!
    slug = tenant_slug_from_subdomain || tenant_slug_from_header
    return render_tenant_missing if slug.blank?

    @current_tenant = Tenant.active.find_by(slug: slug)
    render_tenant_missing unless @current_tenant
  end

  def tenant_slug_from_subdomain
    subdomain = request.subdomains.reject { |s| RESERVED_SUBDOMAINS.include?(s) || s == "crm" }.first
    subdomain.presence
  end

  def tenant_slug_from_header
    request.headers["X-Tenant-Slug"].to_s.strip.downcase.presence
  end

  def scope_to_tenant
    if @current_tenant
      ActsAsTenant.with_tenant(@current_tenant) { yield }
    else
      yield
    end
  end

  def render_tenant_missing
    render json: {
      error:   "tenant_missing",
      message: "No se pudo resolver el tenant (usar subdominio o header X-Tenant-Slug)"
    }, status: :bad_request
  end
end
