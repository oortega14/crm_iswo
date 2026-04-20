# frozen_string_literal: true

FactoryBot.define do
  factory :duplicate_flag do
    tenant      { Tenant.first || create(:tenant) }
    opportunity { association :opportunity, tenant: tenant }
    duplicate_of_opportunity { association :opportunity, tenant: tenant }
    detected_by_user { association :user, tenant: tenant }
    matched_on  { "phone_exact" }
    match_score { 1.0 }
    resolution  { "pending" }
  end
end
