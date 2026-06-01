# frozen_string_literal: true

FactoryBot.define do
  factory :opportunity_log do
    tenant      { Tenant.first || create(:tenant) }
    opportunity { association :opportunity, tenant: tenant }
    user        { association :user, tenant: tenant }
    action      { "note" }
    note        { "Nota de prueba" }
    ip_address  { "127.0.0.1" }
  end
end
