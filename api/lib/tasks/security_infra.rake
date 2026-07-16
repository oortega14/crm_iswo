# frozen_string_literal: true

namespace :security do
  desc "Fase 1 — checklist infra (HTTPS, SSL BD, secretos, CORS)"
  task infra: :environment do
    reporter = SecurityTaskReport.new

    production_check = Rails.env.production? || Rails.env.staging?

    puts "CRM ISWO — security:infra (Fase 1)\n"

    reporter.report("force_ssl (production)", !production_check || Rails.application.config.force_ssl)

    if production_check
      reporter.report("APP_HOST", ENV["APP_HOST"].present?, ENV["APP_HOST"].presence || "vacío")
    else
      reporter.warn_item("APP_HOST", "opcional en dev")
    end

    begin
      ActiveRecord::Base.connection.execute("SELECT 1")
      db_config = ActiveRecord::Base.connection_db_config
      ssl = db_config.configuration_hash[:sslmode] || ENV["DB_SSLMODE"]
      if production_check
        reporter.report("PostgreSQL SSL (sslmode)", ssl.to_s == "require", ssl.presence || "no configurado")
      else
        reporter.warn_item("PostgreSQL SSL", "sslmode=#{ssl || 'default'} (require en producción)")
      end
      reporter.report("PostgreSQL conectado", true, db_config.database)
    rescue StandardError => e
      reporter.report("PostgreSQL conectado", false, e.message)
    end

    jwt_ok = ENV["DEVISE_JWT_SECRET_KEY"].present? ||
             Rails.application.credentials.devise_jwt_secret_key.present?
    lock_ok = ENV["LOCKBOX_MASTER_KEY"].present? ||
              Rails.application.credentials.dig(:lockbox, :master_key).present?

    reporter.report("DEVISE_JWT_SECRET_KEY", jwt_ok || !production_check)
    reporter.report("LOCKBOX_MASTER_KEY", lock_ok || !production_check)

    cors = ENV.fetch("CORS_ALLOWED_ORIGINS", "")
    if production_check
      localhost = cors.split(",").any? { |o| o.include?("localhost") }
      https_only = cors.split(",").all? { |o| o.strip.start_with?("https://") || o.strip.blank? }
      reporter.report("CORS sin localhost", !localhost && cors.present?, cors.truncate(60))
      reporter.report("CORS solo https", https_only || cors.blank?, "")
    else
      reporter.warn_item("CORS", cors.presence || "localhost OK en dev")
    end

    if reporter.failures.positive?
      puts "\n#{reporter.failures} fallo(s) crítico(s) en Fase 1."
      exit 1 if production_check
    end

    puts "\nFase 1 infra #{production_check ? 'OK' : 'revisada (dev)'}"
  end
end
