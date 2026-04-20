# frozen_string_literal: true

require "rails_helper"

RSpec.describe AdIntegrationPolicy do
  let(:tenant) { ActsAsTenant.current_tenant }

  let(:admin)      { build_stubbed(:user, :admin,      tenant: tenant) }
  let(:manager)    { build_stubbed(:user, :manager,    tenant: tenant) }
  let(:consultant) { build_stubbed(:user, :consultant, tenant: tenant) }
  let(:viewer)     { build_stubbed(:user, :viewer,     tenant: tenant) }

  let(:integration) { build_stubbed(:ad_integration, :meta, tenant: tenant) }

  describe "index? / show?" do
    it "admin y manager sí; consultant y viewer no" do
      expect(described_class.new(admin,      integration).index?).to be(true)
      expect(described_class.new(manager,    integration).index?).to be(true)
      expect(described_class.new(consultant, integration).index?).to be(false)
      expect(described_class.new(viewer,     integration).index?).to be(false)

      expect(described_class.new(admin,      integration).show?).to be(true)
      expect(described_class.new(manager,    integration).show?).to be(true)
      expect(described_class.new(consultant, integration).show?).to be(false)
    end
  end

  describe "create? / update? / destroy? / disable?" do
    it "solo admin" do
      %i[create? update? destroy? disable?].each do |action|
        expect(described_class.new(admin,      integration).public_send(action)).to be(true)
        expect(described_class.new(manager,    integration).public_send(action)).to be(false)
        expect(described_class.new(consultant, integration).public_send(action)).to be(false)
        expect(described_class.new(viewer,     integration).public_send(action)).to be(false)
      end
    end
  end

  describe "test_connection?" do
    it "admin y manager" do
      expect(described_class.new(admin,      integration).test_connection?).to be(true)
      expect(described_class.new(manager,    integration).test_connection?).to be(true)
      expect(described_class.new(consultant, integration).test_connection?).to be(false)
    end
  end

  describe "Scope#resolve" do
    let!(:record) { create(:ad_integration, :meta, tenant: tenant) }

    it "admin y manager ven todo" do
      expect(described_class::Scope.new(admin,   AdIntegration).resolve).to include(record)
      expect(described_class::Scope.new(manager, AdIntegration).resolve).to include(record)
    end

    it "consultant y viewer no ven nada" do
      expect(described_class::Scope.new(consultant, AdIntegration).resolve).to be_empty
      expect(described_class::Scope.new(viewer,     AdIntegration).resolve).to be_empty
    end

    it "scope.none sin usuario" do
      expect(described_class::Scope.new(nil, AdIntegration).resolve).to be_empty
    end
  end
end
