# frozen_string_literal: true

# Comprueba tablas Solid al arrancar (dev) y avisa con mensaje accionable.
Rails.application.config.after_initialize do
  next unless Rails.env.development?

  queue_ok =
    begin
      SolidQueue::Record.connection.data_source_exists?("solid_queue_jobs")
    rescue StandardError
      false
    end

  cache_ok =
    begin
      SolidCache::Record.connection.data_source_exists?("solid_cache_entries")
    rescue StandardError
      false
    end

  unless queue_ok && cache_ok
    missing = []
    missing << "solid_queue_* → bundle exec rails solid:setup" unless queue_ok
    missing << "solid_cache_* → bundle exec rails solid:setup" unless cache_ok
    Rails.logger.warn(
      "[Solid] Tablas ausentes: #{missing.join(' | ')}. " \
      "Con SOLID_QUEUE_IN_PUMA=true, Puma no arrancará hasta crearlas."
    )
  end

  unless cache_ok
    Rails.application.config.cache_store = :memory_store
    Rails.cache = ActiveSupport::Cache.lookup_store(:memory_store)
    Rails.logger.warn("[Solid Cache] memory_store temporal hasta rails solid:setup")
  end
rescue NameError => e
  Rails.logger.warn("[Solid] Verificación omitida: #{e.message}")
end
