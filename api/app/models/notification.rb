# frozen_string_literal: true

# ============================================================================
# Notification — registro de notificación in-app por usuario
# ============================================================================
# Se crea desde:
#   - ReminderNotificationJob (canal in_app)
# Se consume desde:
#   - GET /api/v1/notifications
# ============================================================================
class Notification < ApplicationRecord
  include TenantScoped

  KINDS = %w[reminder_due new_lead stage_change duplicate_found].freeze
  enum :kind, KINDS.zip(KINDS).to_h, prefix: true, default: "reminder_due"

  belongs_to :tenant
  belongs_to :user
  belongs_to :resource, polymorphic: true, optional: true

  validates :title, presence: true
  validates :kind, inclusion: { in: KINDS }

  scope :unread,  -> { where(read_at: nil) }
  scope :recent,  -> { order(created_at: :desc) }

  def read?
    read_at.present?
  end

  def mark_read!
    update!(read_at: Time.current) unless read?
  end
end
