# frozen_string_literal: true

# ============================================================================
# staging:preflight — checklist operativo RFC §9 antes de producción
# ============================================================================
# Uso: cd api && bundle exec rails staging:preflight
# Exit 0 si todo OK; exit 1 si hay fallos críticos.
# ============================================================================

def load_recurring_yml_for_env
  path = Rails.root.join("config/recurring.yml")
  raw = YAML.load_file(path, aliases: true)
  cfg = raw.fetch(Rails.env, {})
  cfg.is_a?(Hash) ? cfg : {}
rescue StandardError
  {}
end

namespace :staging do
  PRODUCT_TENANT_SLUGS = %w[iswo micasita libranzas mi_casita].freeze

  desc "RFC §9 — verificación pre-producción (infra, jobs, integraciones)"
  task preflight: :environment do
    reporter = SecurityTaskReport.new
    production_check = Rails.env.production? || Rails.env.staging?

    puts "CRM ISWO — staging preflight (RFC §9)"
    puts "Entorno: #{Rails.env}#{production_check ? ' (checks estrictos)' : ' (Solid Queue = advertencia si no hay worker)'}\n\n"

    # --- Fase 1 seguridad (Opción 1 infra) ----------------------------------
    puts "Seguridad Fase 1 (security:infra):\n"
    begin
      Rake::Task["security:infra"].reenable
      Rake::Task["security:infra"].invoke
    rescue SystemExit => e
      reporter.fail! if e.status.to_i.nonzero?
    end
    puts ""

    if DatabaseTenantRls.enabled?
      puts "Seguridad Fase 3 (security:rls):\n"
      begin
        Rake::Task["security:rls"].reenable
        Rake::Task["security:rls"].invoke
      rescue SystemExit => e
        reporter.fail! if e.status.to_i.nonzero?
      end
      puts ""
    end

    # --- Infraestructura ----------------------------------------------------
    begin
      ActiveRecord::Base.connection.execute("SELECT 1")
      reporter.report("PostgreSQL", true, "conectado (#{ActiveRecord::Base.connection_db_config.database})")
    rescue StandardError => e
      reporter.report("PostgreSQL", false, e.message)
    end

    reporter.report("DEVISE_JWT_SECRET_KEY", ENV["DEVISE_JWT_SECRET_KEY"].present? || Rails.application.credentials.devise_jwt_secret_key.present?)
    reporter.report("LOCKBOX_MASTER_KEY", ENV["LOCKBOX_MASTER_KEY"].present? || Rails.application.credentials.lockbox_master_key.present?)

    solid_tables_ok = %w[solid_queue_jobs solid_cache_entries].all? do |table|
      ActiveRecord::Base.connection.data_source_exists?(table)
    rescue StandardError
      false
    end
    if solid_tables_ok
      reporter.report("Solid Queue + Solid Cache (PostgreSQL)", true)
    elsif production_check
      reporter.report("Solid Queue + Solid Cache (PostgreSQL)", false, "ejecuta: bundle exec rails solid:setup")
    else
      reporter.warn_item("Solid Queue + Solid Cache", "tablas ausentes — ejecuta: bundle exec rails solid:setup")
    end

    if production_check
      if ENV["AWS_S3_BUCKET"].present?
        reporter.report("AWS_S3_BUCKET (exports cifrados en S3)", true, ENV["AWS_S3_BUCKET"])
      else
        reporter.warn_item("AWS_S3_BUCKET", "vacío — exports async usan disco cifrado Lockbox (OK dev, revisar prod)")
      end
    end

    # --- Solid Queue / jobs RFC §6.4, §9 ------------------------------------
    recurring = load_recurring_yml_for_env
    solid_recurring = recurring.key?("reminder_notification_job")
    reporter.report(
      "ReminderNotificationJob programado (cada minuto)",
      solid_recurring,
      solid_recurring ? "Solid Queue recurring (config/recurring.yml)" : "falta en recurring.yml"
    )

    begin
      in_puma = ENV["SOLID_QUEUE_IN_PUMA"].to_s == "true"
      workers = defined?(SolidQueue::Process) ? SolidQueue::Process.count : 0
      if in_puma
        reporter.report("Solid Queue supervisor", true, "SOLID_QUEUE_IN_PUMA=true (dentro de Puma)")
      elsif workers.positive?
        reporter.report("Solid Queue worker", true, "#{workers} proceso(s) activo(s)")
      elsif production_check
        reporter.report("Solid Queue worker", false, "levanta Puma con SOLID_QUEUE_IN_PUMA=true o bin/jobs")
      else
        reporter.warn_item("Solid Queue worker", "no detectado — SOLID_QUEUE_IN_PUMA=true bin/rails s o bin/jobs")
      end
    rescue StandardError => e
      reporter.warn_item("Solid Queue worker", "no se pudo verificar (#{e.message})")
    end

    pending_reminders = ActsAsTenant.without_tenant { Reminder.due.count }
    reporter.warn_item("Recordatorios vencidos pendientes", "#{pending_reminders} en cola") if pending_reminders.positive?

    # --- Email (recordatorios) ----------------------------------------------
    if ENV["POSTMARK_API_TOKEN"].present?
      reporter.report("Postmark (email recordatorios)", true)
    else
      reporter.warn_item("POSTMARK_API_TOKEN", "vacío — canal email de recordatorios no enviará")
    end

    # --- Integraciones por tenant -------------------------------------------
    tenant_scope =
      if ENV["PREFLIGHT_ALL_TENANTS"] == "1"
        Tenant.active.order(:slug)
      else
        Tenant.active.where(slug: PRODUCT_TENANT_SLUGS).order(:slug)
      end

    if tenant_scope.none?
      reporter.warn_item(
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
          reporter.report("  Meta Ads configurado", meta.credentials.present?, "webhook: POST /api/v1/webhooks/meta")
        else
          reporter.warn_item("  Meta Ads", "sin AdIntegration activa — RFC §9 leads Meta no aplicará")
        end

        if google
          reporter.report("  Google Ads configurado", google.credentials.present?)
        else
          reporter.warn_item("  Google Ads", "sin AdIntegration activa")
        end

        if whatsapp.present?
          reporter.report("  WhatsApp outbound", true, "provider=#{whatsapp}")
        else
          reporter.warn_item("  WhatsApp outbound", "sin provider en tenant.settings")
        end
      end
    end

    # --- Criterios manuales RFC §9 ------------------------------------------
    puts "\n--- Validación manual requerida (RFC §9) ---"
    puts "• Registrar oportunidad completa en < 2 min (UX con consultor real)"
    puts "• Lead Meta Ads → CRM en < 5 min (webhook público + Solid Queue en prod)"
    puts "• Recordatorio entregado ±5 min del remind_at (recurring.yml + worker activo)"

    puts "\n--- Resumen ---"
    passed = reporter.results.count { |r| r[:ok] }
    puts "#{passed}/#{reporter.results.size} checks OK"
    if reporter.failures.positive?
      puts "#{reporter.failures} fallo(s) crítico(s)."
      exit 1
    end

    puts "Preflight OK#{production_check ? '' : ' en desarrollo'} (revisar ⚠️  antes de go-live)."
    if !production_check
      puts "Tip: en producción/staging Solid Queue es obligatorio (SOLID_QUEUE_IN_PUMA o bin/jobs)."
    end
  end
end
