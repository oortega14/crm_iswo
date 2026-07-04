# frozen_string_literal: true

# ============================================================================
# DatabaseTenantRls — Fase 3: Row Level Security por tenant_id en PostgreSQL.
# ============================================================================
# Activa con DB_RLS_ENABLED=true (explícito; no activo por defecto en dev).
# Sincroniza SET crm.current_tenant_id / crm.bypass_rls en cada conexión del pool.
# ============================================================================
module DatabaseTenantRls
  TENANT_SETTING = "crm.current_tenant_id"
  BYPASS_SETTING = "crm.bypass_rls"
  THREAD_BYPASS  = :database_tenant_rls_bypass

  POLICY_NAME = "crm_tenant_isolation"

  TENANT_TABLES = %w[
    ad_integrations audit_events bant_criteria contacts duplicate_flags exports
    landing_form_submissions landing_pages lead_sources notifications opportunities
    opportunity_logs pipeline_stages pipelines referral_networks reminders
    tenant_field_definitions users whatsapp_messages
  ].freeze

  module_function

  def enabled?
    return @enabled unless @enabled.nil?

    @enabled = ActiveModel::Type::Boolean.new.cast(ENV["DB_RLS_ENABLED"])
  end

  def installed?
    return @installed unless @installed.nil?

    @installed = missing_policy_tables.empty?
  rescue StandardError
    @installed = false
  end

  def missing_policy_tables
    conn = ActiveRecord::Base.connection
    TENANT_TABLES.reject do |table|
      next true unless conn.table_exists?(table)

      conn.select_value(<<~SQL.squish).present?
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = '#{table}' AND policyname = '#{POLICY_NAME}'
      SQL
    end
  end

  # Idempotente — útil si db:schema:load dejó schema_migrations al día sin pg_policies.
  def install!
    conn = ActiveRecord::Base.connection
    policy = POLICY_NAME

    TENANT_TABLES.each do |table|
      next unless conn.table_exists?(table)

      quoted = conn.quote_table_name(table)
      conn.execute "ALTER TABLE #{quoted} ENABLE ROW LEVEL SECURITY"
      conn.execute "DROP POLICY IF EXISTS #{policy} ON #{quoted}"
      conn.execute policy_sql(table)
    end

    @installed = nil
  end

  def bypass?
    Thread.current[THREAD_BYPASS] == true
  end

  def with_bypass
    previous = Thread.current[THREAD_BYPASS]
    Thread.current[THREAD_BYPASS] = true
    yield
  ensure
    Thread.current[THREAD_BYPASS] = previous
  end

  def apply_to_connection!(connection)
    return unless enabled? && installed?

    raw = connection.raw_connection
    if bypass?
      exec_set(raw, BYPASS_SETTING, "on")
      exec_reset(raw, TENANT_SETTING)
    elsif (tenant_id = ActsAsTenant.current_tenant&.id)
      exec_reset(raw, BYPASS_SETTING)
      exec_set(raw, TENANT_SETTING, tenant_id.to_s)
    else
      exec_reset(raw, BYPASS_SETTING)
      exec_reset(raw, TENANT_SETTING)
    end
  rescue StandardError => e
    Rails.logger.warn("[DatabaseTenantRls] #{e.class}: #{e.message}")
  end

  def reset_connection!(connection)
    return unless enabled? && installed?

    raw = connection.raw_connection
    exec_reset(raw, BYPASS_SETTING)
    exec_reset(raw, TENANT_SETTING)
  rescue StandardError
    nil
  end

  def policy_sql(table)
    bypass = "coalesce(nullif(current_setting('#{BYPASS_SETTING}', true), ''), 'off') = 'on'"
    tenant = "nullif(current_setting('#{TENANT_SETTING}', true), '')::bigint"
    match  = "tenant_id = #{tenant}"
    condition = "#{bypass} OR #{match}"

    <<~SQL.squish
      CREATE POLICY #{POLICY_NAME} ON #{table}
      FOR ALL
      USING (#{condition})
      WITH CHECK (#{condition})
    SQL
  end

  def exec_set(raw, key, value)
    # Usar escape del raw PG connection — NO llamar AR.connection aquí porque
    # exec_set se invoca desde el callback de checkout, donde el thread aún no
    # tiene la conexión cacheada. Llamar AR.connection intentaría un segundo
    # checkout → deadlock cuando el pool está lleno.
    raw.exec("SET #{key} = '#{raw.escape_string(value.to_s)}'")
  end

  def exec_reset(raw, key)
    raw.exec("RESET #{key}")
  end
end
