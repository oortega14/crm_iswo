# frozen_string_literal: true

require "rails_helper"

RSpec.describe Leads::RoundRobinOwner do
  let(:tenant) { ActsAsTenant.current_tenant }
  let!(:pipeline) { create(:pipeline_with_stages, tenant: tenant, is_default: true) }
  let!(:admin)      { create(:user, :admin, tenant: tenant, email: "admin-rr@local.test") }
  let!(:consultant) { create(:user, :consultant, tenant: tenant, email: "consult-rr@local.test") }

  it "elige un consultor aunque no tenga oportunidades abiertas" do
    expect(described_class.call(tenant)).to eq(consultant)
  end

  it "no devuelve admin si hay consultores activos" do
    picked = described_class.call(tenant)
    expect(picked.role).to eq("consultant")
    expect(picked.id).not_to eq(admin.id)
  end

  it "no excluye al consultor cuyas oportunidades están todas cerradas (cuenta 0 abiertas)" do
    stage = pipeline.pipeline_stages.first
    busy  = create(:user, :consultant, tenant: tenant, email: "busy-rr@local.test")

    # `busy` tiene una oportunidad ABIERTA; `consultant` solo una CERRADA.
    create(:opportunity, tenant: tenant, owner_user: busy, pipeline: pipeline,
                         pipeline_stage: stage, status: "contacted")
    create(:opportunity, :won, tenant: tenant, owner_user: consultant, pipeline: pipeline,
                              pipeline_stage: stage)

    # El de opps solo cerradas debe ganar el reparto (0 abiertas vs 1 abierta).
    expect(described_class.call(tenant)).to eq(consultant)
  end
end
