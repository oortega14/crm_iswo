# frozen_string_literal: true

require "rails_helper"

RSpec.describe Dashboard::Scopes do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:other) { create(:user, :consultant, tenant: tenant) }
  let!(:pipeline) { create(:pipeline, tenant: tenant, is_default: true) }
  let!(:stage) { create(:pipeline_stage, pipeline: pipeline, tenant: tenant, position: 1) }

  it "incluye oportunidades de la red para consultor" do
    create(:referral_network, tenant: tenant, referrer_user: consultant, referred_user: other)
    own = create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage, owner_user: consultant)
    ref = create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage, owner_user: other)

    scope = described_class.new(consultant, tenant).opportunities

    expect(scope.pluck(:id)).to contain_exactly(own.id, ref.id)
  end
end
