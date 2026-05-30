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
    it "permite al referrer ver opps del referido" do
      expect(described_class.can_view_opportunity?(referrer, network_opp)).to be(true)
    end

    it "no permite ver opps fuera de la red" do
      expect(described_class.can_view_opportunity?(referrer, stranger_opp)).to be(false)
    end
  end

  describe ".can_view_contact?" do
    it "permite ver el contacto de una opp de la red" do
      expect(described_class.can_view_contact?(referrer, network_opp.contact)).to be(true)
    end
  end
end
