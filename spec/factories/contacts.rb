# frozen_string_literal: true

FactoryBot.define do
  factory :contact do
    tenant { Tenant.first || create(:tenant) }
    kind   { "person" }
    first_name { Faker::Name.first_name }
    last_name  { Faker::Name.last_name }
    email      { Faker::Internet.unique.email }
    country    { "CO" }
    phone_e164 { "+57300#{rand(1_000_000..9_999_999)}" }

    trait :company do
      kind         { "company" }
      first_name   { nil }
      last_name    { nil }
      company_name { Faker::Company.name }
    end

    trait :without_phone do
      phone_e164       { nil }
      phone_normalized { nil }
    end
  end
end
