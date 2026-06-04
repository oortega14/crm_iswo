# frozen_string_literal: true

class TenantFieldDefinitionPolicy < ApplicationPolicy
  def index?   = staff?
  def show?    = staff?
  def create?  = admin?
  def update?  = admin?
  def destroy? = admin?

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
