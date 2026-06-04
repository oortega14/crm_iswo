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

  # Minutos antes de remind_at para aviso "por vencer" (correo + campana).
  UPCOMING_NOTICE_MINUTES = ENV.fetch("REMINDER_UPCOMING_NOTICE_MINUTES", "30").to_i.clamp(5, 1440)

  scope :due,      -> { status_pending.where(remind_at: ..Time.current) }
  scope :upcoming, -> { status_pending.where("remind_at > ?", Time.current).order(:remind_at) }
  scope :due_for_upcoming_notice, lambda {
    window_end = Time.current + UPCOMING_NOTICE_MINUTES.minutes
    status_pending
      .where(upcoming_notified_at: nil)
      .where(remind_at: Time.current..window_end)
  }

  before_save :reset_upcoming_notice_if_rescheduled, if: :will_save_change_to_remind_at?

  def mark_sent!
    update!(status: "sent", sent_at: Time.current)
  end

  def mark_failed!(error)
    update!(status: "failed", last_error: error.to_s, attempts: attempts + 1)
  end

  def mark_upcoming_notified!
    update!(upcoming_notified_at: Time.current)
  end

  def reset_upcoming_notice_if_rescheduled
    self.upcoming_notified_at = nil
  end
end
