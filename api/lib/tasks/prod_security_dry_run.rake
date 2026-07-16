# frozen_string_literal: true

# ============================================================================
# prod:security_dry_run — RFC §7 → prod sin desplegar
# ============================================================================
# Valida config/deploy.yml + variables que Kamal inyectará y simula security:infra
# en modo producción (sin exigir conexión real a BD prod).
#
# Uso: cd api && bundle exec rails prod:security_dry_run
# ============================================================================

namespace :prod do
  REQUIRED_SECRETS = %w[
    RAILS_MASTER_KEY
    CRM_ISWO_DATABASE_PASSWORD
    DEVISE_JWT_SECRET_KEY
    LOCKBOX_MASTER_KEY
    BLIND_INDEX_MASTER_KEY
    POSTMARK_API_TOKEN
  ].freeze

  REQUIRED_CLEAR = {
    "APP_HOST" => ->(v) { v.present? },
    "ASSUME_SSL" => ->(v) { v.to_s == "true" },
    "DB_SSLMODE" => ->(v) { v.to_s == "require" },
    "DB_RLS_ENABLED" => ->(v) { v.to_s == "true" },
    "SOLID_QUEUE_IN_PUMA" => ->(v) { v.to_s == "true" },
    "CORS_ALLOWED_ORIGINS" => lambda { |v|
      v.present? && !v.include?("localhost") && v.split(",").all? { |o| o.strip.start_with?("https://") }
    }
  }.freeze

  RECOMMENDED_CLEAR = {
    "AWS_S3_BUCKET" => "exports async en S3+SSE (RFC §6.7 / A.7.10)",
    "AWS_REGION" => "región S3"
  }.freeze

  desc "RFC §7 — dry-run producción (deploy.yml + security:infra simulado)"
  task security_dry_run: :environment do
    reporter = SecurityTaskReport.new

    puts "CRM ISWO — prod:security_dry_run (RFC §7 → Kamal)\n"

    deploy_path = Rails.root.join("config/deploy.yml")
    unless deploy_path.exist?
      reporter.report("config/deploy.yml", false, "no encontrado")
      exit 1
    end

    deploy = YAML.load_file(deploy_path, aliases: true)
    env_block = deploy.fetch("env", {})
    secrets = Array(env_block["secret"])
    clear = env_block.fetch("clear", {})

    reporter.report("Kamal proxy SSL", deploy.dig("proxy", "ssl") == true, deploy.dig("proxy", "host"))
    reporter.report("Kamal proxy host", deploy.dig("proxy", "host").present?)

    missing_secrets = REQUIRED_SECRETS - secrets
    reporter.report(
      "env.secret (Kamal)",
      missing_secrets.empty?,
      missing_secrets.empty? ? REQUIRED_SECRETS.join(", ") : "faltan: #{missing_secrets.join(', ')}"
    )

    secrets_file = Rails.root.join(".kamal/secrets")
    if secrets_file.exist?
      reporter.report(".kamal/secrets presente", true, "revisa que tenga valores reales (no commitear)")
    else
      reporter.warn_item(".kamal/secrets", "no existe — copia .kamal/secrets.example y completa")
    end

    REQUIRED_CLEAR.each do |key, validator|
      value = clear[key] || ENV[key]
      reporter.report("env.clear #{key}", validator.call(value), value.to_s.truncate(80))
    end

    RECOMMENDED_CLEAR.each do |key, reason|
      value = clear[key] || ENV[key]
      if value.present?
        reporter.report("env.clear #{key}", true, value.to_s)
      else
        reporter.warn_item(key, "no en deploy.yml — #{reason}")
      end
    end

    servers = deploy["servers"]
    web_hosts = servers.is_a?(Hash) ? servers["web"] : servers
    if web_hosts.is_a?(Array) && web_hosts.any? { |h| h.to_s.include?("192.168.0.1") }
      reporter.warn_item("servers.web", "placeholder 192.168.0.1 — reemplaza IP/host real antes de kamal deploy")
    end

    puts "\n--- Simulación security:infra (subprocess RAILS_ENV=production) ---\n"

    # `system(env, ...)` exige valores string; env.clear puede traer booleanos
    # YAML sin comillas (p. ej. deploy.yml: SOLID_QUEUE_IN_PUMA: true).
    infra_env = clear.stringify_keys.transform_values(&:to_s).merge(
      "RAILS_ENV" => "production",
      "DEVISE_JWT_SECRET_KEY" => ENV["DEVISE_JWT_SECRET_KEY"].presence || "dry-run-jwt-secret-min-32-chars-long",
      "LOCKBOX_MASTER_KEY" => ENV["LOCKBOX_MASTER_KEY"].presence || ("a" * 64)
    )
    infra_ok = system(infra_env, "bundle", "exec", "rails", "security:infra", chdir: Rails.root.to_s)
    reporter.fail! unless infra_ok
    puts "(Nota: puede fallar PostgreSQL si no existe crm_iswo_production local — normal en dry-run.)" unless infra_ok

    puts "\n--- Pasos manuales post-deploy ---"
    puts "• SQL rol app: docs/sql/create_crm_iswo_app_role.sql"
    puts "• Migraciones (owner): bundle exec rails db:migrate"
    puts "• RLS: bundle exec rails security:rls:install && security:rls"
    puts "• PII prod: security:encrypt_contacts (si hay legado) && security:pii"
    puts "• Checklist: bundle exec rails staging:preflight (en servidor o con ENV prod)"

    puts "\n--- Resumen dry-run ---"
    if reporter.failures.positive?
      puts "#{reporter.failures} fallo(s) — corrige deploy.yml / .kamal/secrets antes de kamal deploy."
      exit 1
    end

    puts "Dry-run OK#{reporter.warnings.positive? ? " (#{reporter.warnings} advertencia(s))" : ''}."
    puts "Siguiente: completar .kamal/secrets → IP real en deploy.yml → kamal setup → kamal deploy"
  end
end
