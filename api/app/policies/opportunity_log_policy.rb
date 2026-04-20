# frozen_string_literal: true

# ============================================================================
# OpportunityLogPolicy — bitácora de una oportunidad.
# ============================================================================
# Los logs son inmutables (no update, no destroy). Se crean automáticamente
# desde el servicio o manualmente como "note".
# ============================================================================
class OpportunityLogPolicy < ApplicationPolicy
  def index?   = staff?
  def show?    = staff?
  def create?  = admin? || manager? || consultant?
  def update?  = false
  def destroy? = false

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
