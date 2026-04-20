# frozen_string_literal: true

# ============================================================================
# LandingPagePolicy — editor de landings (GrapeJS).
# ============================================================================
class LandingPagePolicy < ApplicationPolicy
  def index?    = staff?
  def show?     = staff?
  def create?   = manager_or_admin?
  def update?   = manager_or_admin?
  def destroy?  = admin?

  def publish?   = manager_or_admin?
  def unpublish? = manager_or_admin?
  def duplicate? = manager_or_admin?

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
