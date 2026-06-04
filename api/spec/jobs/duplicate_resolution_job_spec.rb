# frozen_string_literal: true

require "rails_helper"

RSpec.describe DuplicateResolutionJob, type: :job do
  let(:tenant)   { ActsAsTenant.current_tenant }
  let(:pipeline) { create(:pipeline_with_stages, tenant: tenant) }
  let(:contact)  { create(:contact, tenant: tenant) }
  let(:user)     { create(:user, :admin, tenant: tenant) }
  let(:opp_a)    { create(:opportunity, tenant: tenant, contact: contact, pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first) }
  let(:opp_b)    { create(:opportunity, tenant: tenant, contact: contact, pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first) }
  let!(:flag)    { create(:duplicate_flag, tenant: tenant, opportunity: opp_a, duplicate_of_opportunity: opp_b) }

  describe "#perform con action=ignore" do
    it "marca el flag como ignored" do
      described_class.new.perform(flag.id, "ignore", user.id)
      expect(flag.reload.resolution).to eq("ignored")
      expect(flag.reload.resolved_at).to be_within(5.seconds).of(Time.current)
    end

    it "registra el usuario que resolvió" do
      described_class.new.perform(flag.id, "ignore", user.id)
      expect(flag.reload.resolved_by_user_id).to eq(user.id)
    end
  end

  describe "flag no encontrado" do
    it "no lanza error y retorna nil" do
      expect { described_class.new.perform(0, "ignore", user.id) }.not_to raise_error
    end
  end

  describe "action desconocida" do
    it "lanza RuntimeError" do
      expect {
        described_class.new.perform(flag.id, "unknown_action", user.id)
      }.to raise_error(RuntimeError, /action desconocida/)
    end
  end
end
