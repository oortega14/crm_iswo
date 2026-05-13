# frozen_string_literal: true

FactoryBot.define do
  factory :export do
    tenant   { Tenant.first || create(:tenant) }
    user     { association :user, tenant: tenant }
    resource { "contacts" }
    format   { "xlsx" }
    status   { "queued" }
    filters  { {} }

    trait :ready do
      status     { "succeeded" }
      file_url   { "https://cdn.example.com/exports/file.xlsx" }
      file_size  { 1024 }
      finished_at { Time.current }
      expires_at  { 7.days.from_now }
    end

    trait :failed do
      status        { "failed" }
      error_message { "boom" }
      finished_at   { Time.current }
    end
  end
end
