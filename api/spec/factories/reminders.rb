# frozen_string_literal: true

FactoryBot.define do
  factory :reminder do
    tenant      { Tenant.first || create(:tenant) }
    opportunity { association :opportunity, tenant: tenant }
    user        { association :user, tenant: tenant }
    channel     { "email" }
    subject     { "Seguimiento" }
    message     { "Tocar base con el cliente." }
    remind_at   { 1.day.from_now }
    status      { "pending" }

    trait :done  do status { "done"  } end
    trait :email do channel { "email" } end
    trait :whatsapp do channel { "whatsapp" } end
  end
end
