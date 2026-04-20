# frozen_string_literal: true

# ============================================================================
# BantCriterionPolicy — singleton por tenant.
# ============================================================================
class BantCriterionPolicy < ApplicationPolicy
  def show?    = staff?
  def update?  = manager_or_admin?
  def create?  = manager_or_admin?
  def destroy? = false

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
