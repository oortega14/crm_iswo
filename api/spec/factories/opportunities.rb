# frozen_string_literal: true

FactoryBot.define do
  factory :opportunity do
    tenant         { Tenant.first || create(:tenant) }
    contact        { association :contact, tenant: tenant }
    pipeline       { association :pipeline, tenant: tenant }
    pipeline_stage { association :pipeline_stage, tenant: tenant, pipeline: pipeline }
    owner_user     { association :user, tenant: tenant }
    lead_source    { nil }

    title             { Faker::Company.buzzword + " deal" }
    status            { "new_lead" }
    estimated_value   { 5_000_000 }
    currency          { "COP" }
    bant_score        { 0 }
    bant_data         { {} }
    custom_fields     { {} }
    expected_close_date { 30.days.from_now.to_date }
    last_activity_at  { Time.current }

    trait :won  do status { "won"  } end
    trait :lost do status { "lost" } end

    trait :stale do
      last_activity_at { 30.days.ago }
    end
  end
end
