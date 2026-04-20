# frozen_string_literal: true

FactoryBot.define do
  factory :tenant do
    sequence(:name) { |n| "Tenant #{n}" }
    sequence(:slug) { |n| "tenant-#{n}" }
    timezone { "America/Bogota" }
    locale   { "es-CO" }
    currency { "COP" }
    active   { true }
    settings { {} }

    trait :iswo do
      name { "ISWO" }
      slug { "iswo" }
    end

    trait :discarded do
      discarded_at { Time.current }
    end
  end
end
