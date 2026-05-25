# frozen_string_literal: true

module Opportunities
  # ============================================================================
  # BriefingBuilder — arma el resumen diario de un usuario.
  #
  # Retorna un hash con:
  #   :user, :tenant, :kpis, :hot_leads, :overdue_reminders,
  #   :stale_leads, :generated_at
  #
  # Debe llamarse dentro de un bloque ActsAsTenant.with_tenant ya activo.
  # ============================================================================
  class BriefingBuilder
    MAX_ITEMS = 5

    def initialize(user, tenant)
      @user   = user
      @tenant = tenant
    end

    def call
      {
        user:              @user,
        tenant:            @tenant,
        kpis:              build_kpis,
        hot_leads:         build_hot_leads,
        overdue_reminders: build_overdue_reminders,
        stale_leads:       build_stale_leads,
        generated_at:      Time.current
      }
    end

    def interesting?
      data = call
      data[:kpis][:total_open] > 0 || data[:overdue_reminders].any?
    end

    private

    def base_scope
      scope = Opportunity.kept.where.not(status: %w[won lost merged])
      @user.role_admin? || @user.role_manager? ? scope : scope.where(owner_user_id: @user.id)
    end

    def build_hot_leads
      base_scope
        .where(temperature: "hot")
        .order(bant_score: :desc)
        .limit(MAX_ITEMS)
        .includes(:contact, :pipeline_stage)
    end

    def build_overdue_reminders
      Reminder
        .where(user: @user, status: "pending")
        .where(remind_at: ..Time.current)
        .order(:remind_at)
        .limit(MAX_ITEMS)
        .includes(:opportunity)
    end

    def build_stale_leads
      stale_days = @tenant.settings&.dig("stale_days").presence || 7
      base_scope
        .stale(stale_days.to_i)
        .where.not(last_activity_at: nil)
        .order(last_activity_at: :asc)
        .limit(MAX_ITEMS)
        .includes(:contact)
    end

    def build_kpis
      all = base_scope
      {
        total_open:    all.count,
        pipeline_value: all.sum(:estimated_value).to_f,
        currency:      @tenant.currency,
        hot_count:     all.where(temperature: "hot").count,
        warm_count:    all.where(temperature: "warm").count,
        cold_count:    all.where(temperature: "cold").count,
        overdue_count: Reminder.where(user: @user, status: "pending")
                               .where(remind_at: ..Time.current).count,
        new_this_week: all.where(created_at: 7.days.ago..).count
      }
    end
  end
end
