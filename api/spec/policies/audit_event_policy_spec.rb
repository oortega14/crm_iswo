# frozen_string_literal: true

require "rails_helper"

RSpec.describe AuditEventPolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:event)      { AuditEvent.new(tenant: tenant) }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  describe "index? / show?" do
    it "permite a admin y manager" do
      expect(described_class.new(admin,   event).index?).to be(true)
      expect(described_class.new(manager, event).index?).to be(true)
      expect(described_class.new(admin,   event).show?).to  be(true)
      expect(described_class.new(manager, event).show?).to  be(true)
    end

    it "deniega a consultant y viewer" do
      expect(described_class.new(consultant, event).index?).to be(false)
      expect(described_class.new(viewer,     event).index?).to be(false)
    end
  end

  describe "create? / update? / destroy?" do
    it "nadie puede modificar audit events (no-repudio ISO)" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, event).create?).to  be(false)
        expect(described_class.new(u, event).update?).to  be(false)
        expect(described_class.new(u, event).destroy?).to be(false)
      end
    end
  end

  describe "Scope#resolve" do
    let!(:evt) { AuditEvent.create!(tenant: tenant, action: "test", entity_type: "Contact", entity_id: 1) }

    it "admin y manager ven eventos del tenant" do
      expect(described_class::Scope.new(admin,   AuditEvent).resolve).to include(evt)
      expect(described_class::Scope.new(manager, AuditEvent).resolve).to include(evt)
    end

    it "consultant y viewer no ven nada" do
      expect(described_class::Scope.new(consultant, AuditEvent).resolve).to be_empty
      expect(described_class::Scope.new(viewer,     AuditEvent).resolve).to be_empty
    end

    it "nil user no ve nada" do
      expect(described_class::Scope.new(nil, AuditEvent).resolve).to be_empty
    end

    context "tenant plataforma super-admin" do
      let(:platform_tenant) do
        ActsAsTenant.without_tenant do
          Tenant.find_or_create_by!(slug: PlatformTenant::SLUG) do |t|
            t.name = "Super Admin"
            t.active = true
            t.settings = { "modules" => [] }
          end
        end
      end
      let(:platform_admin) do
        ActsAsTenant.without_tenant do
          User.find_or_create_by!(tenant: platform_tenant, email: "platform-audit@super-admin.local") do |u|
            u.name = "Platform Admin"
            u.role = "admin"
            u.password = "Password123!"
            u.active = true
            u.confirmed_at = Time.current
          end
        end
      end
      let!(:tenant_event) do
        AuditEvent.create!(tenant: platform_tenant, action: "login", entity_type: "User", entity_id: 1)
      end
      let!(:global_event) do
        AuditEvent.create!(
          tenant:      nil,
          user:        platform_admin,
          action:      "tenant_onboard",
          entity_type: "Tenant",
          entity_id:   99,
          metadata:    { slug: "nuevo-tenant" }
        )
      end
      let!(:other_tenant_event) do
        AuditEvent.create!(tenant: tenant, action: "login", entity_type: "User", entity_id: 2)
      end

      it "incluye eventos del tenant plataforma y globales (tenant_id NULL)" do
        resolved = described_class::Scope.new(platform_admin, AuditEvent).resolve
        expect(resolved).to include(tenant_event, global_event)
        expect(resolved).not_to include(other_tenant_event)
      end
    end
  end
end
