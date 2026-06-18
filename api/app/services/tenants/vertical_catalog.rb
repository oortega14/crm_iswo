# frozen_string_literal: true

module Tenants
  # Configuración F5 por vertical (RFC-001) — fuente única para Onboarder y seeds.
  class VerticalCatalog
    Entry = Struct.new(
      :slug,
      :tenant_settings,
      :bant,
      :pipeline,
      :stages,
      :lead_sources,
      :primary_color,
      keyword_init: true
    )

    SLUG_ALIASES = {
      "mi_casita" => "micasita",
      "mi-casita" => "micasita"
    }.freeze

    DEFINITIONS = {
      "iswo" => Entry.new(
        slug:            "iswo",
        primary_color:   "#1D4ED8",
        tenant_settings: {
          "modules"       => %w[opportunities contacts pipeline reminders network exports landings],
          "industry"      => "consulting_iso",
          "show_bant"     => true,
          "network_depth" => 3
        },
        bant: {
          budget_weight:       25,
          authority_weight:    35,
          need_weight:         25,
          timeline_weight:     15,
          threshold_qualified: 65
        },
        pipeline: {
          name:        "Ciclo de Consultoría ISO",
          description: "Pipeline principal para venta de servicios ISO"
        },
        stages: [
          { name: "Prospecto",         position: 0, probability: 10,  color: "#94A3B8" },
          { name: "Diagnóstico",       position: 1, probability: 25,  color: "#60A5FA" },
          { name: "Calificada",        position: 2, probability: 40,  color: "#22C55E" },
          { name: "Propuesta Enviada", position: 3, probability: 55,  color: "#818CF8" },
          { name: "Negociación",       position: 4, probability: 70,  color: "#F59E0B" },
          { name: "Contrato Firmado",  position: 5, probability: 100, color: "#16A34A", closed_won:  true },
          { name: "Perdida",           position: 6, probability: 0,   color: "#DC2626", closed_lost: true }
        ],
        lead_sources: [
          { kind: "web",      name: "Sitio Web ISWO" },
          { kind: "referral", name: "Referido Consultor" },
          { kind: "manual",   name: "Evento / Feria ISO" },
          { kind: "manual",   name: "LinkedIn" },
          { kind: "whatsapp", name: "WhatsApp Comercial" },
          { kind: "google",   name: "Google Ads" }
        ]
      ),
      "micasita" => Entry.new(
        slug:            "micasita",
        primary_color:   "#B45309",
        tenant_settings: {
          "modules"            => %w[opportunities contacts pipeline reminders network exports landings],
          "industry"           => "real_estate",
          "show_bant"          => true,
          "network_depth"      => 3,
          "opportunity_fields" => {
            "estimated_value_label" => "Valor del inmueble",
            "show_document_id"      => true
          }
        },
        bant: {
          budget_weight:       40,
          authority_weight:    25,
          need_weight:         20,
          timeline_weight:     15,
          threshold_qualified: 60
        },
        pipeline: {
          name:        "Ciclo de Venta Inmobiliaria",
          description: "Desde el primer contacto hasta la escritura"
        },
        stages: [
          { name: "Interesado",           position: 0, probability: 10,  color: "#94A3B8" },
          { name: "Visita Agendada",      position: 1, probability: 25,  color: "#60A5FA" },
          { name: "Calificada",           position: 2, probability: 40,  color: "#22C55E" },
          { name: "Visita Realizada",     position: 3, probability: 55,  color: "#818CF8" },
          { name: "Oferta Presentada",    position: 4, probability: 70,  color: "#F59E0B" },
          { name: "En Proceso Escritura", position: 5, probability: 85,  color: "#F97316" },
          { name: "Escriturado",          position: 6, probability: 100, color: "#16A34A", closed_won:  true },
          { name: "Perdida",              position: 7, probability: 0,   color: "#DC2626", closed_lost: true }
        ],
        lead_sources: [
          { kind: "web",      name: "Sitio Web Mi Casita" },
          { kind: "meta",     name: "Meta Ads — Facebook/Instagram" },
          { kind: "google",   name: "Google Ads" },
          { kind: "whatsapp", name: "WhatsApp" },
          { kind: "referral", name: "Referido Cliente" },
          { kind: "manual",   name: "Finca Raíz / Portales" },
          { kind: "manual",   name: "Feria Inmobiliaria" }
        ]
      ),
      "libranzas" => Entry.new(
        slug:            "libranzas",
        primary_color:   "#047857",
        tenant_settings: {
          "modules"            => %w[opportunities contacts pipeline reminders network exports landings],
          "industry"           => "payroll_credit",
          "show_bant"          => true,
          "network_depth"      => 3,
          "opportunity_fields" => {
            "estimated_value_label" => "Monto del crédito",
            "show_document_id"      => true
          }
        },
        bant: {
          budget_weight:       25,
          authority_weight:    30,
          need_weight:         25,
          timeline_weight:     20,
          threshold_qualified: 55
        },
        pipeline: {
          name:        "Proceso de Libranza",
          description: "Desde la solicitud hasta el desembolso"
        },
        stages: [
          { name: "Solicitud Recibida",  position: 0, probability: 15,  color: "#94A3B8" },
          { name: "Documentación",       position: 1, probability: 30,  color: "#60A5FA" },
          { name: "Calificada",          position: 2, probability: 45,  color: "#22C55E" },
          { name: "Estudio de Crédito",  position: 3, probability: 60,  color: "#818CF8" },
          { name: "Aprobado",            position: 4, probability: 80,  color: "#F59E0B" },
          { name: "Desembolsado",        position: 5, probability: 100, color: "#16A34A", closed_won:  true },
          { name: "Rechazado / Perdido", position: 6, probability: 0,   color: "#DC2626", closed_lost: true }
        ],
        lead_sources: [
          { kind: "whatsapp", name: "WhatsApp" },
          { kind: "web",      name: "Sitio Web" },
          { kind: "manual",   name: "Call Center" },
          { kind: "manual",   name: "Empresa Convenio" },
          { kind: "referral", name: "Referido" },
          { kind: "meta",     name: "Meta Ads" }
        ]
      )
    }.freeze

    def self.resolve_slug(slug)
      normalized = slug.to_s.strip.downcase
      SLUG_ALIASES.fetch(normalized, normalized)
    end

    def self.fetch(slug)
      DEFINITIONS[resolve_slug(slug)]
    end

    def self.known?(slug)
      fetch(slug).present?
    end
  end
end
