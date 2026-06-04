# frozen_string_literal: true

# ============================================================================
# BantCriterionPolicy — singleton por tenant.
# ============================================================================
class BantCriterionPolicy < ApplicationPolicy
  def show?    = staff?
  def update?  = admin?
  def create?  = admin?
  def destroy? = false

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
