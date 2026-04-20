# frozen_string_literal: true

# ============================================================================
# Reminder — recordatorio multi-canal ligado a una oportunidad
# ============================================================================
class Reminder < ApplicationRecord
  include TenantScoped

  CHANNELS = %w[email whatsapp in_app].freeze
  STATUSES = %w[pending sent failed done].freeze

  enum :channel, CHANNELS.zip(CHANNELS).to_h, prefix: true
  enum :status,  STATUSES.zip(STATUSES).to_h, prefix: true, default: "pending"

  belongs_to :tenant
  belongs_to :opportunity
  belongs_to :user

  validates :remind_at, presence: true
  validates :channel,   inclusion: { in: CHANNELS }
  validates :status,    inclusion: { in: STATUSES }

  scope :due,      -> { status_pending.where(remind_at: ..Time.current) }
  scope :upcoming, -> { status_pending.where("remind_at > ?", Time.current).order(:remind_at) }

  def mark_sent!
    update!(status: "sent", sent_at: Time.current)
  end

  def mark_failed!(error)
    update!(status: "failed", last_error: error.to_s, attempts: attempts + 1)
  end
end
