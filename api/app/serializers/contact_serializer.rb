# frozen_string_literal: true

# ============================================================================
# ContactSerializer
# ============================================================================
# El teléfono se expone normalizado (E.164) y su versión mostrable.
# Los custom_fields se devuelven tal cual (el SPA los pinta dinámicamente).
# ============================================================================
class ContactSerializer < ApplicationSerializer
  set_type :contact

  attributes :kind, :first_name, :last_name, :email, :phone_e164,
             :company, :position, :city, :country,
             :notes, :custom_fields, :discarded_at

  attribute :source_kind do |c|
    c.has_attribute?(:source_kind) ? c[:source_kind] : nil
  end

  attribute :source_label do |c|
    c.has_attribute?(:source_label) ? c[:source_label] : nil
  end

  attribute :last_contacted_at do |c|
    c.respond_to?(:last_contacted_at) ? c.last_contacted_at : nil
  end

  attribute :full_name do |c|
    [c.first_name, c.last_name].compact.join(" ").strip.presence || c.company.presence || "—"
  end

  attribute :phone_display do |c|
    c.phone_e164.presence || c.phone_normalized.presence
  end

  attribute :opportunities_count do |c|
    c.opportunities.size
  end

  belongs_to :owner_user, serializer: :user, record_type: :user
  belongs_to :tenant,     serializer: :tenant
end
