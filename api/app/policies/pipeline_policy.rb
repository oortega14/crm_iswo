# frozen_string_literal: true

# ============================================================================
# PipelinePolicy — pipelines y sus stages son configuración del tenant.
# ============================================================================
class PipelinePolicy < ApplicationPolicy
  def index?   = staff?
  def show?    = staff?
  def create?  = manager_or_admin?
  def update?  = manager_or_admin?
  def destroy? = admin?

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
