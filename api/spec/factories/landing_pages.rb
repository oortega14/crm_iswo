# frozen_string_literal: true

FactoryBot.define do
  factory :landing_page do
    tenant { Tenant.first || create(:tenant) }
    sequence(:title) { |n| "Landing #{n}" }
    sequence(:slug)  { |n| "landing-#{n}" }
    seo_title       { "Landing SEO" }
    seo_description { "Descripción SEO" }
    published { false }
    content   { {} }
    styles    { {} }
    view_count { 0 }
    lead_count { 0 }

    trait :published do
      published { true }
      published_at { Time.current }
    end
  end
end
