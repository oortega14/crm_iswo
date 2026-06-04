# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # NotificationsController — notificaciones in-app del usuario actual
    # ========================================================================
    class NotificationsController < BaseController
      before_action :set_notification, only: [:read]

      # GET /api/v1/notifications
      # Parámetros opcionales:
      #   ?unread=true  — solo no leídas
      #   ?limit=N      — máximo de resultados (default 50, máx 100)
      def index
        authorize Notification, :index?

        limit = [[params.fetch(:limit, 50).to_i, 1].max, 100].min
        scope = current_user.notifications
                            .where(tenant: current_tenant)
                            .recent
                            .limit(limit)
        scope = scope.unread if params[:unread] == "true"

        payload = NotificationSerializer.new(scope).serializable_hash
        payload[:meta] = {
          unread_count: current_user.notifications.where(tenant: current_tenant).unread.count
        }
        render json: payload, status: :ok
      end

      # PATCH /api/v1/notifications/:id/read
      def read
        authorize @notification, :update?
        @notification.mark_read!
        render_no_content
      end

      # POST /api/v1/notifications/read_all
      def read_all
        authorize Notification, :index?
        current_user.notifications
                    .where(tenant: current_tenant)
                    .unread
                    .update_all(read_at: Time.current)
        render_no_content
      end

      private

      def set_notification
        @notification = current_user.notifications.where(tenant: current_tenant).find(params[:id])
      end
    end
  end
end
