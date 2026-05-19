# frozen_string_literal: true

module Api
  module V1
    # ======================================================================
    # DashboardController — KPIs para el home del SPA.
    # Respetamos policy_scope de oportunidades y recordatorios (consultor vs admin).
    # ======================================================================
    class DashboardController < BaseController
      def kpis
        authorize Opportunity, :index?

        scope = policy_scope(Opportunity).kept

        open_scope   = scope.open
        total        = open_scope.count
        pipe_value   = open_scope.sum(:estimated_value).to_f

        start_month  = Time.current.beginning_of_month
        closed_value = scope.won.where("closed_at >= ?", start_month).sum(:estimated_value).to_f

        avg          = scope.average(:bant_score)
        bant_avg     = avg ? avg.round.to_i : 0

        render json: {
          data: {
            total_in_pipeline:  total,
            pipeline_value:     pipe_value,
            month_closed_value: closed_value,
            bant_average:       bant_avg
          }
        }, status: :ok
      end

      def pipeline
        authorize Opportunity, :index?

        pipe = resolve_dashboard_pipeline
        return render json: { data: [] }, status: :ok if pipe.blank?

        stages = pipe.pipeline_stages.order(:position).to_a
        return render json: { data: [] }, status: :ok if stages.blank?

        opps      = policy_scope(Opportunity).kept.where(pipeline_id: pipe.id)
        counts    = opps.group(:pipeline_stage_id).count
        value_sums = opps.group(:pipeline_stage_id).sum(:estimated_value)

        payload = stages.map.with_index do |stage, idx|
          c      = counts[stage.id].to_i
          raw_sum = value_sums[stage.id]
          v      = raw_sum.respond_to?(:to_f) ? raw_sum.to_f : raw_sum.to_i
          conversion =
            if idx < stages.size - 1 && c.positive?
              nxt_count = counts[stages[idx + 1].id].to_i
              (nxt_count.to_f / c * 100).round(1)
            else
              0.0
            end

          {
            stage: stage.name,
            stage_id: stage.id.to_s,
            count: c,
            value: v,
            conversion_rate: conversion
          }
        end

        render json: { data: payload }, status: :ok
      end

      def activity
        authorize Opportunity, :index?
        authorize Reminder, :index?

        today = Time.zone.today.all_day

        logs = OpportunityLog
               .includes(:user, opportunity: [:lead_source])
               .joins(:opportunity)
               .merge(policy_scope(Opportunity).kept)
               .where(action: %w[create stage_change])
               .where(created_at: today)
               .recent
               .limit(40)

        reminders = policy_scope(Reminder).status_pending
                        .includes(:user, opportunity: [])
                        .where(remind_at: today)
                        .order(:remind_at)
                        .limit(40)

        stage_labels_hash = pipeline_stage_labels

        from_logs = logs.filter_map { |log| activity_from_log(log, stage_labels_hash) }

        from_reminders = reminders.map do |r|
          {
            id: "reminder_#{r.id}",
            type: "reminder_due",
            user_name: r.user&.name.presence || "Usuario",
            user_avatar: r.user&.avatar_url,
            opportunity_id: r.opportunity_id.to_s,
            opportunity_name: r.opportunity&.title.presence || "Oportunidad",
            created_at: r.remind_at.iso8601
          }
        end

        merged = (from_logs + from_reminders).sort_by { |h| Time.zone.parse(h[:created_at]).to_i }.reverse
        render json: { data: merged.first(40) }, status: :ok
      end

      def bant_distribution
        authorize Opportunity, :index?

        scope        = policy_scope(Opportunity).kept
        low          = scope.where(bant_score: ...40).count
        medium       = scope.where(bant_score: 40...70).count
        high         = scope.where(bant_score: 70..).count
        avg          = scope.average(:bant_score)
        average      = avg ? avg.round.to_i : 0

        render json: { data: { low: low, medium: medium, high: high, average: average } }, status: :ok
      end

      def top_consultants
        authorize Opportunity, :index?

        start_month = Time.current.beginning_of_month
        tuples = policy_scope(Opportunity).kept.won
                  .where("closed_at >= ?", start_month)
                  .group(:owner_user_id)
                  .pluck(
                    :owner_user_id,
                    Arel.sql("COUNT(*)"),
                    Arel.sql("COALESCE(SUM(estimated_value), 0)")
                  )

        ranked = tuples.sort_by { |(_, count, _)| -count.to_i }.first(5)
        owner_ids = ranked.map(&:first)
        users     = User.where(id: owner_ids).index_by(&:id)

        payload = ranked.map do |owner_id, won_count, total_value|
          u = users[owner_id]
          {
            id: u&.id&.to_s || owner_id.to_s,
            name: u&.name.presence || "Consultor #{owner_id}",
            avatar_url: u&.avatar_url,
            won_count: won_count.to_i,
            total_value: total_value.to_f.to_i
          }
        end

        render json: { data: payload }, status: :ok
      end

      private

      def resolve_dashboard_pipeline
        if params[:pipeline_id].present?
          return current_tenant.pipelines.kept.find(params[:pipeline_id])
        end

        current_tenant.pipelines.kept.order(Arel.sql("is_default DESC NULLS LAST"), :created_at).first
      end

      def pipeline_stage_labels
        current_tenant.pipeline_stages.pluck(:id, :name).to_h.stringify_keys
      end

      def activity_from_log(log, stages_by_id_and_key)
        opportunity = log.opportunity
        return unless opportunity

        base = {
          user_name: log.user&.name.presence || "Sistema",
          user_avatar: log.user&.avatar_url,
          opportunity_id: opportunity.id.to_s,
          opportunity_name: opportunity.title,
          created_at: log.created_at.iso8601
        }

        cd = stringify_keys(log.changes_data)

        case log.action
        when "stage_change"
          from_id = cd["from_stage_id"]
          to_id   = cd["to_stage_id"]
          {
            id: "log_#{log.id}",
            type: "stage_change",
            old_value: stage_label(stages_by_id_and_key, from_id),
            new_value: stage_label(stages_by_id_and_key, to_id),
            **base
          }
        when "create"
          {
            id: "log_#{log.id}",
            type: "new_lead",
            source: activity_source_for(log, opportunity, cd),
            **base
          }
        end
      end

      def activity_source_for(_log, opportunity, cd)
        opportunity.lead_source&.name.presence ||
          landing_source_label(cd["landing_id"]) ||
          landing_source_label(cd["landing_page_id"])
      end

      def landing_source_label(landing_page_id)
        return if landing_page_id.blank?

        title = LandingPage.where(tenant_id: current_tenant.id).where(id: landing_page_id.to_i).pick(:title)
        title.present? ? "Landing: #{title}" : nil
      end

      def stage_label(hash, raw_id)
        return "" if raw_id.blank?

        key = raw_id.to_s
        hash[key] ||
          PipelineStage.where(tenant_id: current_tenant.id, id: key.to_i).pick(:name).to_s.presence ||
          key
      end

      def stringify_keys(h)
        return {} unless h.is_a?(Hash)

        h.deep_stringify_keys
      end
    end
  end
end
