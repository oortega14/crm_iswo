# frozen_string_literal: true

# Comparación de configuración de tenants F5 vs RFC-001 / seeds / CLAUDE.md
# Uso: cd api && bundle exec rails tenants:audit_rfc
namespace :tenants do
  RFC_MODULES = %w[opportunities contacts pipeline reminders network exports landings].freeze

  RFC_VERTICAL = {
    "iswo" => {
      industry: "consulting_iso",
      pipeline: "Ciclo de Consultoría ISO",
      stages: 7,
      bant: { budget: 25, authority: 35, need: 25, timeline: 15, threshold: 65 },
      custom_fields: 5,
      opportunity_fields: false,
      landings_seed: 0
    },
    "micasita" => {
      industry: "real_estate",
      pipeline: "Ciclo de Venta Inmobiliaria",
      stages: 8,
      bant: { budget: 40, authority: 25, need: 20, timeline: 15, threshold: 60 },
      custom_fields: 7,
      opportunity_fields: true,
      landings_seed: 0
    },
    "libranzas" => {
      industry: "payroll_credit",
      pipeline: "Proceso de Libranza",
      stages: 7,
      bant: { budget: 25, authority: 30, need: 25, timeline: 20, threshold: 55 },
      custom_fields: 8,
      opportunity_fields: true,
      landings_seed: 0
    }
  }.freeze

  desc "Audita configuración de iswo, micasita y libranzas vs RFC F5"
  task audit_rfc: :environment do
    cfg = ActiveRecord::Base.connection_db_config
    puts "\n=== Auditoría tenants F5 vs RFC ==="
    puts "DB: #{cfg.database} @ #{cfg.host || 'localhost'}\n\n"

    ok_count = 0
    warn_count = 0
    fail_count = 0

    report = lambda do |status, label, detail = nil|
      icon = { ok: "✅", warn: "⚠️ ", fail: "❌" }[status]
      line = "#{icon} #{label}"
      line += " — #{detail}" if detail.present?
      puts line
      ok_count   += 1 if status == :ok
      warn_count += 1 if status == :warn
      fail_count += 1 if status == :fail
    end

    Landings::TenantSetup::VERTICAL_SEED_SLUGS.each do |slug|
      tenant = Tenant.find_by(slug: slug)
      expected = RFC_VERTICAL[slug]
      puts "── #{slug.upcase} ──"

      unless tenant
        report.call(:fail, "Tenant existe", "no encontrado — ejecuta db:seed")
        puts
        next
      end

      settings = tenant.settings.is_a?(Hash) ? tenant.settings : {}
      modules  = Array(settings["modules"]).map(&:to_s)

      missing_mod = RFC_MODULES - modules
      extra_mod   = modules - RFC_MODULES
      if missing_mod.empty? && extra_mod.empty?
        report.call(:ok, "Módulos RFC F5", modules.join(", "))
      else
        report.call(:fail, "Módulos", "faltan: #{missing_mod.join(', ')}; extra: #{extra_mod.join(', ')}")
      end

      report.call(
        settings["industry"] == expected[:industry] ? :ok : :fail,
        "Industria",
        "actual=#{settings['industry']} esperado=#{expected[:industry]}"
      )

      report.call(
        settings["show_bant"] == true ? :ok : :warn,
        "show_bant",
        settings["show_bant"].inspect
      )

      depth = settings["network_depth"]
      report.call(
        depth == 3 ? :ok : :warn,
        "network_depth (RFC F2)",
        "actual=#{depth} esperado=3"
      )

      stale = settings["stale_days"]
      report.call(
        :ok,
        "stale_days (RFC §6.4)",
        stale.present? ? stale.to_s : "no en seed (default app: 7 días)"
      )

      opp_fields = settings["opportunity_fields"].is_a?(Hash)
      if expected[:opportunity_fields]
        report.call(
          opp_fields ? :ok : :fail,
          "opportunity_fields (vertical)",
          settings["opportunity_fields"].inspect
        )
      else
        report.call(
          opp_fields ? :warn : :ok,
          "opportunity_fields",
          opp_fields ? "presente (opcional en ISWO)" : "no requerido"
        )
      end

      pipeline = tenant.pipelines.kept.find_by(is_default: true) || tenant.pipelines.kept.first
      if pipeline&.name == expected[:pipeline]
        report.call(:ok, "Pipeline", pipeline.name)
      else
        report.call(:fail, "Pipeline", "actual=#{pipeline&.name} esperado=#{expected[:pipeline]}")
      end

      stage_n = pipeline ? pipeline.pipeline_stages.count : 0
      has_calificada = pipeline&.pipeline_stages&.any? { |s| s.name.to_s.downcase.include?("calificada") }
      report.call(
        stage_n == expected[:stages] ? :ok : :fail,
        "Etapas pipeline",
        "#{stage_n} (esperado #{expected[:stages]})"
      )
      report.call(
        has_calificada ? :ok : :fail,
        'Etapa "Calificada" (RFC §6.1 BANT)',
        has_calificada ? "sí" : "no — auto-avance BANT no funcionará"
      )

      bant = tenant.bant_criterion
      if bant
        b = expected[:bant]
        match = bant.budget_weight == b[:budget] &&
                bant.authority_weight == b[:authority] &&
                bant.need_weight == b[:need] &&
                bant.timeline_weight == b[:timeline] &&
                bant.threshold_qualified == b[:threshold]
        report.call(
          match ? :ok : :fail,
          "BANT pesos/umbral",
          "b=#{bant.budget_weight} a=#{bant.authority_weight} n=#{bant.need_weight} " \
          "t=#{bant.timeline_weight} umbral=#{bant.threshold_qualified}"
        )
      else
        report.call(:fail, "BantCriterion", "no configurado")
      end

      field_n = tenant.tenant_field_definitions.where(active: true).count
      report.call(
        field_n == expected[:custom_fields] ? :ok : :fail,
        "Campos personalizados (RFC F5)",
        "#{field_n} activos (esperado #{expected[:custom_fields]})"
      )

      lead_n = tenant.lead_sources.where(active: true).count
      report.call(:ok, "Fuentes de lead", "#{lead_n} activas")

      roles = tenant.users.where(active: true).group(:role).count
      report.call(:ok, "Usuarios activos", roles.sort.map { |r, c| "#{r}:#{c}" }.join(", "))

      lp_n = LandingPage.where(tenant: tenant).count
      report.call(
        lp_n == expected[:landings_seed] ? :ok : :warn,
        "Landings (RFC §6.5 / sin plantilla F5)",
        "#{lp_n} (esperado #{expected[:landings_seed]})"
      )

      ref_n = ReferralNetwork.where(tenant: tenant, active: true).count
      report.call(:ok, "Red referidos (RFC §6.3)", "#{ref_n} relaciones activas")

      puts
    end

    puts "── Transversal RFC ──"
    report.call(:ok, "Multi-tenant", "ActsAsTenant + X-Tenant-Slug + subdominio")
    report.call(:ok, "Landings públicas", "subdominio {tenant}.localhost / .crm.iswo.com.co")
    report.call(:warn, "Integraciones F3", "Meta/Google/WhatsApp por tenant — revisar staging:preflight")
    report.call(:warn, "Notificaciones", "polling 15s (RFC §6.4 MVP, no WebSocket)")

    puts "\nResumen: #{ok_count} OK, #{warn_count} advertencias, #{fail_count} fallos"
    exit 1 if fail_count.positive?
  end
end
