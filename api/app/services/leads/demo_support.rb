# frozen_string_literal: true

module Leads
  # Lógica compartida: recordatorios y duplicate_flags para datos demo.
  module DemoSupport
    REMINDER_CHANNELS = %w[email whatsapp in_app email whatsapp].freeze
    DEMO_EMAIL_PATTERN = "%@leads.iswo.test"

    def attach_demo_reminder!(opp, index)
      remind_at = case index % 5
                  when 0 then 3.hours.from_now
                  when 1 then 2.hours.ago
                  when 2 then 1.day.from_now
                  when 3 then 1.day.ago
                  else 2.days.from_now
                  end

      channel = REMINDER_CHANNELS[index % REMINDER_CHANNELS.size]
      assignee = opp.owner_user || staff_user_for(opp.tenant)
      raise "sin usuario para recordatorio" unless assignee

      opp.reminders.create!(
        tenant:    opp.tenant,
        user:      assignee,
        channel:   channel,
        subject:   "Seguimiento demo lead #{(index % 5) + 1}",
        message:   "Contactar a #{opp.contact&.first_name || 'cliente'} — pack demo",
        remind_at: remind_at,
        status:    "pending"
      )

      label = remind_at < Time.current ? "recordatorio vencido" : "recordatorio"
      "#{label} (#{channel})"
    end

    def flag_demo_duplicates!(tenant, new_opp, contact, detected_by)
      return nil if new_opp.blank? || contact.blank? || detected_by.blank?

      existing_opps = tenant.opportunities.kept
                            .where(contact_id: contact.id)
                            .where.not(id: new_opp.id)
                            .where.not(status: %w[won lost merged])

      created = 0
      existing_opps.find_each do |existing|
        flags = DuplicateFlag.where(tenant_id: tenant.id)
        next if flags.exists?(opportunity_id: new_opp.id, duplicate_of_opportunity_id: existing.id)
        next if flags.exists?(opportunity_id: existing.id, duplicate_of_opportunity_id: new_opp.id)

        flag = DuplicateFlag.create!(
          tenant:                   tenant,
          opportunity:              new_opp,
          duplicate_of_opportunity: existing,
          detected_by_user:         detected_by,
          matched_on:               duplicate_matched_on(contact),
          match_score:              1.0
        )
        notify_duplicate_found!(flag, existing)
        created += 1
      end

      created.positive? ? "dup flag ×#{created}" : nil
    end

    def duplicate_matched_on(contact)
      if contact.email.present? && contact.phone_e164.present?
        "both"
      elsif contact.phone_e164.present?
        "phone"
      else
        "email"
      end
    end

    def notify_duplicate_found!(flag, existing_opp)
      owner = existing_opp.owner_user
      return unless owner

      Notification.create!(
        tenant:   flag.tenant,
        user:     owner,
        kind:     "duplicate_found",
        title:    "Posible duplicado detectado",
        body:     "Lead demo: nueva oportunidad ##{flag.opportunity_id} colisiona con tu opp ##{existing_opp.id}.",
        resource: existing_opp
      )
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn("[DemoSupport] duplicate notification: #{e.message}")
    end

    def staff_user_for(tenant)
      tenant.users.kept.where(role: %w[admin manager], active: true).order(:role).first ||
        tenant.users.kept.where(role: "admin").first
    end

    def demo_opportunities(tenant)
      tenant.opportunities.kept
            .joins(:contact)
            .where("contacts.email LIKE ?", DEMO_EMAIL_PATTERN)
            .includes(:contact, :owner_user, :pipeline, :pipeline_stage, :lead_source, :reminders)
            .order(:id)
    end
  end
end
