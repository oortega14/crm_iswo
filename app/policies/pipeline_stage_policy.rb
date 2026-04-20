# frozen_string_literal: true

# ============================================================================
# PipelineStagePolicy — se gestiona anidado bajo Pipeline.
# ============================================================================
class PipelineStagePolicy < ApplicationPolicy
  def index?   = staff?
  def show?    = staff?
  def create?  = manager_or_admin?
  def update?  = manager_or_admin?
  def destroy? = admin?
  def reorder? = manager_or_admin?

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
