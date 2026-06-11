# frozen_string_literal: true

# ============================================================================
# Reminder — recordatorio multi-canal ligado a una oportunidad
# ============================================================================
class Reminder < ApplicationRecord
  include TenantScoped

  CHANNELS = %w[email whatsapp in_app].freeze
  STATUSES = %w[pending processing sent failed done].freeze
  STAFF_RECIPIENT_ROLES = %w[admin manager consultant].freeze

  enum :channel, CHANNELS.zip(CHANNELS).to_h, prefix: true
  enum :status,  STATUSES.zip(STATUSES).to_h, prefix: true, default: "pending"

  belongs_to :tenant
  belongs_to :opportunity
  belongs_to :user

  validates :remind_at, presence: true
  validates :channel,   inclusion: { in: CHANNELS }
  validates :status,    inclusion: { in: STATUSES }
  validate  :user_must_be_staff_recipient

  # Minutos antes de remind_at para aviso "por vencer" (correo + campana).
  UPCOMING_NOTICE_MINUTES = ENV.fetch("REMINDER_UPCOMING_NOTICE_MINUTES", "30").to_i.clamp(5, 1440)

  # Si un recordatorio queda "processing" más de este tiempo (job caído a
  # mitad de camino), vuelve a considerarse vencido para reintentarlo.
  PROCESSING_STALE_AFTER = 5.minutes

  scope :due, lambda {
    where(remind_at: ..Time.current).where(
      "status = 'pending' OR (status = 'processing' AND updated_at < ?)",
      PROCESSING_STALE_AFTER.ago
    )
  }
  scope :upcoming, -> { status_pending.where("remind_at > ?", Time.current).order(:remind_at) }
  scope :due_for_upcoming_notice, lambda {
    window_end = Time.current + UPCOMING_NOTICE_MINUTES.minutes
    status_pending
      .where(upcoming_notified_at: nil)
      .where(remind_at: Time.current..window_end)
  }

  before_save :reset_upcoming_notice_if_rescheduled, if: :will_save_change_to_remind_at?

  # Reclama el recordatorio para despacho de forma atómica (UPDATE con WHERE
  # de estado), evitando que dos jobs (ReminderDueDispatchJob puntual y el
  # batch ReminderNotificationJob de cada minuto) lo entreguen dos veces.
  # @return [Boolean] true si esta llamada lo reclamó.
  def claim_for_dispatch!
    claimed = self.class
      .where(id: id)
      .where(
        "status = 'pending' OR (status = 'processing' AND updated_at < ?)",
        PROCESSING_STALE_AFTER.ago
      )
      .update_all(status: "processing", updated_at: Time.current) == 1

    reload if claimed
    claimed
  end

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

  def user_must_be_staff_recipient
    return if user.blank?

    return if STAFF_RECIPIENT_ROLES.include?(user.role)

    errors.add(:user, "debe ser admin, manager o consultor")
  end
end
