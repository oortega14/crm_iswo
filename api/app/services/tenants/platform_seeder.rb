# frozen_string_literal: true

module Tenants
  # Tenant plataforma para super-admin (onboarding de otros tenants).
  class PlatformSeeder
    DEFAULT_ADMIN = {
      name:     "Super Admin",
      email:    "admin@super-admin.local",
      role:     "admin",
      password: "Password123!"
    }.freeze

    DEFAULT_TENANT = {
      name:          "Super Admin",
      slug:          PlatformTenant::SLUG,
      legal_name:    "ISWO Platform",
      primary_color: "#1e1b4b",
      currency:      "COP",
      locale:        "es-CO",
      timezone:      "America/Bogota",
      settings:      {
        "modules"       => [],
        "industry"      => "platform",
        "show_bant"     => false,
        "network_depth" => 1,
        "platform_tenant" => true
      }
    }.freeze

    Result = Struct.new(:tenant, :admin_user, :created, keyword_init: true)

    def self.call!(admin: DEFAULT_ADMIN, tenant_attrs: DEFAULT_TENANT)
      new(admin: admin, tenant_attrs: tenant_attrs).call!
    end

    def initialize(admin:, tenant_attrs:)
      @admin        = admin
      @tenant_attrs = tenant_attrs
    end

    def call!
      tenant = nil
      user   = nil
      created = false

      ActsAsTenant.without_tenant do
        tenant = Tenant.find_or_initialize_by(slug: @tenant_attrs[:slug])
        created = tenant.new_record?
        tenant.assign_attributes(
          name:          @tenant_attrs[:name],
          legal_name:    @tenant_attrs[:legal_name],
          primary_color: @tenant_attrs[:primary_color],
          currency:      @tenant_attrs[:currency],
          locale:        @tenant_attrs[:locale],
          timezone:      @tenant_attrs[:timezone],
          settings:      @tenant_attrs[:settings],
          active:        true
        )
        tenant.save!

        user = User.find_or_initialize_by(tenant: tenant, email: @admin[:email])
        user.assign_attributes(
          name:         @admin[:name],
          role:         @admin[:role],
          confirmed_at: Time.current,
          active:       true
        )
        user.password = @admin[:password] if user.new_record?
        user.save!
      end

      Result.new(tenant: tenant, admin_user: user, created: created)
    end
  end
end
