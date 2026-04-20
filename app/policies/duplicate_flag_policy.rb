# frozen_string_literal: true

# ============================================================================
# DuplicateFlagPolicy — resolución de duplicados de oportunidades.
# ============================================================================
# La resolución (reasignar, mergear, ignorar) afecta ownership → solo
# manager/admin.
# ============================================================================
class DuplicateFlagPolicy < ApplicationPolicy
  def index?   = staff?
  def show?    = staff?
  def update?  = manager_or_admin?
  def create?  = false # se generan automáticamente por el detector
  def destroy? = admin?

  def reassign? = manager_or_admin?
  def merge?    = manager_or_admin?
  def ignore?   = manager_or_admin?

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
