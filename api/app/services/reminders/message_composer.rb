# frozen_string_literal: true

module Reminders
  # Textos unificados para recordatorios al consultor (WhatsApp, campana, etc.).
  class MessageComposer
    def self.for(reminder)
      new(reminder)
    end

    def initialize(reminder)
      @reminder = reminder
    end

    # Mensaje WhatsApp al vencer (consultor asignado).
    def due_whatsapp
      sections = []
      sections << "🔔 Recordatorio vencido"
      sections << tenant_label if tenant_label.present?
      sections << ""
      sections << "Tarea: #{@reminder.subject}" if @reminder.subject.present?
      sections << "Lead: #{lead_label}" if lead_label.present?
      sections << "Vence: #{formatted_remind_at}" if @reminder.remind_at.present?
      if detail_notes.present?
        sections << ""
        sections << "Notas:"
        sections << detail_notes
      end
      sections << ""
      sections << "Marca completado en el CRM cuando lo atiendas."
      sections.compact.join("\n")
    end

    # Cuerpo de notificación in-app al vencer.
    def due_in_app(channel: @reminder.channel)
      labels = {
        "email"    => "correo",
        "whatsapp" => "WhatsApp",
        "in_app"   => "campana del CRM"
      }
      channel_label = labels[channel] || channel

      parts = ["Recordatorio vencido sobre «#{lead_label}»"]
      parts << "(también por #{channel_label})" unless channel == "in_app"
      parts << "— #{detail_notes}" if detail_notes.present?
      parts.join(" ")
    end

    def lead_label
      opportunity = @reminder.opportunity
      return nil if opportunity.nil?

      opportunity.contact&.display_name.presence || opportunity.title
    end

    private

    def tenant_label
      @reminder.tenant&.name.presence
    end

    def detail_notes
      msg = @reminder.message.to_s.strip
      return nil if msg.blank?

      subj = @reminder.subject.to_s.strip
      return nil if subj.present? && msg.casecmp?(subj)

      msg
    end

    def formatted_remind_at
      I18n.l(@reminder.remind_at, format: :short)
    rescue StandardError
      @reminder.remind_at.to_s
    end
  end
end
