# frozen_string_literal: true

# Vista mínima para anidar en Reminder (evita recursión Opportunity → reminders → Opportunity).
class OpportunitySummarySerializer < ApplicationSerializer
  set_type :opportunity

  attributes :title, :status, :estimated_value, :currency

  attribute :contact_name do |o|
    o.contact&.display_name
  end
end
