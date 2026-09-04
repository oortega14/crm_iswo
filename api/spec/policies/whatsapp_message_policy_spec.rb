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

  describe "Scope" do
    let(:other_consultant) { create(:user, :consultant, tenant: tenant) }

    def resolved_ids(user)
      described_class::Scope.new(user, WhatsappMessage.all).resolve.pluck(:id)
    end

    it "admin/manager/viewer ven todo" do
      msg
      [admin, manager, viewer].each do |u|
        expect(resolved_ids(u)).to include(msg.id)
      end
    end

    it "consultant ve mensajes de su propia oportunidad" do
      msg
      expect(resolved_ids(consultant)).to include(msg.id)
    end

    it "consultant NO ve mensajes de una oportunidad ajena (fuera de su red)" do
      msg
      expect(resolved_ids(other_consultant)).not_to include(msg.id)
    end

    it "consultant ve mensajes huérfanos (sin oportunidad) de un contacto que posee" do
      owned_contact = create(:contact, tenant: tenant, owner_user: consultant)
      orphan = create(:whatsapp_message, tenant: tenant, contact: owned_contact, opportunity: nil, direction: "in")

      expect(resolved_ids(consultant)).to include(orphan.id)
      expect(resolved_ids(other_consultant)).not_to include(orphan.id)
    end

    it "TODO consultor ve mensajes sin oportunidad y sin dueño (bandeja compartida sin asignar)" do
      unowned_contact = create(:contact, tenant: tenant)
      unassigned = create(:whatsapp_message, tenant: tenant, contact: unowned_contact, opportunity: nil, direction: "in")

      expect(resolved_ids(consultant)).to include(unassigned.id)
      expect(resolved_ids(other_consultant)).to include(unassigned.id)
    end
  end
end
