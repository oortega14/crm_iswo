# frozen_string_literal: true

# ============================================================================
# AuditEventPolicy — auditoría ISO 27001:2022.
# ============================================================================
# Solo admin lee la bitácora completa. Manager puede ver eventos
# relacionados con sus equipos (filtro en el controller, no acá).
# Nadie puede modificar ni borrar (compliance / no-repudio).
# ============================================================================
class AuditEventPolicy < ApplicationPolicy
  def index?   = admin? || manager?
  def show?    = admin? || manager?
  def create?  = false
  def update?  = false
  def destroy? = false

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless user
      return scope.none unless admin? || manager?

      # Tenant plataforma: eventos del propio tenant + globales (tenant_id NULL), p. ej. tenant_onboard.
      if platform_tenant_user?
        return scope.where(tenant_id: [user.tenant_id, nil])
      end

      scope.where(tenant_id: user.tenant_id)
    end

    private

    def platform_tenant_user?
      PlatformTenant.slug?(user.tenant&.slug)
    end
  end
end
