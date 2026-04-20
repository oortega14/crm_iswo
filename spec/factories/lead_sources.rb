# frozen_string_literal: true

FactoryBot.define do
  factory :lead_source do
    tenant { Tenant.first || create(:tenant) }
    sequence(:name) { |n| "Source #{n}" }
    kind   { "manual" }
    active { true }
  end
end
