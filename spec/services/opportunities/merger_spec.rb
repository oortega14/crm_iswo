# frozen_string_literal: true

require "rails_helper"

RSpec.describe Opportunities::Merger do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:performer) { create(:user, tenant: tenant, role: "manager") }

  let(:pipeline) { create(:pipeline, tenant: tenant) }
  let(:stage)    { create(:pipeline_stage, tenant: tenant, pipeline: pipeline) }
  let(:contact)  { create(:contact, tenant: tenant) }

  let(:source) do
    create(:opportunity,
           tenant: tenant, contact: contact, pipeline: pipeline, pipeline_stage: stage,
           owner_user: performer, estimated_value: 12_345, notes: "nota antigua",
           bant_data: { "budget" => { "score" => 80 } })
  end
  let(:target) do
    create(:opportunity,
           tenant: tenant, contact: contact, pipeline: pipeline, pipeline_stage: stage,
           owner_user: performer, estimated_value: nil, notes: nil,
           bant_data: { "authority" => { "score" => 70 } })
  end

  describe "validaciones" do
    it "rechaza si source == target" do
      expect do
        described_class.new(source: source, target: source, performed_by: performer)
      end.to raise_error(ArgumentError, /distintos/)
    end

    it "rechaza cross-tenant" do
      other_tenant = create(:tenant)
      other_target = nil
      with_tenant(other_tenant) do
        other_target = create(:opportunity, tenant: other_tenant)
      end

      expect do
        described_class.new(source: source, target: other_target, performed_by: performer)
      end.to raise_error(ArgumentError, /mismo tenant/)
    end
  end

  describe "#call" do
    before do
      # Relaciones que deben moverse al target
      create(:reminder,          tenant: tenant, opportunity: source, user: performer)
      create(:whatsapp_message,  tenant: tenant, contact: contact,    opportunity: source)
      source.opportunity_logs.create!(tenant: tenant, user: performer, action: "create", changes_data: {})
    end

    it "fusiona de forma atómica y devuelve un Result con contadores" do
      result = described_class.new(source: source, target: target, performed_by: performer).call

      expect(result).to be_a(described_class::Result)
      expect(result.moved_counts[:reminders]).to eq(1)
      expect(result.moved_counts[:whatsapp_messages]).to eq(1)
      # +1 log de "merged" creado al final por log_merge!
      expect(result.moved_counts[:logs]).to eq(1)
    end

    it "llena campos vacíos del target con valores del source" do
      described_class.new(source: source, target: target, performed_by: performer).call
      target.reload

      expect(target.estimated_value).to eq(12_345)
      expect(target.notes).to eq("nota antigua")
    end

    it "fusiona bant_data sin sobrescribir lo existente en target" do
      described_class.new(source: source, target: target, performed_by: performer).call
      target.reload

      expect(target.bant_data).to include("budget"    => { "score" => 80 })
      expect(target.bant_data).to include("authority" => { "score" => 70 })
    end

    it "marca source como merged y discarded" do
      described_class.new(source: source, target: target, performed_by: performer).call
      source.reload
      expect(source.status).to eq("merged")
      expect(source.discarded?).to be(true)
    end

    it "genera un OpportunityLog action=merged en el target" do
      expect do
        described_class.new(source: source, target: target, performed_by: performer).call
      end.to change { target.opportunity_logs.where(action: "merged").count }.by(1)
    end
  end
end
