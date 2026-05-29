# frozen_string_literal: true

# ============================================================================
# WhatsappMessagePolicy
# ============================================================================
# - Todo staff puede leer mensajes (trazabilidad).
# - Enviar (outbound) lo permite admin/manager y consultant DUEÑO de la opp
#   asociada (se revalida en el controller via `authorize @opportunity`).
# ============================================================================
class WhatsappMessagePolicy < ApplicationPolicy
  def index?   = staff?
  def show?    = staff? && (manager_or_admin? || viewer? || owns_linked_opportunity?)
  def create?  = admin? || manager? || consultant?
  def update?  = false
  def destroy? = admin?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless user

      if admin? || manager? || viewer?
        scope.all
      elsif consultant?
        scope.joins(:opportunity)
             .where(opportunities: { owner_user_id: user.id })
             .distinct
      else
        scope.none
      end
    rescue ActiveRecord::StatementInvalid => e
      Rails.logger.warn("[WhatsappMessagePolicy] scope error: #{e.message}")
      scope.none
    end
  end

  private

  def owns_linked_opportunity?
    record.respond_to?(:opportunity) &&
      record.opportunity&.owner_user_id == user&.id
  end
end
