# frozen_string_literal: true

FactoryBot.define do
  factory :user do
    tenant { Tenant.first || create(:tenant) }
    sequence(:email) { |n| "user#{n}@example.com" }
    name     { Faker::Name.name }
    password { "secret12345" }
    role     { "consultant" }
    active   { true }
    confirmed_at { Time.current }

    trait :admin       do role { "admin" } end
    trait :manager     do role { "manager" } end
    trait :consultant  do role { "consultant" } end
    trait :viewer      do role { "viewer" } end
    trait :unconfirmed do confirmed_at { nil } end
    trait :inactive    do active { false } end
  end
end
