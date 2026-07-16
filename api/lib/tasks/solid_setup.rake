# frozen_string_literal: true

namespace :solid do
  desc "Crea tablas Solid Queue y Solid Cache en PostgreSQL (sin Redis)"
  task setup: :environment do
    load_solid_schema!("queue", "solid_queue_jobs")
    load_solid_schema!("cache", "solid_cache_entries")
    puts "✅ Solid Queue + Solid Cache instalados en PostgreSQL"
    puts "   Arranca: SOLID_QUEUE_IN_PUMA=true bin/rails s"
    puts "   UI jobs: http://localhost:3000/jobs"
  end

  desc "Verifica tablas Solid Queue / Solid Cache"
  task check: :environment do
    queue_ok = solid_table_exists?("queue", "solid_queue_jobs")
    cache_ok = solid_table_exists?("cache", "solid_cache_entries")
    puts "solid_queue_jobs:   #{queue_ok ? 'OK' : 'FALTA — rails solid:setup'}"
    puts "solid_cache_entries: #{cache_ok ? 'OK' : 'FALTA — rails solid:setup'}"
    exit 1 unless queue_ok && cache_ok
  end

  def solid_table_exists?(db_name, table)
    conn_for(db_name).data_source_exists?(table)
  rescue StandardError
    false
  end

  def load_solid_schema!(db_name, marker_table)
    conn = conn_for(db_name)
    if conn.data_source_exists?(marker_table)
      puts "  #{db_name}: #{marker_table} ya existe"
      return
    end

    Rake::Task["db:schema:load:#{db_name}"].reenable
    Rake::Task["db:schema:load:#{db_name}"].invoke
    puts "  #{db_name}: schema cargado"
  end

  def conn_for(db_name)
    case db_name
    when "queue" then SolidQueue::Record.connection
    when "cache" then SolidCache::Record.connection
    else raise ArgumentError, db_name
    end
  end
end
