# frozen_string_literal: true

# ============================================================================
# ErrorHandler — respuestas JSON uniformes para excepciones comunes.
# ============================================================================
# Formato estándar:
#   {
#     "error": "<slug>",
#     "message": "<texto humano>",
#     "details": { ...opcional... }
#   }
# ============================================================================
module ErrorHandler
  extend ActiveSupport::Concern

  included do
    rescue_from ActiveRecord::RecordNotFound,        with: :render_not_found
    rescue_from ActiveRecord::RecordInvalid,         with: :render_record_invalid
    rescue_from ActiveRecord::RecordNotUnique,       with: :render_conflict
    rescue_from ActionController::ParameterMissing,  with: :render_bad_request
    rescue_from Pundit::NotAuthorizedError,          with: :render_forbidden
    rescue_from ActsAsTenant::Errors::NoTenantSet,   with: :render_tenant_missing
  end

  private

  def render_not_found(exception)
    render json: { error: "not_found", message: exception.message }, status: :not_found
  end

  def render_record_invalid(exception)
    render json: {
      error:   "unprocessable_entity",
      message: "Validación fallida",
      details: exception.record.errors.as_json(full_messages: true)
    }, status: :unprocessable_entity
  end

  def render_conflict(exception)
    render json: { error: "conflict", message: exception.message }, status: :conflict
  end

  def render_bad_request(exception)
    render json: { error: "bad_request", message: exception.message }, status: :bad_request
  end

  def render_forbidden(_exception)
    render json: {
      error:   "forbidden",
      message: "No tienes permiso para realizar esta acción"
    }, status: :forbidden
  end

  def render_tenant_missing(_exception)
    render json: {
      error:   "tenant_missing",
      message: "Operación intentada fuera del contexto de un tenant"
    }, status: :bad_request
  end
end
