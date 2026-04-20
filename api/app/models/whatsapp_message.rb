# frozen_string_literal: true

# ============================================================================
# WhatsappMessage — log bidireccional de mensajes WhatsApp
# ============================================================================
class WhatsappMessage < ApplicationRecord
  include TenantScoped

  DIRECTIONS = %w[in out].freeze
  PROVIDERS  = %w[twilio whatsapp_cloud].freeze
  STATUSES   = %w[pending queued sent delivered read failed].freeze

  enum :direction, DIRECTIONS.zip(DIRECTIONS).to_h, prefix: true
  enum :provider,  PROVIDERS.zip(PROVIDERS).to_h,   prefix: true
  enum :status,    STATUSES.zip(STATUSES).to_h,     prefix: :status, default: "pending"

  belongs_to :tenant
  belongs_to :opportunity, optional: true
  belongs_to :contact, optional: true

  validates :direction,   inclusion: { in: DIRECTIONS }
  validates :provider,    inclusion: { in: PROVIDERS }
  validates :status,      inclusion: { in: STATUSES }
  validates :from_number, :to_number, presence: true
  validates :provider_message_id,
            uniqueness: { scope: :provider, allow_nil: true }

  scope :inbound,  -> { direction_in }
  scope :outbound, -> { direction_out }
  scope :recent,   -> { order(created_at: :desc) }
end
