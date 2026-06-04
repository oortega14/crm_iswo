# frozen_string_literal: true

# ============================================================================
# ReminderPolicy
# ============================================================================
# - Todo staff puede ver recordatorios del tenant.
# - Consultant ve/edita los suyos o los de sus opps; ve (solo lectura) los de opps de su red.
# - Manager/admin gestionan todo.
# ============================================================================
class ReminderPolicy < ApplicationPolicy
  def index?    = staff?
  def show?     = staff? && visible?
  def create?   = admin? || manager? || consultant?
  def update?   = admin? || manager? || owner?
  def destroy?  = admin? || manager? || owner?

  def complete? = update?
  def snooze?   = update?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless user

      if admin? || manager? || viewer?
        scope.all
      elsif consultant?
        owner_ids = ConsultantNetworkAccess.visible_owner_ids(user)
        opp_ids = Opportunity.where(owner_user_id: owner_ids).select(:id)
        scope.where(user_id: user.id)
             .or(scope.where(opportunity_id: opp_ids))
      else
        scope.none
      end
    end
  end

  private

  def owner?   = record.respond_to?(:user_id) && record.user_id == user&.id
  def visible? = admin? || manager? || viewer? || owner? || network_reminder?

  def network_reminder?
    return false unless consultant? && record.respond_to?(:opportunity)

    ConsultantNetworkAccess.can_view_opportunity?(user, record.opportunity)
  end
end
