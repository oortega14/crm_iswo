# frozen_string_literal: true

# ============================================================================
# LandingSubmissionProcessorJob — wrapper async para LandingSubmissionProcessor.
# ============================================================================
# El controller público encola este job y responde 201 inmediatamente; así
# el SPA no espera por la resolución de duplicados y creación de opp.
# ============================================================================
class LandingSubmissionProcessorJob < ApplicationJob
  queue_as :default

  def perform(submission_id)
    submission = LandingFormSubmission.find_by(id: submission_id)
    return unless submission

    ActsAsTenant.with_tenant(submission.tenant) do
      LandingSubmissionProcessor.new(submission).call
    end
  end
end
