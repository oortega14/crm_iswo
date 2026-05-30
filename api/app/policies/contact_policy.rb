# frozen_string_literal: true

# ============================================================================
# ContactPolicy
# ============================================================================
# - admin/manager: ven y editan todos los contactos del tenant.
# - consultant: ve los que tiene asignados (a través de oportunidades suyas
#   o como owner directo) + puede crear nuevos.
# - viewer: solo lectura sobre todos.
# ============================================================================
class ContactPolicy < ApplicationPolicy
  def index?            = staff?
  def show?             = staff? && (manager_or_admin? || viewer? || owner_or_assigned?)
  def create?           = admin? || manager? || consultant?
  def update?           = admin? || manager? || owner_or_assigned?
  def destroy?          = admin?
  def bulk_destroy?     = admin?
  def check_duplicates? = admin? || manager? || consultant?
  def export?           = manager_or_admin?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless user

      if admin? || manager? || viewer?
        scope.all
      elsif consultant?
        # Propios o contacto de alguna oportunidad suya (sin DISTINCT+JOIN: evita errores SQL en PG con ORDER).
        opp_contact_ids = Opportunity.where(owner_user_id: user.id).where.not(contact_id: nil).select(:contact_id).distinct
        scope.where(owner_user_id: user.id).or(scope.where(id: opp_contact_ids))
      else
        scope.none
      end
    end
  end

  private

  def owner_or_assigned?
    return false unless record.respond_to?(:owner_user_id)

    record.owner_user_id == user&.id ||
      record.opportunities.where(owner_user_id: user&.id).exists?
  end
end
