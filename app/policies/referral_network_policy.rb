# frozen_string_literal: true

# ============================================================================
# ReferralNetworkPolicy — red multinivel de referidos entre asesores.
# ============================================================================
# - admin/manager: ven y editan toda la red.
# - consultant: ve solo SU red (referidos directos e indirectos).
# - viewer: lectura sobre toda.
# ============================================================================
class ReferralNetworkPolicy < ApplicationPolicy
  def index?      = staff?
  def show?       = staff?
  def create?     = manager_or_admin?
  def update?     = manager_or_admin?
  def destroy?    = admin?
  def tree?       = staff?
  def my_network? = staff?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless user

      if admin? || manager? || viewer?
        scope.all
      elsif consultant?
        scope.where(referrer_user_id: user.id).or(scope.where(referred_user_id: user.id))
      else
        scope.none
      end
    end
  end
end
