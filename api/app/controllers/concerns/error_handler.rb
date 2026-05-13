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

    # Lockbox (credenciales AdIntegration): clave ausente al cifrar.
    rescue_from ArgumentError, with: :render_argument_error_maybe_lockbox

    rescue_from Lockbox::Error, with: :render_lockbox_error
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

  # Sin argumento: TenantResolver no pudo resolver slug/header.
  # Con excepción: rescue_from ActsAsTenant::Errors::NoTenantSet.
  def render_tenant_missing(exception = nil)
    message =
      if exception
        "Operación intentada fuera del contexto de un tenant"
      else
        "No se pudo resolver el tenant (usar subdominio o header X-Tenant-Slug)"
      end
    render json: {
      error:   "tenant_missing",
      message: message
    }, status: :bad_request
  end

  # Lockbox.attribute_key → "Missing master key" si LOCKBOX_MASTER_KEY no está definida.
  def render_argument_error_maybe_lockbox(exception)
    raise exception unless exception.message.to_s.include?("Missing master key")

    render json: {
      error:   "configuration_error",
      message:
        "Falta LOCKBOX_MASTER_KEY. Añádela al entorno (p. ej. .env) o en credentials como lockbox.master_key."
    }, status: :service_unavailable
  end

  def render_lockbox_error(exception)
    Rails.logger.error("[Lockbox] #{exception.class}: #{exception.message}")
    render json: {
      error:   "decryption_error",
      message:
        "No se pudieron leer credenciales cifradas (clave distinta o datos corruptos). Revisa LOCKBOX_MASTER_KEY o vuelve a guardar la integración."
    }, status: :unprocessable_entity
  end
end
