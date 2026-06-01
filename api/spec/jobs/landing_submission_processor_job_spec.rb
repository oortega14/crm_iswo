# frozen_string_literal: true

require "rails_helper"

RSpec.describe LandingSubmissionProcessorJob, type: :job do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:landing)    { create(:landing_page, tenant: tenant, slug: "test-landing") }
  let!(:_pipeline) { create(:pipeline_with_stages, tenant: tenant, is_default: true) }
  let!(:_consul)   { create(:user, :consultant, tenant: tenant) }
  let!(:submission) do
    create(:landing_form_submission, tenant: tenant, landing_page: landing,
           payload: { "full_name" => "Test Lead", "email" => "lead@t.co" })
  end

  describe "#perform" do
    it "procesa el submission llamando a LandingSubmissionProcessor" do
      expect_any_instance_of(LandingSubmissionProcessor).to receive(:call).and_return(true)
      described_class.new.perform(submission.id)
    end

    it "no lanza error si el submission no existe" do
      expect { described_class.new.perform(0) }.not_to raise_error
    end

    it "crea el contacto y la oportunidad en el tenant correcto" do
      expect {
        described_class.new.perform(submission.id)
      }.to change { ActsAsTenant.with_tenant(tenant) { Contact.count } }.by(1)
       .and change { ActsAsTenant.with_tenant(tenant) { Opportunity.count } }.by(1)
    end

    it "marca el submission como procesado" do
      described_class.new.perform(submission.id)
      expect(submission.reload.processed_at).to be_within(5.seconds).of(Time.current)
    end
  end
end
