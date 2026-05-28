# frozen_string_literal: true

# Bootstrap de desarrollo: garantiza que los 3 tenants del RFC estén presentes.
# Si la BD está vacía (p.ej. después de db:schema:load sin db:seed), los crea.
# En cualquier otro caso este archivo no hace nada — los seeds son la fuente real.
return unless Rails.env.development?

Rails.application.config.to_prepare do
  next if Tenant.exists?

  Rails.logger.info("[dev_tenant_bootstrap] BD vacía — ejecutando seeds...")
  load Rails.root.join("db/seeds.rb")
rescue StandardError => e
  Rails.logger.error("[dev_tenant_bootstrap] #{e.class}: #{e.message}")
end
