# frozen_string_literal: true

# ============================================================================
# DuplicateFlagPolicy — resolución de duplicados de oportunidades.
# ============================================================================
# Consultor: solo flags donde participa (registró o es dueño de alguna opp).
# Admin/manager/viewer: bandeja completa del tenant.
# Resolución (reasignar, mergear, ignorar) → solo manager/admin.
# ============================================================================
class DuplicateFlagPolicy < ApplicationPolicy
  def index?   = staff?
  def show?    = staff? && (manager_or_admin? || viewer? || consultant_involved?)
  def update?  = manager_or_admin?
  def create?  = manager_or_admin? # usado por scan retroactivo
  def destroy? = admin?

  def reassign? = manager_or_admin?
  def merge?    = manager_or_admin?
  def ignore?   = manager_or_admin?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless user

      if admin? || manager? || viewer?
        scope.all
      elsif consultant?
        own_opp_ids = Opportunity.where(owner_user_id: user.id).select(:id)
        scope.where(detected_by_user_id: user.id)
             .or(scope.where(opportunity_id: own_opp_ids))
             .or(scope.where(duplicate_of_opportunity_id: own_opp_ids))
      else
        scope.none
      end
    end
  end

  private

  def consultant_involved?
    return false unless consultant? && record

    user.id == record.detected_by_user_id ||
      record.opportunity&.owner_user_id == user.id ||
      record.duplicate_of_opportunity&.owner_user_id == user.id
  end
end
