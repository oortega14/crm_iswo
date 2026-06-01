# frozen_string_literal: true

FactoryBot.define do
  factory :notification do
    tenant { Tenant.first || create(:tenant) }
    user   { association :user, tenant: tenant }
    kind   { "reminder_due" }
    title  { "Recordatorio vencido" }
    body   { "Tienes un recordatorio pendiente" }
  end
end
