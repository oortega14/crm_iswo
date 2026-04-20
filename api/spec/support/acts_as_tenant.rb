# frozen_string_literal: true

# ============================================================================
# acts_as_tenant — la mayoría de specs corren con un tenant default.
# ============================================================================
# Si un example necesita correr SIN tenant (p. ej. webhooks o jobs que
# resuelven el tenant desde el payload), declarar `:without_tenant` en
# metadata.
# ============================================================================
RSpec.configure do |config|
  config.before(:each) do |example|
    next if example.metadata[:without_tenant]

    @_default_tenant ||= FactoryBot.create(:tenant)
    ActsAsTenant.current_tenant = @_default_tenant
  end

  config.after(:each) do
    ActsAsTenant.current_tenant = nil
  end
end

# Helper para correr código bajo otro tenant dentro de un example.
module TenantHelpers
  def with_tenant(tenant, &block)
    ActsAsTenant.with_tenant(tenant, &block)
  end
end

RSpec.configure { |c| c.include TenantHelpers }
