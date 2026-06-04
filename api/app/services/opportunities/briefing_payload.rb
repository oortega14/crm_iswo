# frozen_string_literal: true

module Opportunities
  # Serializa el hash de BriefingBuilder para GET /dashboard/briefing.
  class BriefingPayload
    def self.from(briefing)
      new(briefing).as_json
    end

    def initialize(briefing)
      @briefing = briefing
    end

    def as_json
      {
        generated_at: @briefing[:generated_at].iso8601,
        day_recommendation: @briefing[:day_recommendation],
        kpis: @briefing[:kpis],
        hot_leads: serialize_opportunities(@briefing[:hot_leads]),
        overdue_reminders: serialize_reminders(@briefing[:overdue_reminders]),
        pending_reminders: serialize_reminders(@briefing[:pending_reminders]),
        stale_leads: serialize_stale(@briefing[:stale_leads])
      }
    end

    private

    def serialize_opportunities(relation)
      Array(relation).map do |opp|
        days = days_without_activity(opp)
        {
          id: opp.id.to_s,
          title: opp.title,
          contact_name: opp.contact&.display_name,
          bant_score: opp.bant_score,
          temperature: opp.temperature,
          stage_name: opp.pipeline_stage&.name,
          estimated_value: opp.estimated_value.to_f,
          currency: opp.currency,
          updated_at: opp.updated_at&.iso8601,
          last_activity_at: opp.last_activity_at&.iso8601,
          days_without_activity: days,
          custom_fields: opp.custom_fields.presence
        }
      end
    end

    def days_without_activity(opp)
      return nil unless opp.last_activity_at

      ((Time.current - opp.last_activity_at) / 1.day).floor
    end

    def serialize_stale(relation)
      Array(relation).map do |opp|
        {
          id: opp.id.to_s,
          title: opp.title,
          contact_name: opp.contact&.display_name,
          last_activity_at: opp.last_activity_at&.iso8601,
          stage_name: opp.pipeline_stage&.name,
          custom_fields: opp.custom_fields.presence
        }
      end
    end

    def serialize_reminders(relation)
      Array(relation).map do |reminder|
        {
          id: reminder.id.to_s,
          subject: reminder.subject,
          remind_at: reminder.remind_at.iso8601,
          opportunity_id: reminder.opportunity_id&.to_s,
          opportunity_title: reminder.opportunity&.title
        }
      end
    end
  end
end
