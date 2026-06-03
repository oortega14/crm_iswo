# frozen_string_literal: true

require "rails_helper"

RSpec.describe ConsultantNetworkAccess do
  let(:tenant) { ActsAsTenant.current_tenant }

  let(:referrer) { create(:user, :consultant, tenant: tenant) }
  let(:referred) { create(:user, :consultant, tenant: tenant) }
  let(:stranger) { create(:user, :consultant, tenant: tenant) }

  let(:pipeline) { create(:pipeline_with_stages, tenant: tenant) }
  let(:stage)    { pipeline.pipeline_stages.first }

  before do
    create(:referral_network, tenant: tenant, referrer_user: referrer, referred_user: referred)
  end

  let!(:network_opp) do
    create(:opportunity,
           tenant: tenant,
           pipeline: pipeline,
           pipeline_stage: stage,
           owner_user: referred,
           title: "Red")
  end

  let!(:stranger_opp) do
    create(:opportunity,
           tenant: tenant,
           pipeline: pipeline,
           pipeline_stage: stage,
           owner_user: stranger,
           title: "Ajena")
  end

  describe ".can_view_opportunity?" do
    it "solo permite ver oportunidades propias" do
      own = create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage,
                   owner_user: referrer, contact: network_opp.contact)
      expect(described_class.can_view_opportunity?(referrer, own)).to be(true)
      expect(described_class.can_view_opportunity?(referrer, network_opp)).to be(false)
      expect(described_class.can_view_opportunity?(referrer, stranger_opp)).to be(false)
    end
  end

  describe ".can_view_contact?" do
    it "no permite ver contactos solo por opp de otro consultor" do
      expect(described_class.can_view_contact?(referrer, network_opp.contact)).to be(false)
    end
  end

  describe ".visible_owner_ids" do
    it "siempre es solo el consultor (aunque haya red de referidos)" do
      expect(described_class.visible_owner_ids(referrer)).to eq([referrer.id])
      expect(described_class.visible_owner_ids(referrer)).not_to include(referred.id)
    end
  end

  describe ".network_depth" do
    it "sigue configurando profundidad del árbol /network" do
      tenant.update!(settings: tenant.settings.merge("network_depth" => 2))
      expect(described_class.network_depth(tenant)).to eq(2)
      expect(described_class.tree_depth(tenant)).to eq(2)
    end
  end
end
