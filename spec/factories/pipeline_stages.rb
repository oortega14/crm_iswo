# frozen_string_literal: true

FactoryBot.define do
  factory :pipeline_stage do
    tenant   { pipeline&.tenant || Tenant.first || create(:tenant) }
    pipeline { Pipeline.first || create(:pipeline) }
    sequence(:name) { |n| "Stage #{n}" }
    sequence(:position)
    probability { 50 }
    closed_won  { false }
    closed_lost { false }
    color       { "#888888" }

    trait :won  do closed_won  { true } end
    trait :lost do closed_lost { true } end
  end
end
