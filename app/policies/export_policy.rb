# frozen_string_literal: true

# ============================================================================
# ExportPolicy — historiales de exportaciones async.
# ============================================================================
# Todo usuario ve sus propios exports; manager/admin ven los de todos.
# Crear exports requiere manager/admin (son costosos y tocan datos sensibles).
# ============================================================================
class ExportPolicy < ApplicationPolicy
  def index?   = staff?
  def show?    = manager_or_admin? || owner?
  def create?  = manager_or_admin?
  def destroy? = admin?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless user
      return scope.all  if admin? || manager?

      scope.where(user_id: user.id)
    end
  end

  private

  def owner? = record.respond_to?(:user_id) && record.user_id == user&.id
end
