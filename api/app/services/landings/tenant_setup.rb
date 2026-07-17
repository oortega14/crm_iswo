# frozen_string_literal: true

module Landings
  # ============================================================================
  # Landings::TenantSetup — módulo landings y plantillas opcionales por tenant
  # ============================================================================
  # Verticales F5: plantillas por slug (iswo, micasita, libranzas: 2 publicadas + 1 borrador).
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
        return iswo_templates(tenant) if iswo_tenant?(tenant)
        return micasita_pasto_templates(tenant) if micasita_tenant?(tenant)
        return libranzas_templates(tenant) if libranzas_tenant?(tenant)
        return [] if vertical_seed?(tenant)

        list = default_templates(tenant)
        validate_templates!(list)
        list
      end

      def template_slugs_for(tenant)
        templates_for(tenant).map { |t| t[:slug] }
      end

      private

      def iswo_tenant?(tenant)
        tenant.slug.to_s == "iswo"
      end

      def libranzas_tenant?(tenant)
        tenant.slug.to_s == "libranzas"
      end

      def micasita_tenant?(tenant)
        tenant.slug.to_s.in?(%w[micasita mi_casita])
      end

      # Mi Casita — 2 publicadas + 1 borrador (inmobiliaria Pasto, un formulario cada una).
      def micasita_pasto_templates(tenant)
        brand = tenant.name
        [
          {
            title: "Apartamentos en Pasto — #{brand}",
            slug: "apartamentos-pasto",
            seo_title: "Apartamentos en venta en Pasto | #{brand}",
            seo_description: "Encuentra apartamento en Pasto, Nariño. Asesoría sin costo para comprar tu vivienda en el sur colombiano.",
            published: true, view_count: 128, lead_count: 14,
            gjs_html: pasto_hero_html(
              headline: "Tu apartamento en Pasto",
              sub: "Proyectos y usados en el centro, Llano de la Abuela, Mariscal y zonas del altiplano nariñense. Te acompañamos hasta la escritura.",
              accent: "#B45309"
            )
          },
          {
            title: "Crédito de vivienda Pasto — #{brand}",
            slug: "credito-vivienda-pasto",
            seo_title: "Crédito de vivienda en Pasto | #{brand}",
            seo_description: "Simula tu crédito hipotecario en Pasto. Mi Casita te guía con bancos aliados y proyectos VIS en Nariño.",
            published: true, view_count: 96, lead_count: 11,
            gjs_html: pasto_hero_html(
              headline: "Crédito de vivienda en Pasto",
              sub: "¿Buscas casa o apartamento con crédito? En Pasto conocemos el mercado local, tasas y proyectos sobre la Avenida de los Estudiantes y más.",
              accent: "#B45309"
            )
          },
          {
            title: "Proyecto nuevo Pasto (borrador) — #{brand}",
            slug: "proyecto-nuevo-pasto-borrador",
            seo_title: "Próximo lanzamiento Pasto | #{brand}",
            seo_description: "Landing en preparación — nuevo proyecto inmobiliario en Pasto.",
            published: false, view_count: 0, lead_count: 0,
            gjs_html: pasto_hero_html(
              headline: "Próximo proyecto en Pasto",
              sub: "Borrador — publicar cuando esté listo el lanzamiento sobre el sector de Juan XXIII / Panamericana.",
              accent: "#64748B"
            )
          }
        ].tap { |list| validate_three_templates!(list, label: "Mi Casita") }
      end

      # ISWO — 2 publicadas + 1 borrador (consultoría ISO / sistemas de gestión).
      def iswo_templates(tenant)
        brand = tenant.name
        [
          {
            title: "Diagnóstico ISO gratuito — #{brand}",
            slug: "diagnostico-iso-gratuito",
            seo_title: "Diagnóstico ISO gratuito | #{brand}",
            seo_description: "Evalúa el nivel de madurez de tu sistema de gestión. Diagnóstico inicial sin costo con consultores certificados.",
            published: true, view_count: 214, lead_count: 28,
            gjs_html: iswo_hero_html(
              brand: brand,
              eyebrow: "Consultoría ISO",
              headline: "Diagnóstico ISO gratuito",
              sub: "Conoce brechas en calidad, ambiente o seguridad y recibe una hoja de ruta priorizada para certificarte.",
              accent: "#0F172A"
            )
          },
          {
            title: "Certificación ISO 9001 — #{brand}",
            slug: "certificacion-iso-9001",
            seo_title: "Implementación y certificación ISO 9001 | #{brand}",
            seo_description: "Diseño, implementación y acompañamiento a auditoría ISO 9001 para empresas en Colombia.",
            published: true, view_count: 167, lead_count: 19,
            gjs_html: iswo_hero_html(
              brand: brand,
              eyebrow: "Sistema de gestión de calidad",
              headline: "Certificación ISO 9001",
              sub: "Metodología probada: diagnóstico, documentación, capacitación y preparación para auditoría de certificación.",
              accent: "#1E40AF"
            )
          },
          {
            title: "ISO 45001 — Seguridad y salud (borrador) — #{brand}",
            slug: "iso-45001-seguridad-borrador",
            seo_title: "Próximamente ISO 45001 | #{brand}",
            seo_description: "Landing en preparación — implementación de sistema de gestión de seguridad y salud en el trabajo.",
            published: false, view_count: 0, lead_count: 0,
            gjs_html: iswo_hero_html(
              brand: brand,
              eyebrow: "Borrador",
              headline: "ISO 45001 — Seguridad y salud en el trabajo",
              sub: "Publicar cuando esté lista la campaña. Formulario de contacto para empresas que buscan reducir riesgos laborales.",
              accent: "#64748B"
            )
          }
        ].tap { |list| validate_three_templates!(list, label: "ISWO") }
      end

      # Libranzas — 2 publicadas + 1 borrador (crédito por descuento de nómina).
      def libranzas_templates(tenant)
        brand = tenant.name
        [
          {
            title: "Solicitud de libranza — #{brand}",
            slug: "solicitud-libranza",
            seo_title: "Crédito por libranza | #{brand}",
            seo_description: "Solicita tu crédito con descuento por nómina. Respuesta ágil y acompañamiento hasta el desembolso.",
            published: true, view_count: 342, lead_count: 41,
            gjs_html: iswo_hero_html(
              brand: brand,
              eyebrow: "Crédito por nómina",
              headline: "Solicita tu libranza",
              sub: "Crédito con descuento directo en nómina para empleados de empresas en convenio. Cuotas fijas y trámite 100% acompañado.",
              accent: "#047857"
            )
          },
          {
            title: "Crédito libre inversión — #{brand}",
            slug: "credito-libre-inversion",
            seo_title: "Crédito libre inversión | #{brand}",
            seo_description: "Usa tu cupo de libranza para libre inversión: educación, remodelación, viajes o imprevistos.",
            published: true, view_count: 198, lead_count: 23,
            gjs_html: iswo_hero_html(
              brand: brand,
              eyebrow: "Libre inversión",
              headline: "Crédito libre inversión",
              sub: "Destina tu libranza a lo que necesites. Te ayudamos a calcular cuota, plazo y documentos según tu empleador.",
              accent: "#059669"
            )
          },
          {
            title: "Compra de cartera (borrador) — #{brand}",
            slug: "compra-cartera-borrador",
            seo_title: "Próximamente compra de cartera | #{brand}",
            seo_description: "Landing en preparación — unifica tus créditos y mejora tu cuota mensual.",
            published: false, view_count: 0, lead_count: 0,
            gjs_html: iswo_hero_html(
              brand: brand,
              eyebrow: "Borrador",
              headline: "Compra de cartera",
              sub: "Publicar cuando esté lista la campaña. Consolida obligaciones y reduce la cuota con una sola libranza.",
              accent: "#64748B"
            )
          }
        ].tap { |list| validate_three_templates!(list, label: "Libranzas") }
      end

      def iswo_hero_html(brand:, eyebrow:, headline:, sub:, accent:)
        <<~HTML.strip
          <section style="font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:48px 20px;text-align:center">
            <p style="color:#64748B;font-size:0.875rem;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em">#{eyebrow}</p>
            <h1 style="font-size:2rem;line-height:1.2;margin:0 0 16px;color:#0F172A">#{headline}</h1>
            <p style="color:#475569;font-size:1.05rem;line-height:1.6;margin:0 0 28px">#{sub}</p>
            <p style="color:#{accent};font-weight:600;margin:0">Completa el formulario al final — un consultor de #{brand} te contacta.</p>
          </section>
        HTML
      end

      def validate_three_templates!(templates, label:)
        raise ArgumentError, "#{label}: se esperan 3 landings" unless templates.size == 3
        raise ArgumentError, "#{label}: se esperan 2 publicadas y 1 borrador" unless templates.count { |t| t[:published] } == 2
      end

      def pasto_hero_html(headline:, sub:, accent:)
        <<~HTML.strip
          <section style="font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:48px 20px;text-align:center">
            <p style="color:#64748B;font-size:0.875rem;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em">Pasto · Nariño</p>
            <h1 style="font-size:2rem;line-height:1.2;margin:0 0 16px;color:#0F172A">#{headline}</h1>
            <p style="color:#475569;font-size:1.05rem;line-height:1.6;margin:0 0 28px">#{sub}</p>
            <p style="color:#{accent};font-weight:600;margin:0">Completa el formulario al final — un asesor de Mi Casita te contacta.</p>
          </section>
        HTML
      end

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
