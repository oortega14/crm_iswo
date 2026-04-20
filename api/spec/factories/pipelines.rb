# frozen_string_literal: true

FactoryBot.define do
  factory :pipeline do
    tenant { Tenant.first || create(:tenant) }
    sequence(:name) { |n| "Pipeline #{n}" }
    description     { "Pipeline de prueba" }
    is_default      { false }
    position        { 0 }
    active          { true }

    trait :default do
      is_default { true }
    end

    # Pipeline con 3 etapas ordenadas: discovery → proposal → closed_won.
    factory :pipeline_with_stages do
      after(:create) do |pipeline|
        create(:pipeline_stage, pipeline: pipeline, name: "Discovery", position: 0, probability: 20)
        create(:pipeline_stage, pipeline: pipeline, name: "Proposal",  position: 1, probability: 60)
        create(:pipeline_stage, :won, pipeline: pipeline, name: "Closed Won", position: 2, probability: 100)
      end
    end
  end
end
