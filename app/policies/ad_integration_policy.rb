# frozen_string_literal: true

# ============================================================================
# AdIntegrationPolicy — credenciales sensibles (Lockbox).
# ============================================================================
# Solo admin gestiona credenciales. Manager puede ver el listado (sin
# credenciales) y testear conexión.
# ============================================================================
class AdIntegrationPolicy < ApplicationPolicy
  def index?   = manager_or_admin?
  def show?    = manager_or_admin?
  def create?  = admin?
  def update?  = admin?
  def destroy? = admin?

  def test_connection? = manager_or_admin?
  def disable?         = admin?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless user
      return scope.all  if admin? || manager?

      scope.none
    end
  end
end
