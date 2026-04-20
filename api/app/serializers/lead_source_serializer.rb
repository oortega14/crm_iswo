# frozen_string_literal: true

class LeadSourceSerializer < ApplicationSerializer
  set_type :lead_source

  attributes :name, :kind, :active, :metadata

  attribute :opportunities_count do |ls|
    ls.opportunities.size
  end
end
