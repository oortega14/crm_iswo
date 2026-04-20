# frozen_string_literal: true

FactoryBot.define do
  factory :landing_form_submission do
    tenant       { Tenant.first || create(:tenant) }
    landing_page { association :landing_page, tenant: tenant }
    payload      { { "name" => Faker::Name.name, "email" => Faker::Internet.email, "phone" => "+573001112233" } }
    utm_source   { "google" }
    utm_medium   { "cpc" }
    utm_campaign { "spring-sale" }
    ip_address   { "127.0.0.1" }
    user_agent   { "RSpec" }
  end
end
