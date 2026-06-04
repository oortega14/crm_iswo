# frozen_string_literal: true

# ============================================================================
# UserPolicy — gestión de usuarios del tenant.
# ============================================================================
# - admin: CRUD completo sobre users del mismo tenant.
# - manager: puede ver y crear consultants/viewers, pero no editar admins.
# - el resto: solo ver su propio perfil (vía /api/v1/me).
# ============================================================================
class UserPolicy < ApplicationPolicy
  def index?   = manager_or_admin?
  def show?    = manager_or_admin? || owner?
  def create?  = admin?
  def update?  = admin? || owner?
  def destroy? = admin? && !owner? # no borrarse a sí mismo

  def activate?       = admin?
  def deactivate?     = admin? && !owner?
  def reset_password?
    return false unless manager_or_admin?
    return false if manager? && target_is_admin?

    true
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless user

      if admin? || manager?
        scope.all
      else
        scope.where(id: user.id)
      end
    end
  end

  private

  def owner?            = record.is_a?(User) && record.id == user&.id
  def target_is_admin?  = record.respond_to?(:role) && record.role == "admin"
end
