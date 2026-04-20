# frozen_string_literal: true

# ============================================================================
# TenantPolicy — solo admin del tenant ve y edita la configuración global.
# ============================================================================
class TenantPolicy < ApplicationPolicy
  def show?    = staff?
  def update?  = admin?
  def destroy? = false # nunca desde la API, solo a mano / consola.

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.where(id: user&.tenant_id)
  end
end
