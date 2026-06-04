# frozen_string_literal: true

module Dashboard
  # Alcance de oportunidades y recordatorios para dashboard y briefing (RFC §6.3 / §6.4).
  # Misma lógica que policy_scope en DashboardController.
  class Scopes
    def initialize(user, tenant, pipeline_id: nil)
      @user        = user
      @tenant      = tenant
      @pipeline_id = pipeline_id.presence
    end

    def opportunities
      scope = OpportunityPolicy::Scope.new(@user, Opportunity.kept).resolve
      scope = scope.where(pipeline_id: @pipeline_id) if @pipeline_id
      scope
    end

    def reminders
      ReminderPolicy::Scope.new(@user, Reminder.all).resolve
    end
  end
end
