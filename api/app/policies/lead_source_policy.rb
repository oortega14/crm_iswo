# frozen_string_literal: true

# ============================================================================
# LeadSourcePolicy — catálogo de canales de origen.
# ============================================================================
class LeadSourcePolicy < ApplicationPolicy
  def index?   = staff?
  def show?    = staff?
  def create?  = manager_or_admin?
  def update?  = manager_or_admin?
  def destroy? = admin?

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
