# frozen_string_literal: true

require "rails_helper"

RSpec.describe Opportunities::BriefingBuilder do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:manager) { create(:user, :manager, tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let!(:pipeline) { create(:pipeline, tenant: tenant, is_default: true) }
  let!(:stage) { create(:pipeline_stage, pipeline: pipeline, tenant: tenant, position: 1) }
  let!(:opportunity) do
    create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage, owner_user: consultant)
  end

  def build_for(user)
    scope = ReminderPolicy::Scope.new(user, Reminder.all).resolve
    described_class.new(user, tenant, reminder_scope: scope).call
  end

  it "cuenta recordatorios pendientes visibles al manager (mismo alcance que /reminders)" do
    create(:reminder, tenant: tenant, user: consultant, opportunity: opportunity,
           remind_at: 2.days.from_now, status: "pending", subject: "Futuro")
    create(:reminder, tenant: tenant, user: consultant, opportunity: opportunity,
           remind_at: 1.hour.ago, status: "pending", subject: "Vencido")

    briefing = build_for(manager)

    expect(briefing[:kpis][:pending_count]).to eq(2)
    expect(briefing[:kpis][:overdue_count]).to eq(1)
    expect(briefing[:overdue_reminders].size).to eq(1)
    expect(briefing[:pending_reminders].size).to eq(1)
  end

  it "incluye oportunidades de la red del consultor en el alcance" do
    referred = create(:user, :consultant, tenant: tenant)
    create(:referral_network, tenant: tenant, referrer_user: consultant, referred_user: referred)
    create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage,
           owner_user: referred, temperature: "hot", bant_score: 90)

    briefing = build_for(consultant)

    expect(briefing[:kpis][:hot_count]).to eq(1)
    expect(briefing[:hot_leads].size).to eq(1)
    expect(briefing[:day_recommendation]).to include("lead caliente")
  end

  it "incluye recordatorios de opps de la red del consultor" do
    referred = create(:user, :consultant, tenant: tenant)
    create(:referral_network, tenant: tenant, referrer_user: consultant, referred_user: referred)
    opp = create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage, owner_user: referred)
    create(:reminder, tenant: tenant, user: referred, opportunity: opp,
           remind_at: 1.day.from_now, status: "pending")

    briefing = build_for(consultant)

    expect(briefing[:kpis][:pending_count]).to eq(1)
    expect(briefing[:pending_reminders].size).to eq(1)
  end
end
