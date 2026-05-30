# frozen_string_literal: true

FactoryBot.define do
  factory :referral_network do
    tenant { ActsAsTenant.current_tenant || Tenant.first || create(:tenant) }
    referrer_user { association :user, :consultant, tenant: tenant }
    referred_user { association :user, :consultant, tenant: tenant }
    depth { 1 }
    active { true }
  end
end
