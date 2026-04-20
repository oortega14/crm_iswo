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
  def create?  = manager_or_admin?
  def update?  = admin? || (manager? && !target_is_admin?) || owner?
  def destroy? = admin? && !owner? # no borrarse a sí mismo

  def activate?       = update?
  def deactivate?     = update?
  def reset_password? = admin?

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
