# frozen_string_literal: true

require "rails_helper"

RSpec.describe Opportunity, type: :model do
  let(:tenant) { ActsAsTenant.current_tenant }
  subject { build(:opportunity, tenant: tenant) }

  describe "asociaciones" do
    it { is_expected.to belong_to(:tenant) }
    it { is_expected.to belong_to(:contact) }
    it { is_expected.to belong_to(:pipeline) }
    it { is_expected.to belong_to(:pipeline_stage) }
    it { is_expected.to belong_to(:owner_user).class_name("User") }
    it { is_expected.to belong_to(:lead_source).optional }

    it { is_expected.to have_many(:opportunity_logs).dependent(:destroy) }
    it { is_expected.to have_many(:reminders).dependent(:destroy) }
    it { is_expected.to have_many(:whatsapp_messages).dependent(:nullify) }
    it { is_expected.to have_many(:duplicate_flags).dependent(:destroy) }
    it { is_expected.to have_many(:landing_form_submissions).dependent(:nullify) }
  end

  describe "validaciones" do
    it { is_expected.to validate_presence_of(:title) }
    it { is_expected.to validate_numericality_of(:estimated_value).is_greater_than_or_equal_to(0).allow_nil }
    it { is_expected.to validate_numericality_of(:bant_score).only_integer.is_greater_than_or_equal_to(0).is_less_than_or_equal_to(100) }
    it { is_expected.to validate_length_of(:currency).is_equal_to(3) }

    it "rechaza stage que pertenece a otro pipeline" do
      pipeline_a = create(:pipeline_with_stages, tenant: tenant)
      pipeline_b = create(:pipeline_with_stages, tenant: tenant)
      opp = build(:opportunity,
                  tenant: tenant,
                  pipeline: pipeline_a,
                  pipeline_stage: pipeline_b.pipeline_stages.first)
      expect(opp).not_to be_valid
      expect(opp.errors[:pipeline_stage]).to be_present
    end
  end

  describe "enum status" do
    it "default es new_lead" do
      expect(Opportunity.new.status).to eq("new_lead")
    end

    it "define predicate methods con prefijo status_" do
      opp = build(:opportunity, :won, tenant: tenant)
      expect(opp.status_won?).to be(true)
      expect(opp.status_lost?).to be(false)
    end
  end

  describe "callbacks" do
    it "setea last_activity_at en la creación si es nil" do
      opp = build(:opportunity, tenant: tenant, last_activity_at: nil)
      opp.valid?
      expect(opp.last_activity_at).to be_present
    end

    it "setea closed_at cuando transiciona a won/lost" do
      opp = create(:opportunity, tenant: tenant)
      expect(opp.closed_at).to be_nil
      opp.update!(status: "won")
      expect(opp.closed_at).to be_present
    end

    it "resetea closed_at y close_reason si vuelve a un estado abierto" do
      opp = create(:opportunity, :won, tenant: tenant, closed_at: 1.day.ago, close_reason: "ganado")
      opp.update!(status: "contacted")
      expect(opp.closed_at).to be_nil
      expect(opp.close_reason).to be_nil
    end
  end

  describe "scopes" do
    let!(:open_opp) { create(:opportunity, tenant: tenant, status: "contacted") }
    let!(:won_opp)  { create(:opportunity, :won, tenant: tenant) }
    let!(:lost_opp) { create(:opportunity, :lost, tenant: tenant) }

    it ".open excluye won/lost" do
      expect(Opportunity.open).to include(open_opp)
      expect(Opportunity.open).not_to include(won_opp, lost_opp)
    end

    it ".won/.lost filtran por status" do
      expect(Opportunity.won).to include(won_opp)
      expect(Opportunity.lost).to include(lost_opp)
    end

    it ".by_owner filtra por owner_user_id" do
      owner = create(:user, tenant: tenant)
      mine  = create(:opportunity, tenant: tenant, owner_user: owner)
      expect(Opportunity.by_owner(owner.id)).to include(mine)
      expect(Opportunity.by_owner(owner.id)).not_to include(open_opp)
    end

    it ".stale filtra por last_activity_at anterior al umbral" do
      stale = create(:opportunity, :stale, tenant: tenant)
      expect(Opportunity.stale(7)).to include(stale)
      expect(Opportunity.stale(7)).not_to include(open_opp)
    end
  end

  describe "#terminal?" do
    it "true si status es won o lost" do
      expect(build(:opportunity, :won, tenant: tenant).terminal?).to be(true)
      expect(build(:opportunity, :lost, tenant: tenant).terminal?).to be(true)
      expect(build(:opportunity, tenant: tenant, status: "contacted").terminal?).to be(false)
    end
  end

  describe "#touch_activity!" do
    it "actualiza last_activity_at a Time.current" do
      opp = create(:opportunity, tenant: tenant, last_activity_at: 10.days.ago)
      travel_to Time.zone.local(2026, 4, 20, 12, 0, 0) do
        opp.touch_activity!
        expect(opp.reload.last_activity_at).to be_within(1.second).of(Time.current)
      end
    end
  end
end
