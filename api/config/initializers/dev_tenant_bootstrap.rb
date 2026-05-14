# frozen_string_literal: true

# Bootstrap local tenant for development login flow.
return unless Rails.env.development?

# Misma estructura que db/seeds.rb — sin pipeline el SPA no puede elegir embudo/etapa.
DEFAULT_PIPELINE_STAGES = [
  { name: "Nueva",      position: 0, probability: 10, color: "#94A3B8" },
  { name: "Contactada", position: 1, probability: 25, color: "#60A5FA" },
  { name: "Calificada", position: 2, probability: 50, color: "#22C55E" },
  { name: "Propuesta",  position: 3, probability: 75, color: "#F59E0B" },
  { name: "Ganada",     position: 4, probability: 100, color: "#16A34A", closed_won: true },
  { name: "Perdida",    position: 5, probability: 0,   color: "#DC2626", closed_lost: true }
].freeze

DEV_TENANTS = [
  { slug: "toyamakeup", name: "Toya Makeup",   email: "admin@toyamakeup.local",  username: "Admin Toya Makeup" },
  { slug: "empresa-demo", name: "Empresa Demo", email: "admin@empresa-demo.local", username: "Admin Demo" }
].freeze

Rails.application.config.to_prepare do
  DEV_TENANTS.each do |cfg|
    begin
      tenant = Tenant.with_discarded.find_or_initialize_by(slug: cfg[:slug])
      tenant.name   = cfg[:name]
      tenant.active = true
      tenant.undiscard if tenant.respond_to?(:discarded?) && tenant.discarded?
      tenant.save! if tenant.changed?

      ActsAsTenant.with_tenant(tenant) do
        user = User.find_or_initialize_by(tenant: tenant, email: cfg[:email])
        user.name         = cfg[:username]
        user.role         = "admin"
        user.active       = true if user.respond_to?(:active=)
        user.confirmed_at = Time.current if user.respond_to?(:confirmed_at) && user.confirmed_at.nil?
        # Siempre resetea contraseña y bloqueo en dev para garantizar credenciales conocidas
        user.password     = "Demo2026"
        user.failed_attempts = 0 if user.respond_to?(:failed_attempts)
        user.locked_at    = nil   if user.respond_to?(:locked_at)
        user.save! if user.changed?

        BantCriterion.find_or_create_by!(tenant: tenant) if defined?(BantCriterion)

        pipeline = Pipeline.find_or_initialize_by(tenant: tenant, name: "Pipeline Comercial")
        tenant.pipelines.update_all(is_default: false)
        pipeline.is_default = true
        pipeline.save!

        DEFAULT_PIPELINE_STAGES.each do |attrs|
          stage = pipeline.pipeline_stages.find_or_initialize_by(name: attrs[:name])
          stage.tenant      = tenant
          stage.position    = attrs[:position]
          stage.probability = attrs[:probability]
          stage.color       = attrs[:color]
          stage.closed_won  = attrs[:closed_won]  || false
          stage.closed_lost = attrs[:closed_lost] || false
          stage.save! if stage.new_record? || stage.changed?
        end
      end
    rescue StandardError => e
      Rails.logger.error("[dev_tenant_bootstrap:#{cfg[:slug]}] #{e.class}: #{e.message}")
      Rails.logger.error(e.backtrace&.first(12)&.join("\n"))
    end
  end
end
