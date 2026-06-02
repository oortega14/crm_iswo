# frozen_string_literal: true

# ============================================================================
# ReminderNotificationJob — procesa recordatorios vencidos.
# ============================================================================
# Se corre cada minuto via sidekiq-scheduler (config/sidekiq.yml).
# Busca todos los Reminder con status="pending" y remind_at <= now,
# los envía por el canal indicado y los marca como sent / failed.
#
# Canales soportados (RFC-001):
#   email     → Postmark (ReminderMailer) + notificación in-app
#   whatsapp  → WhatsappDeliveryJob + notificación in-app
#   in_app    → notificación in-app (campana del SPA)
# ============================================================================
class ReminderNotificationJob < ApplicationJob
  queue_as :critical

  BATCH_SIZE = 100

  def perform
    ActsAsTenant.without_tenant do
      Reminder.due.where(status: "pending").find_each(batch_size: BATCH_SIZE) do |reminder|
        ActsAsTenant.with_tenant(reminder.tenant) { dispatch(reminder) }
      rescue StandardError => e
        Rails.logger.error("[ReminderNotificationJob] reminder=#{reminder.id} #{e.class}: #{e.message}")
        reminder.mark_failed!(e.message.truncate(500))
      end
    end
  end

  private

  def dispatch(reminder)
    case reminder.channel
    when "email"
      deliver_email!(reminder)
    when "whatsapp"
      enqueue_whatsapp!(reminder)
    when "in_app"
      deliver_in_app!(reminder)
    else
      reminder.mark_failed!("channel_unknown:#{reminder.channel}")
    end
  end

  def deliver_email!(reminder)
    unless defined?(ReminderMailer)
      return reminder.mark_failed!("reminder_mailer_unavailable")
    end

    ReminderMailer.with(reminder: reminder).due_notification.deliver_now
    return reminder.mark_failed!("missing_opportunity") unless notify_in_app!(reminder)

    reminder.mark_sent!
  end

  def deliver_in_app!(reminder)
    return reminder.mark_failed!("missing_opportunity") unless notify_in_app!(reminder)

    reminder.mark_sent!
  end

  def notify_in_app!(reminder)
    Notifications::ReminderDueNotifier.call(reminder: reminder)
  end

  def enqueue_whatsapp!(reminder)
    contact = reminder.opportunity&.contact
    return reminder.mark_failed!("missing_contact") if contact.nil? || contact.phone_e164.blank?

    tenant = reminder.tenant
    provider = tenant.whatsapp_outbound_provider
    from     = tenant.whatsapp_outbound_from_number_for(provider)

    msg = tenant.whatsapp_messages.create!(
      contact:     contact,
      opportunity: reminder.opportunity,
      direction:   "out",
      provider:    provider,
      from_number: from,
      to_number:   contact.phone_e164,
      body:        reminder.message.presence || reminder.subject,
      status:      "queued"
    )
    return reminder.mark_failed!("missing_opportunity") unless notify_in_app!(reminder)

    WhatsappDeliveryJob.perform_later(msg.id, reminder.id)
  end
end
