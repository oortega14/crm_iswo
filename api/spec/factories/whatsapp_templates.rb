# frozen_string_literal: true

FactoryBot.define do
  factory :whatsapp_template do
    tenant { Tenant.first || create(:tenant) }
    sequence(:name) { |n| "Plantilla #{n}" }
    sequence(:meta_template_name) { |n| "plantilla_#{n}" }
    language { "es_CO" }
    variable_labels { [] }
    active { true }
  end
end
