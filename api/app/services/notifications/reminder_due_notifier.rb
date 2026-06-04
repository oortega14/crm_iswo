# frozen_string_literal: true

module Notifications
  # Crea notificación in-app cuando un recordatorio vence (campana del SPA).
  class ReminderDueNotifier
    CHANNEL_LABELS = {
      "email"    => "correo",
      "whatsapp" => "WhatsApp",
      "in_app"   => "app"
    }.freeze

    def self.call(reminder:)
      new(reminder: reminder).call
    end

    def initialize(reminder:)
      @reminder = reminder
    end

    # @return [Boolean] true si se creó la notificación; false si faltaba oportunidad/usuario
    def call
      opportunity = @reminder.opportunity
      user        = @reminder.user
      return false if opportunity.nil? || user.nil?

      Notification.create!(
        tenant:   @reminder.tenant,
        user:     user,
        kind:     "reminder_due",
        title:    @reminder.subject.presence || "Recordatorio vencido",
        body:     build_body(opportunity),
        resource: opportunity
      )
      true
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn(
        "[Notification] reminder_due reminder=#{@reminder.id}: #{e.message}"
      )
      false
    end

    private

    def build_body(opportunity)
      label   = opportunity.contact&.display_name.presence || opportunity.title
      channel = CHANNEL_LABELS[@reminder.channel] || @reminder.channel
      detail  = @reminder.message.presence

      parts = ["Recordatorio de «#{label}»"]
      parts << "(también enviado por #{channel})" unless @reminder.channel_in_app?
      parts << "— #{detail}" if detail
      parts.join(" ")
    end
  end
end
