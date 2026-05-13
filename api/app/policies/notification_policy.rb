# frozen_string_literal: true

class NotificationPolicy < ApplicationPolicy
  # Cualquier usuario autenticado puede ver sus propias notificaciones.
  def index?   = true
  def update?  = record.user_id == user&.id

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.where(user: user)
  end
end
