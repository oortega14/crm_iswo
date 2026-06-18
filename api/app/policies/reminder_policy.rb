# frozen_string_literal: true

# ============================================================================
# ReminderPolicy
# ============================================================================
# Recordatorios solo para admin, manager y consultant (no viewer ni leads).
# ============================================================================
class ReminderPolicy < ApplicationPolicy
  def index?    = operational_staff?
  def show?     = operational_staff? && visible?
  def create?   = operational_staff?
  def update?   = admin? || manager? || owner?
  def destroy?  = admin? || manager? || owner?

  def complete? = update?
  def snooze?   = update?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless user

      if admin? || manager?
        scope.all
      elsif consultant?
        owner_ids = ConsultantNetworkAccess.visible_owner_ids(user, ActsAsTenant.current_tenant)
        opp_ids = Opportunity.where(owner_user_id: owner_ids).select(:id)
        scope.where(user_id: user.id)
             .or(scope.where(opportunity_id: opp_ids))
      else
        scope.none
      end
    end
  end

  private

  def operational_staff? = admin? || manager? || consultant?
  def owner?   = record.respond_to?(:user_id) && record.user_id == user&.id
  def visible? = admin? || manager? || owner? || network_reminder?

  def network_reminder?
    return false unless consultant? && record.respond_to?(:opportunity)

    ConsultantNetworkAccess.can_view_opportunity?(user, record.opportunity)
  end
end
