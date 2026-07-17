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
    it "permite ver propias y las de referidos directos" do
      own = create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage,
                   owner_user: referrer, contact: network_opp.contact)
      expect(described_class.can_view_opportunity?(referrer, own)).to be(true)
      expect(described_class.can_view_opportunity?(referrer, network_opp)).to be(true)
      expect(described_class.can_view_opportunity?(referrer, stranger_opp)).to be(false)
    end
  end

  describe ".can_edit_opportunity?" do
    it "solo permite editar las propias" do
      own = create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage,
                   owner_user: referrer, contact: network_opp.contact)
      expect(described_class.can_edit_opportunity?(referrer, own)).to be(true)
      expect(described_class.can_edit_opportunity?(referrer, network_opp)).to be(false)
    end
  end

  describe ".can_view_contact?" do
    it "permite ver contacto si tiene opp de un referido en la red" do
      expect(described_class.can_view_contact?(referrer, network_opp.contact)).to be(true)
    end

    it "no permite ver contactos fuera de la red" do
      expect(described_class.can_view_contact?(referrer, stranger_opp.contact)).to be(false)
    end
  end

  describe ".visible_owner_ids" do
    it "incluye al consultor y a sus referidos hasta network_depth" do
      expect(described_class.visible_owner_ids(referrer)).to match_array([referrer.id, referred.id])
    end
  end

  describe ".from_network? / .network_read_only?" do
    it "marca opp de referido como red y solo lectura para el referrer" do
      expect(described_class.from_network?(referrer, network_opp, tenant)).to be(true)
      expect(described_class.network_read_only?(referrer, network_opp, tenant)).to be(true)

      own = create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage,
                   owner_user: referrer, contact: network_opp.contact)
      expect(described_class.from_network?(referrer, own, tenant)).to be(false)
      expect(described_class.network_read_only?(referrer, own, tenant)).to be(false)
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
