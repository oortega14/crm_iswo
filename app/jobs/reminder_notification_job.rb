# frozen_string_literal: true

# ============================================================================
# ReminderNotificationJob — procesa recordatorios vencidos.
# ============================================================================
# Se corre cada minuto via sidekiq-scheduler (config/sidekiq.yml).
# Busca todos los Reminder con status="pending" y remind_at <= now,
# los envía por el canal indicado y los marca como sent / failed.
#
# Canales soportados:
#   email     → Postmark (ReminderMailer)
#   whatsapp  → WhatsappDeliveryJob (persiste outbound WhatsappMessage)
#   in_app    → solo se marca como sent (el SPA lo muestra via polling/ws)
#   sms       → TODO (Twilio)
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
      ReminderMailer.with(reminder: reminder).due_notification.deliver_later if defined?(ReminderMailer)
      reminder.mark_sent!
    when "whatsapp"
      enqueue_whatsapp(reminder)
    when "in_app"
      reminder.mark_sent!
    when "sms"
      Rails.logger.warn("[ReminderNotificationJob] SMS aún no implementado, marcando failed")
      reminder.mark_failed!("sms_not_implemented")
    else
      reminder.mark_failed!("channel_unknown:#{reminder.channel}")
    end
  end

  def enqueue_whatsapp(reminder)
    contact = reminder.opportunity&.contact || reminder.contact
    return reminder.mark_failed!("missing_contact") if contact.nil? || contact.phone_e164.blank?

    msg = reminder.tenant.whatsapp_messages.create!(
      contact:     contact,
      opportunity: reminder.opportunity,
      direction:   "out",
      provider:    ENV.fetch("WHATSAPP_PROVIDER", "twilio"),
      from_number: reminder.tenant.settings.dig("whatsapp", "number") || ENV.fetch("TWILIO_WHATSAPP_NUMBER", ""),
      to_number:   contact.phone_e164,
      body:        reminder.body.presence || reminder.title,
      status:      "queued"
    )
    WhatsappDeliveryJob.perform_later(msg.id)
    reminder.mark_sent!
  end
end
