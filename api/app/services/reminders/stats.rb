# frozen_string_literal: true

module Reminders
  # Conteos para GET /reminders/stats (mismo policy_scope que index y briefing).
  class Stats
    def initialize(user:)
      @user = user
    end

    def call
      pending = scoped.status_pending
      today_range = Time.zone.today.all_day

      {
        pending: pending.count,
        overdue: pending.where(remind_at: ..Time.current).count,
        today:   pending.where(remind_at: today_range).count,
        done:    scoped.status_done.count
      }
    end

    private

    def scoped
      ReminderPolicy::Scope.new(@user, Reminder.all).resolve
    end
  end
end
