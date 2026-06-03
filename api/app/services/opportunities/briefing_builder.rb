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

    def initialize(user, tenant, opportunity_scope: nil, reminder_scope: nil)
      @user              = user
      @tenant            = tenant
      @opportunity_scope = opportunity_scope
      @reminder_scope    = reminder_scope
    end

    def call
      payload = {
        user:              @user,
        tenant:            @tenant,
        kpis:              build_kpis,
        hot_leads:         build_hot_leads,
        overdue_reminders: build_overdue_reminders,
        pending_reminders: build_pending_reminders,
        stale_leads:       build_stale_leads,
        generated_at:      Time.current
      }
      payload[:day_recommendation] = build_day_recommendation(payload)
      payload
    end

    def interesting?
      data = call
      data[:kpis][:total_open].positive? ||
        data[:kpis][:pending_count].positive? ||
        data[:overdue_reminders].any?
    end

    private

    def base_scope
      root = @opportunity_scope || default_opportunity_scope
      root.kept.where.not(status: %w[won lost merged])
    end

    def default_opportunity_scope
      scope = Opportunity.all
      return scope if @user.role.in?(%w[admin manager viewer])

      scope.where(owner_user_id: ConsultantNetworkAccess.visible_owner_ids(@user))
    end

    def opportunity_root_scope
      (@opportunity_scope || default_opportunity_scope).kept
    end

    def build_hot_leads
      base_scope
        .where(temperature: "hot")
        .order(bant_score: :desc)
        .limit(MAX_ITEMS)
        .includes(:contact, :pipeline_stage)
        .to_a
    end

    def reminder_scope
      @reminder_scope ||= ReminderPolicy::Scope.new(@user, Reminder.all).resolve
    end

    def pending_reminders_scope
      reminder_scope.status_pending
    end

    def build_overdue_reminders
      pending_reminders_scope
        .where(remind_at: ..Time.current)
        .order(:remind_at)
        .limit(MAX_ITEMS)
        .includes(:opportunity)
        .to_a
    end

    # Pendientes con fecha futura (misma bandeja que GET /reminders?status=pending)
    def build_pending_reminders
      pending_reminders_scope
        .where("remind_at > ?", Time.current)
        .order(:remind_at)
        .limit(MAX_ITEMS)
        .includes(:opportunity)
        .to_a
    end

    def build_stale_leads
      stale_days = @tenant.settings&.dig("stale_days").presence || 7
      base_scope
        .stale(stale_days.to_i)
        .where.not(last_activity_at: nil)
        .order(last_activity_at: :asc)
        .limit(MAX_ITEMS)
        .includes(:contact)
        .to_a
    end

    def build_kpis
      all = base_scope
      pending = pending_reminders_scope
      today_range = Time.zone.today.all_day
      month_start = Time.zone.now.beginning_of_month
      full = opportunity_root_scope
      month_won  = full.won.where(closed_at: month_start..)
      month_lost = full.lost.where(closed_at: month_start..)
      won_count  = month_won.count
      lost_count = month_lost.count
      decided    = won_count + lost_count
      win_rate   = decided.positive? ? (won_count.to_f / decided * 100).round(1) : nil
      bant_avg   = all.average(:bant_score)

      {
        total_open:          all.count,
        pipeline_value:      all.sum(:estimated_value).to_f,
        currency:            @tenant.currency,
        hot_count:           all.where(temperature: "hot").count,
        warm_count:          all.where(temperature: "warm").count,
        cold_count:          all.where(temperature: "cold").count,
        pending_count:       pending.count,
        overdue_count:       pending.where(remind_at: ..Time.current).count,
        today_count:         pending.where(remind_at: today_range).count,
        new_this_week:       all.where(created_at: 7.days.ago..).count,
        month_closed_value:  month_won.sum(:estimated_value).to_f,
        won_count:           won_count,
        lost_count:          lost_count,
        win_rate:            win_rate,
        bant_average:        bant_avg ? bant_avg.round.to_i : 0
      }
    end

    def build_day_recommendation(data)
      kpis = data[:kpis]
      if kpis[:overdue_count].to_i.positive?
        first = data[:overdue_reminders].first
        label = first&.subject.presence || "tu primer recordatorio vencido"
        n = kpis[:overdue_count]
        return "Prioridad de hoy: atiende #{n} recordatorio#{n == 1 ? '' : 's'} vencido#{n == 1 ? '' : 's'}. " \
               "Empieza por «#{label}»."
      end

      hot = data[:hot_leads].first
      if hot
        name = hot.contact&.display_name.presence || hot.title
        days = days_without_activity(hot)
        return "Prioridad de hoy: avanza el lead caliente «#{name}» " \
               "(BANT #{hot.bant_score}, #{days} día#{days == 1 ? '' : 's'} sin actividad)."
      end

      stale = data[:stale_leads].first
      if stale
        name = stale.contact&.display_name.presence || stale.title
        return "Prioridad de hoy: reactiva «#{name}» — lleva demasiado tiempo sin seguimiento."
      end

      if kpis[:total_open].to_i.zero?
        return "Prioridad de hoy: prospectar y registrar nuevos leads para alimentar el pipeline."
      end

      "Prioridad de hoy: revisa tus #{kpis[:total_open]} oportunidades abiertas y programa el próximo seguimiento."
    end

    def days_without_activity(opportunity)
      return 0 unless opportunity.last_activity_at

      ((Time.current - opportunity.last_activity_at) / 1.day).floor
    end
  end
end
