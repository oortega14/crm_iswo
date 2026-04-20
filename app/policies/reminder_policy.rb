# frozen_string_literal: true

# ============================================================================
# ReminderPolicy
# ============================================================================
# - Todo staff puede ver recordatorios del tenant.
# - Consultant solo ve/edita los suyos (user_id == user.id) o los de sus opps.
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
        scope.where(user_id: user.id)
             .or(scope.joins(:opportunity).where(opportunities: { owner_user_id: user.id }))
      else
        scope.none
      end
    end
  end

  private

  def owner?   = record.respond_to?(:user_id) && record.user_id == user&.id
  def visible? = admin? || manager? || viewer? || owner?
end
