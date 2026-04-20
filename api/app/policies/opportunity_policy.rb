# frozen_string_literal: true

# ============================================================================
# OpportunityPolicy
# ============================================================================
# - admin/manager: ven y editan todas las oportunidades del tenant.
# - consultant: ve y edita las suyas (owner_user_id == user.id).
# - viewer: solo lectura sobre todas.
#
# Reasignar (assign) y mergear son acciones sensibles → solo admin/manager.
# ============================================================================
class OpportunityPolicy < ApplicationPolicy
  def index?            = staff?
  def show?             = staff? && (manager_or_admin? || viewer? || owner?)
  def create?           = admin? || manager? || consultant?
  def update?           = admin? || manager? || owner?
  def destroy?          = admin?

  def move_stage?         = update?
  def assign?             = manager_or_admin?
  def merge?              = manager_or_admin?
  def recalculate_bant?   = update?
  def kanban?             = staff?
  def export?             = manager_or_admin?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless user

      if admin? || manager? || viewer?
        scope.all
      elsif consultant?
        scope.where(owner_user_id: user.id)
      else
        scope.none
      end
    end
  end

  private

  def owner?
    record.respond_to?(:owner_user_id) && record.owner_user_id == user&.id
  end
end
