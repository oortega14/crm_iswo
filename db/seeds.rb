# frozen_string_literal: true

# ============================================================================
# Seeds — datos mínimos para arrancar en desarrollo
# ----------------------------------------------------------------------------
# Crea 3 tenants iniciales (ISWO, Mi Casita, Libranzas) con su pipeline default,
# etapas estándar, criterio BANT, lead sources y un usuario admin de prueba.
# ============================================================================

require "securerandom"

DEFAULT_STAGES = [
  { name: "Nueva",      position: 0, probability: 10, color: "#94A3B8" },
  { name: "Contactada", position: 1, probability: 25, color: "#60A5FA" },
  { name: "Calificada", position: 2, probability: 50, color: "#22C55E" },
  { name: "Propuesta",  position: 3, probability: 75, color: "#F59E0B" },
  { name: "Ganada",     position: 4, probability: 100, color: "#16A34A", closed_won: true },
  { name: "Perdida",    position: 5, probability: 0,   color: "#DC2626", closed_lost: true }
].freeze

DEFAULT_LEAD_SOURCES = %w[web whatsapp meta google manual referral].freeze

[
  { name: "ISWO",      slug: "iswo" },
  { name: "Mi Casita", slug: "micasita" },
  { name: "Libranzas", slug: "libranzas" }
].each do |attrs|
  tenant = Tenant.find_or_create_by!(slug: attrs[:slug]) do |t|
    t.name = attrs[:name]
  end

  ActsAsTenant.with_tenant(tenant) do
    # BANT
    BantCriterion.find_or_create_by!(tenant: tenant)

    # Pipeline default + etapas
    pipeline = Pipeline.find_or_create_by!(tenant: tenant, name: "Pipeline Comercial") do |p|
      p.is_default = true
    end

    DEFAULT_STAGES.each do |stage_attrs|
      pipeline.pipeline_stages.find_or_create_by!(name: stage_attrs[:name]) do |s|
        s.tenant       = tenant
        s.position     = stage_attrs[:position]
        s.probability  = stage_attrs[:probability]
        s.color        = stage_attrs[:color]
        s.closed_won   = stage_attrs[:closed_won]  || false
        s.closed_lost  = stage_attrs[:closed_lost] || false
      end
    end

    # Lead sources
    DEFAULT_LEAD_SOURCES.each do |kind|
      LeadSource.find_or_create_by!(tenant: tenant, name: kind.titleize) do |ls|
        ls.kind = kind
      end
    end

    # Admin de prueba
    User.find_or_create_by!(tenant: tenant, email: "admin@#{attrs[:slug]}.local") do |u|
      u.name     = "Admin #{attrs[:name]}"
      u.role     = "admin"
      u.password = "Password123!"
      u.confirmed_at = Time.current
    end
  end
end

puts "Seeded #{Tenant.count} tenants, #{User.count} users, #{Pipeline.count} pipelines, #{PipelineStage.count} stages."
