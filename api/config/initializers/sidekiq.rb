# frozen_string_literal: true

# ============================================================================
# Sidekiq — backend de background jobs
# ============================================================================
# Se usa tanto para el cliente (enqueue) como para el server (worker).
# Incluye dashboard Web protegido, scheduler y cliente de deduplicación.
# ----------------------------------------------------------------------------

require "sidekiq"
require "sidekiq-scheduler"
require "sidekiq_unique_jobs"

redis_conf = { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0") }

Sidekiq.configure_server do |config|
  config.redis = redis_conf

  # Middleware de jobs únicos (evita duplicar recordatorios, webhooks, etc.)
  config.client_middleware do |chain|
    chain.add SidekiqUniqueJobs::Middleware::Client
  end
  config.server_middleware do |chain|
    chain.add SidekiqUniqueJobs::Middleware::Server
  end
  SidekiqUniqueJobs::Server.configure(config)
end

Sidekiq.configure_client do |config|
  config.redis = redis_conf

  config.client_middleware do |chain|
    chain.add SidekiqUniqueJobs::Middleware::Client
  end
end

# Usar Sidekiq como ActiveJob backend
Rails.application.config.active_job.queue_adapter = :sidekiq
