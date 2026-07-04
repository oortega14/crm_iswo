# frozen_string_literal: true

require Rails.root.join("lib/database_tenant_rls")

# Fase 3 — sincroniza RLS con ActsAsTenant en cada request/job.
if DatabaseTenantRls.enabled?
  ActiveSupport.on_load(:active_record) do
    # Pre-cachear installed? ANTES de registrar el callback de checkout.
    # Si se llamara dentro del callback, AR.connection intentaría un segundo
    # checkout (el thread aún no tiene conexión cacheada) → deadlock.
    DatabaseTenantRls.installed?

    ActiveRecord::ConnectionAdapters::AbstractAdapter.set_callback(:checkout, :after) do |conn|
      DatabaseTenantRls.apply_to_connection!(conn)
    end

    ActiveRecord::ConnectionAdapters::AbstractAdapter.set_callback(:checkin, :after) do |conn|
      DatabaseTenantRls.reset_connection!(conn)
    end
  end

  module ActsAsTenantRlsBridge
    def with_tenant(tenant, &block)
      super(tenant) do
        # Actualiza RLS solo si el thread ya tiene una conexión tomada del pool.
        # NO llama .connection porque eso bloquea esperando el pool cuando está lleno.
        # El callback de checkout se encarga de configurar conexiones nuevas.
        conn = ActiveRecord::Base.connection_pool.active_connection
        DatabaseTenantRls.apply_to_connection!(conn) if conn
        block.call
      end
    end

    def without_tenant(&block)
      DatabaseTenantRls.with_bypass do
        super do
          conn = ActiveRecord::Base.connection_pool.active_connection
          DatabaseTenantRls.apply_to_connection!(conn) if conn
          block.call
        end
      end
    end
  end

  ActsAsTenant.singleton_class.prepend(ActsAsTenantRlsBridge)
end
