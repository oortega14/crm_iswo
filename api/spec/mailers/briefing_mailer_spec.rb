# frozen_string_literal: true

require "rails_helper"

RSpec.describe BriefingMailer, type: :mailer do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user) { create(:user, :admin, tenant: tenant, email: "briefing-test@example.com") }
  let!(:pipeline) { create(:pipeline, tenant: tenant, is_default: true) }
  let!(:stage) { create(:pipeline_stage, pipeline: pipeline, tenant: tenant, position: 1) }

  before do
    opp = create(:opportunity, :skip_bant_recalc,
                 tenant: tenant, pipeline: pipeline, pipeline_stage: stage, owner_user: user)
    opp.update_columns(temperature: "hot", bant_score: 75)
  end

  it "envía el briefing diario al email del usuario" do
    ActsAsTenant.with_tenant(tenant) do
      briefing = Opportunities::BriefingBuilder.new(user, tenant).call
      mail = described_class.with(briefing: briefing).daily_briefing

      expect { mail.deliver_now }.to change { ActionMailer::Base.deliveries.size }.by(1)

      expect(mail.to).to eq([user.email])
      expect(mail.subject).to include("briefing")
      decoded = mail.text_part&.decoded || mail.body.decoded
      expect(decoded).to include("KPIs").or include("Oportunidades abiertas")
    end
  end
end
