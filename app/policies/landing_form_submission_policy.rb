# frozen_string_literal: true

# ============================================================================
# LandingFormSubmissionPolicy — solo lectura desde el panel interno
# (la creación pública no pasa por policies).
# ============================================================================
class LandingFormSubmissionPolicy < ApplicationPolicy
  def index?   = staff?
  def show?    = staff?
  def create?  = false
  def update?  = false
  def destroy? = admin?

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
