# frozen_string_literal: true

# ============================================================================
# ApplicationJob — padre de todos los jobs del CRM.
# ============================================================================
# - Corre sobre Sidekiq (configurado en config/initializers/sidekiq.rb).
# - Cola por defecto "default"; jobs sensibles usan "critical".
# - Reintentos: ActiveJob respeta el `sidekiq_options retry:` si se setea.
# - Logs estructurados con tenant_id y job_id para trazabilidad ISO 27001.
# ============================================================================
class ApplicationJob < ActiveJob::Base
  # Errores transitorios en servicios externos → reintento exponencial.
  retry_on Faraday::ConnectionFailed,  wait: :polynomially_longer, attempts: 5
  retry_on Faraday::TimeoutError,      wait: :polynomially_longer, attempts: 5
  retry_on ActiveRecord::Deadlocked,   wait: 5.seconds,            attempts: 3

  # Errores de lógica → discard (no reintentar, solo loguear).
  discard_on ActiveJob::DeserializationError
  discard_on ActsAsTenant::Errors::NoTenantSet

  around_perform :with_tenant_context

  private

  # Permite pasar tenant_id como primer keyword y restaura el scope de
  # acts_as_tenant dentro del job. Jobs que no tocan data de tenant no
  # necesitan setearlo.
  def with_tenant_context
    tenant_id = arguments.last.is_a?(Hash) ? arguments.last[:tenant_id] : nil

    if tenant_id
      tenant = Tenant.find_by(id: tenant_id)
      return yield unless tenant

      ActsAsTenant.with_tenant(tenant) { yield }
    else
      yield
    end
  end
end
