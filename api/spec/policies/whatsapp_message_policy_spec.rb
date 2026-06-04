# frozen_string_literal: true

require "rails_helper"

RSpec.describe WhatsappMessagePolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:pipeline)   { create(:pipeline_with_stages, tenant: tenant) }
  let(:contact)    { create(:contact, tenant: tenant) }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }
  let(:opp) do
    create(:opportunity, tenant: tenant, contact: contact,
           pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first,
           owner_user: consultant)
  end
  let(:msg) { create(:whatsapp_message, tenant: tenant, opportunity: opp) }

  describe "index?" do
    it "permite a todo el staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, msg).index?).to be(true)
      end
    end
  end

  describe "create?" do
    it "permite a admin, manager y consultant" do
      expect(described_class.new(admin,      msg).create?).to be(true)
      expect(described_class.new(manager,    msg).create?).to be(true)
      expect(described_class.new(consultant, msg).create?).to be(true)
    end

    it "deniega a viewer" do
      expect(described_class.new(viewer, msg).create?).to be(false)
    end
  end

  describe "update?" do
    it "nadie puede modificar un mensaje enviado" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, msg).update?).to be(false)
      end
    end
  end

  describe "destroy?" do
    it "solo admin" do
      expect(described_class.new(admin,      msg).destroy?).to be(true)
      expect(described_class.new(manager,    msg).destroy?).to be(false)
      expect(described_class.new(consultant, msg).destroy?).to be(false)
    end
  end
end
