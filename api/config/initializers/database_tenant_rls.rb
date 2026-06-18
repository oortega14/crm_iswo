# frozen_string_literal: true

require Rails.root.join("lib/database_tenant_rls")

# Fase 3 — sincroniza RLS con ActsAsTenant en cada request/job.
if DatabaseTenantRls.enabled?
  ActiveSupport.on_load(:active_record) do
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
        DatabaseTenantRls.apply_to_connection!(ActiveRecord::Base.connection)
        block.call
      end
    end

    def without_tenant(&block)
      DatabaseTenantRls.with_bypass do
        super do
          DatabaseTenantRls.apply_to_connection!(ActiveRecord::Base.connection)
          block.call
        end
      end
    end
  end

  ActsAsTenant.singleton_class.prepend(ActsAsTenantRlsBridge)
end
