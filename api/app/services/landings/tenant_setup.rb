# frozen_string_literal: true

module Landings
  # ============================================================================
  # Landings::TenantSetup — módulo landings y plantillas opcionales por tenant
  # ============================================================================
  # Verticales F5 (iswo, micasita, libranzas): sin landings sembradas; el admin crea las suyas.
  # Otros tenants (onboarding): 2 landings genéricas (captura + borrador).
  # ============================================================================
  class TenantSetup
    VERTICAL_SEED_SLUGS = %w[iswo micasita libranzas].freeze

    FORM_FIELDS = [
      { "name" => "first_name", "label" => "Nombre",            "type" => "text",  "enabled" => true,  "required" => true  },
      { "name" => "last_name",  "label" => "Apellido",           "type" => "text",  "enabled" => true,  "required" => true  },
      { "name" => "phone",      "label" => "Teléfono",           "type" => "tel",   "enabled" => true,  "required" => true  },
      { "name" => "email",      "label" => "Correo electrónico", "type" => "email", "enabled" => true,  "required" => false }
    ].freeze

    class << self
      def vertical_seed?(tenant)
        VERTICAL_SEED_SLUGS.include?(tenant.slug.to_s)
      end

      def apply!(tenant)
        ActsAsTenant.with_tenant(tenant) do
          ensure_landings_module!(tenant)
          templates = templates_for(tenant)
          slugs = templates.map { |t| t[:slug] }

          templates.each { |attrs| upsert_landing!(tenant, attrs) }

          tenant.landing_pages.where.not(slug: slugs).find_each(&:destroy!)
        end
        true
      end

      def apply_all_tenants!
        Tenant.find_each do |tenant|
          ActsAsTenant.with_tenant(tenant) { apply!(tenant) }
        end
      end

      def templates_for(tenant)
        return [] if vertical_seed?(tenant)

        list = default_templates(tenant)
        validate_templates!(list)
        list
      end

      def template_slugs_for(tenant)
        templates_for(tenant).map { |t| t[:slug] }
      end

      private

      def default_templates(tenant)
        brand = tenant.name
        [
          {
            title: "Captura de leads — #{brand}", slug: "captura-leads",
            seo_title: "Contacto — #{brand}",
            seo_description: "Déjanos tus datos y un asesor te contactará.",
            published: true, view_count: 0, lead_count: 0,
            gjs_html: <<~HTML.strip
              <section style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;text-align:center">
                <h1 style="font-size:2rem;margin-bottom:16px">Habla con #{brand}</h1>
                <p style="color:#64748B;margin-bottom:32px">Completa el formulario de contacto al final de esta página.</p>
              </section>
            HTML
          },
          {
            title: "Campaña próxima — #{brand} (borrador)", slug: "campana-proxima",
            seo_title: "Próximamente — #{brand}",
            seo_description: "Landing en preparación.",
            published: false, view_count: 0, lead_count: 0,
            gjs_html: <<~HTML.strip
              <section style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;text-align:center">
                <h1 style="font-size:2rem;margin-bottom:16px">Próxima campaña</h1>
                <p style="color:#64748B;margin-bottom:32px">Borrador — publicar cuando esté lista. El formulario de contacto irá al final.</p>
              </section>
            HTML
          }
        ]
      end

      def validate_templates!(templates)
        raise ArgumentError, "Se esperan 2 landings por tenant" unless templates.size == 2
        raise ArgumentError, "Se espera 1 publicada y 1 borrador" unless templates.count { |t| t[:published] } == 1
      end

      def ensure_landings_module!(tenant)
        settings = tenant.settings.is_a?(Hash) ? tenant.settings.deep_dup : {}
        modules  = Array(settings["modules"]).map(&:to_s)
        return if modules.include?("landings")

        settings["modules"] = (modules + ["landings"]).uniq
        tenant.update!(settings: settings)
      end

      def upsert_landing!(tenant, attrs)
        lp = tenant.landing_pages.find_or_initialize_by(slug: attrs[:slug])
        content = {
          "gjs_html" => attrs[:gjs_html],
          "gjs_css"  => "",
          "fields"   => FORM_FIELDS
        }
        lp.assign_attributes(
          title:           attrs[:title],
          seo_title:       attrs[:seo_title],
          seo_description: attrs[:seo_description],
          published:       attrs[:published],
          published_at:    attrs[:published] ? (lp.published_at || Time.current) : nil,
          view_count:      attrs[:view_count],
          lead_count:      attrs[:lead_count],
          content:         content
        )
        lp.save!
        lp
      end
    end
  end
end
