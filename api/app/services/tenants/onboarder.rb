# frozen_string_literal: true

module Tenants
  # ==========================================================================
  # Tenants::Onboarder — crea un tenant nuevo con datos iniciales.
  # ==========================================================================
  # Uso:
  #   result = Tenants::Onboarder.new(
  #     slug:       "micasita",
  #     name:       "Mi Casita",
  #     admin_email: "admin@micasita.co",
  #     admin_name:  "Administrador",
  #     admin_password: SecureRandom.hex(12),
  #     currency:   "COP",
  #     timezone:   "America/Bogota",
  #   ).call
  #
  # Retorna un Struct con :tenant, :admin_user, :pipeline.
  # Atómico — rollback completo si algo falla.
  # ==========================================================================
  class Onboarder
    DEFAULT_PIPELINE_STAGES = [
      { name: "Nueva",      position: 0, probability: 10,  color: "#94A3B8" },
      { name: "Contactada", position: 1, probability: 25,  color: "#60A5FA" },
      { name: "Calificada", position: 2, probability: 50,  color: "#22C55E" },
      { name: "Propuesta",  position: 3, probability: 75,  color: "#F59E0B" },
      { name: "Ganada",     position: 4, probability: 100, color: "#16A34A", closed_won:  true },
      { name: "Perdida",    position: 5, probability: 0,   color: "#DC2626", closed_lost: true }
    ].freeze

    DEFAULT_LEAD_SOURCES = %w[web whatsapp meta_ads google_ads referido manual].freeze

    Result = Struct.new(:tenant, :admin_user, :pipeline, keyword_init: true)

    def initialize(slug:, name:, admin_email:, admin_name:, admin_password:,
                   currency: "COP", timezone: "America/Bogota", locale: "es-CO",
                   logo_url: nil, primary_color: "#0F172A")
      @slug           = slug
      @name           = name
      @admin_email    = admin_email
      @admin_name     = admin_name
      @admin_password = admin_password
      @currency       = currency
      @timezone       = timezone
      @locale         = locale
      @logo_url       = logo_url
      @primary_color  = primary_color
    end

    def call
      tenant   = nil
      user     = nil
      pipeline = nil

      ActiveRecord::Base.transaction do
        tenant = Tenant.create!(
          slug:          @slug,
          name:          @name,
          currency:      @currency,
          timezone:      @timezone,
          locale:        @locale,
          logo_url:      @logo_url,
          primary_color: @primary_color,
          active:        true
        )

        ActsAsTenant.with_tenant(tenant) do
          user = User.create!(
            tenant:       tenant,
            email:        @admin_email,
            name:         @admin_name,
            password:     @admin_password,
            role:         "admin",
            active:       true,
            confirmed_at: Time.current
          )

          BantCriterion.create!(tenant: tenant) if defined?(BantCriterion)

          pipeline = Pipeline.create!(
            tenant:     tenant,
            name:       "Pipeline Comercial",
            is_default: true
          )

          DEFAULT_PIPELINE_STAGES.each do |attrs|
            pipeline.pipeline_stages.create!(attrs.merge(tenant: tenant))
          end

          DEFAULT_LEAD_SOURCES.each_with_index do |label, i|
            LeadSource.create!(tenant: tenant, name: label, position: i)
          end
        end
      end

      Result.new(tenant: tenant, admin_user: user, pipeline: pipeline)
    end
  end
end
