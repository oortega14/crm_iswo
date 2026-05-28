# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # AuditEventsController — bitácora global del tenant (solo lectura).
    # ========================================================================
    class AuditEventsController < BaseController
      # GET /api/v1/audit_events
      # Params opcionales: action, entity_type, q (búsqueda), page, items
      def index
        authorize AuditEvent, :index?

        scope = policy_scope(AuditEvent).includes(:user)
        # No usar `params[:action]`: en Rails es siempre el nombre de la acción del controlador ("index").
        if params[:event_action].present?
          ea = ActiveRecord::Base.sanitize_sql_like(params[:event_action].to_s)
          scope = scope.where("action = ? OR action ILIKE ?", ea, "%.#{ea}")
        end

        if params[:entity_type].present?
          et = ActiveRecord::Base.sanitize_sql_like(params[:entity_type].to_s)
          scope = scope.where("audit_events.entity_type ILIKE ?", "%#{et}%")
        end

        if params[:q].present?
          term = "%#{ActiveRecord::Base.sanitize_sql_like(params[:q].to_s)}%"
          scope = scope.left_joins(:user).where(
            "audit_events.action ILIKE :t OR audit_events.metadata::text ILIKE :t " \
            "OR users.email ILIKE :t OR users.name ILIKE :t",
            t: term
          )
        end

        if params[:date_from].present?
          scope = scope.where("audit_events.created_at >= ?", params[:date_from].to_date.beginning_of_day)
        end

        if params[:date_to].present?
          scope = scope.where("audit_events.created_at <= ?", params[:date_to].to_date.end_of_day)
        end

        render_collection(scope.order(created_at: :desc), with: AuditEventSerializer)
      end
    end
  end
end
