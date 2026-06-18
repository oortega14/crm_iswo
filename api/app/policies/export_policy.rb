# frozen_string_literal: true

# ============================================================================
# ExportPolicy — historiales de exportaciones async (RFC §6.7).
# ============================================================================
# Export masivo e historial: solo admin/manager.
# Importación de contactos: admin/manager/consultant vía ContactsController.
# ============================================================================
class ExportPolicy < ApplicationPolicy
  def index?    = manager_or_admin?
  def show?     = manager_or_admin?
  def download? = show?
  def create?   = manager_or_admin?
  def destroy?  = admin?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless user
      return scope.all if admin? || manager?

      scope.none
    end
  end
end
