# frozen_string_literal: true

class LandingFormSubmissionSerializer < ApplicationSerializer
  set_type :landing_form_submission

  attributes :payload, :utm_source, :utm_medium, :utm_campaign,
             :utm_term, :utm_content, :ip_address, :user_agent,
             :processed_at, :process_error

  belongs_to :landing_page, serializer: :landing_page
  belongs_to :contact,      serializer: :contact
  belongs_to :opportunity,  serializer: :opportunity
end
