# frozen_string_literal: true

# ============================================================================
# WhatsappMessagePolicy
# ============================================================================
# - Todo staff puede leer mensajes (trazabilidad).
# - Enviar (outbound) lo permite admin/manager y consultant DUEÑO de la opp
#   asociada (se revalida en el controller via `authorize @opportunity`).
# - Lectura de mensajes de opps visibles en la red (solo lectura).
# - Mensajes sin oportunidad (leads nuevos que escriben antes de ser
#   calificados) son visibles para el consultor dueño del contacto, o para
#   TODO consultor del tenant si el contacto tampoco tiene dueño todavía
#   (bandeja "sin asignar" — bandeja de entrada, RFC §6.6).
# ============================================================================
class WhatsappMessagePolicy < ApplicationPolicy
  def index?   = staff?
  def show?    = staff? && (manager_or_admin? || viewer? || owns_linked_opportunity? ||
                             network_linked_message? || owns_linked_contact? || unassigned_message?)
  def create?  = admin? || manager? || consultant?
  def update?  = false
  def destroy? = admin?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless user

      if admin? || manager? || viewer?
        scope.all
      elsif consultant?
        owner_ids = ConsultantNetworkAccess.visible_owner_ids(user, ActsAsTenant.current_tenant)
        scope.left_joins(:opportunity, :contact)
             .where(
               "opportunities.owner_user_id IN (:owner_ids) " \
               "OR (whatsapp_messages.opportunity_id IS NULL AND contacts.owner_user_id IN (:owner_ids)) " \
               "OR (whatsapp_messages.opportunity_id IS NULL AND (contacts.id IS NULL OR contacts.owner_user_id IS NULL))",
               owner_ids: owner_ids
             )
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

  def network_linked_message?
    return false unless consultant? && record.respond_to?(:opportunity)

    ConsultantNetworkAccess.can_view_opportunity?(user, record.opportunity)
  end

  # Mensaje huérfano (sin oportunidad) de un contacto que ya tiene dueño.
  def owns_linked_contact?
    consultant? && record.opportunity_id.nil? &&
      record.contact&.owner_user_id == user&.id
  end

  # Mensaje huérfano y sin ningún dueño — bandeja "sin asignar", compartida.
  def unassigned_message?
    consultant? && record.opportunity_id.nil? &&
      (record.contact.nil? || record.contact.owner_user_id.nil?)
  end
end
