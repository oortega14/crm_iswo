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

Rails.application.config.to_prepare do
  begin
    tenant = Tenant.with_discarded.find_or_initialize_by(slug: "toyamakeup")
    tenant.name = "Toya Makeup"
    tenant.active = true
    tenant.undiscard if tenant.respond_to?(:discarded?) && tenant.discarded?
    tenant.save! if tenant.changed?

    ActsAsTenant.with_tenant(tenant) do
      user = User.find_or_initialize_by(tenant: tenant, email: "admin@toyamakeup.local")
      user.name = "Admin Toya Makeup"
      user.role = "admin"
      user.active = true if user.respond_to?(:active=)
      user.confirmed_at ||= Time.current if user.respond_to?(:confirmed_at)
      user.password = "Password123!" if user.new_record?
      user.save! if user.changed?

      if defined?(BantCriterion)
        BantCriterion.find_or_create_by!(tenant: tenant)
      end

      # Un solo pipeline puede ser default; si ya hay otro marcado, fallaba validate :only_one_default_per_tenant.
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
    Rails.logger.error("[dev_tenant_bootstrap] #{e.class}: #{e.message}")
    Rails.logger.error(e.backtrace&.first(12)&.join("\n"))
  end
end
