# frozen_string_literal: true

# ============================================================================
# staging:preflight — checklist operativo RFC §9 antes de producción
# ============================================================================
# Uso: cd api && bundle exec rails staging:preflight
# Exit 0 si todo OK; exit 1 si hay fallos críticos.
# ============================================================================
namespace :staging do
  PRODUCT_TENANT_SLUGS = %w[iswo micasita libranzas mi_casita].freeze

  desc "RFC §9 — verificación pre-producción (infra, jobs, integraciones)"
  task preflight: :environment do
    results = []
    critical_failures = 0
    production_check = Rails.env.production? || Rails.env.staging?

    report = lambda do |name, ok, detail = nil|
      icon = ok ? "✅" : "❌"
      line = "#{icon} #{name}"
      line += " — #{detail}" if detail.present?
      puts line
      results << { name: name, ok: ok, detail: detail }
      critical_failures += 1 unless ok
    end

    warn_item = lambda do |name, detail|
      puts "⚠️  #{name} — #{detail}"
      results << { name: name, ok: true, detail: "WARN: #{detail}" }
    end

    puts "CRM ISWO — staging preflight (RFC §9)"
    puts "Entorno: #{Rails.env}#{production_check ? ' (checks estrictos)' : ' (Redis/Sidekiq = advertencia)'}\n\n"

    # --- Fase 1 seguridad (Opción 1 infra) ----------------------------------
    puts "Seguridad Fase 1 (security:infra):\n"
    begin
      Rake::Task["security:infra"].reenable
      Rake::Task["security:infra"].invoke
    rescue SystemExit => e
      critical_failures += 1 if e.status.to_i.nonzero?
    end
    puts ""

    if DatabaseTenantRls.enabled?
      puts "Seguridad Fase 3 (security:rls):\n"
      begin
        Rake::Task["security:rls"].reenable
        Rake::Task["security:rls"].invoke
      rescue SystemExit => e
        critical_failures += 1 if e.status.to_i.nonzero?
      end
      puts ""
    end

    # --- Infraestructura ----------------------------------------------------
    begin
      ActiveRecord::Base.connection.execute("SELECT 1")
      report.call("PostgreSQL", true, "conectado (#{ActiveRecord::Base.connection_db_config.database})")
    rescue StandardError => e
      report.call("PostgreSQL", false, e.message)
    end

    redis_url = ENV.fetch("REDIS_URL", "redis://localhost:6379/0")
    begin
      redis = Redis.new(url: redis_url)
      pong = redis.ping
      report.call("Redis", pong == "PONG", redis_url)
    rescue StandardError => e
      if production_check
        report.call("Redis", false, e.message)
      else
        warn_item.call("Redis", "#{e.message} — inicia con: redis-server --daemonize yes")
      end
    end

    report.call("DEVISE_JWT_SECRET_KEY", ENV["DEVISE_JWT_SECRET_KEY"].present? || Rails.application.credentials.devise_jwt_secret_key.present?)
    report.call("LOCKBOX_MASTER_KEY", ENV["LOCKBOX_MASTER_KEY"].present? || Rails.application.credentials.lockbox_master_key.present?)

    if production_check
      if ENV["AWS_S3_BUCKET"].present?
        report.call("AWS_S3_BUCKET (exports cifrados en S3)", true, ENV["AWS_S3_BUCKET"])
      else
        warn_item.call("AWS_S3_BUCKET", "vacío — exports async usan disco cifrado Lockbox (OK dev, revisar prod)")
      end
    end

    # --- Sidekiq / jobs RFC §6.4, §9 ----------------------------------------
    schedule = YAML.load_file(Rails.root.join("config/sidekiq.yml")).dig(:scheduler, :schedule) || {}
    reminder_cron = schedule.dig("reminder_notification_job", "cron")
    recurring = YAML.load_file(Rails.root.join("config/recurring.yml")).fetch(Rails.env, {}) rescue {}
    solid_recurring = recurring.key?("reminder_notification_job")
    reminder_scheduled = reminder_cron == "* * * * *" || solid_recurring
    report.call(
      "ReminderNotificationJob programado (cada minuto)",
      reminder_scheduled,
      if solid_recurring
        "Solid Queue recurring (config/recurring.yml)"
      else
        reminder_cron || "no encontrado en sidekiq.yml ni recurring.yml"
      end
    )

    begin
      if defined?(Sidekiq)
        workers = Sidekiq::ProcessSet.new.size
        if workers.positive?
          report.call("Sidekiq worker", true, "#{workers} proceso(s) activo(s)")
        elsif production_check
          report.call("Sidekiq worker", false, "ningún proceso activo")
        else
          warn_item.call("Sidekiq worker", "no detectado — levanta con: bundle exec sidekiq -C config/sidekiq.yml")
        end
      else
        warn_item.call("Sidekiq worker", "gem Sidekiq no cargada")
      end
    rescue StandardError => e
      warn_item.call("Sidekiq worker", "no se pudo verificar (#{e.message})")
    end

    pending_reminders = ActsAsTenant.without_tenant { Reminder.due.count }
    warn_item.call("Recordatorios vencidos pendientes", "#{pending_reminders} en cola") if pending_reminders.positive?

    # --- Email (recordatorios) ----------------------------------------------
    if ENV["POSTMARK_API_TOKEN"].present?
      report.call("Postmark (email recordatorios)", true)
    else
      warn_item.call("POSTMARK_API_TOKEN", "vacío — canal email de recordatorios no enviará")
    end

    # --- Integraciones por tenant -------------------------------------------
    tenant_scope =
      if ENV["PREFLIGHT_ALL_TENANTS"] == "1"
        Tenant.active.order(:slug)
      else
        Tenant.active.where(slug: PRODUCT_TENANT_SLUGS).order(:slug)
      end

    if tenant_scope.none?
      warn_item.call(
        "Tenants producto",
        "no hay slugs #{PRODUCT_TENANT_SLUGS.join(', ')} — usa PREFLIGHT_ALL_TENANTS=1"
      )
    else
      hint = ENV["PREFLIGHT_ALL_TENANTS"] == "1" ? "todos los tenants activos" : "solo verticales (#{tenant_scope.pluck(:slug).join(', ')})"
      puts "Integraciones (#{hint}):\n"
    end

    ActsAsTenant.without_tenant do
      tenant_scope.find_each do |tenant|
        integrations = tenant.ad_integrations.status_active
        meta = integrations.find_by(provider: "meta")
        google = integrations.find_by(provider: "google")
        whatsapp = tenant.whatsapp_outbound_provider

        puts "\nTenant «#{tenant.slug}»:"
        if meta
          report.call("  Meta Ads configurado", meta.credentials.present?, "webhook: POST /api/v1/webhooks/meta")
        else
          warn_item.call("  Meta Ads", "sin AdIntegration activa — RFC §9 leads Meta no aplicará")
        end

        if google
          report.call("  Google Ads configurado", google.credentials.present?)
        else
          warn_item.call("  Google Ads", "sin AdIntegration activa")
        end

        if whatsapp.present?
          report.call("  WhatsApp outbound", true, "provider=#{whatsapp}")
        else
          warn_item.call("  WhatsApp outbound", "sin provider en tenant.settings")
        end
      end
    end

    # --- Criterios manuales RFC §9 ------------------------------------------
    puts "\n--- Validación manual requerida (RFC §9) ---"
    puts "• Registrar oportunidad completa en < 2 min (UX con consultor real)"
    puts "• Lead Meta Ads → CRM en < 5 min (webhook público + Sidekiq en prod)"
    puts "• Recordatorio entregado ±5 min del remind_at (cron + Postmark/WhatsApp)"

    puts "\n--- Resumen ---"
    passed = results.count { |r| r[:ok] }
    puts "#{passed}/#{results.size} checks OK"
    if critical_failures.positive?
      puts "#{critical_failures} fallo(s) crítico(s)."
      exit 1
    end

    puts "Preflight OK#{production_check ? '' : ' en desarrollo'} (revisar ⚠️  antes de go-live)."
    if !production_check
      puts "Tip: en producción/staging Redis y Sidekiq son obligatorios (exit 1 si fallan)."
    end
  end
end
