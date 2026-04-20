# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # RemindersController — recordatorios standalone y anidados a oportunidad
    # ========================================================================
    class RemindersController < BaseController
      before_action :set_opportunity, only: %i[create]
      before_action :set_reminder,    only: %i[show update destroy complete snooze]

      # GET /api/v1/reminders
      # GET /api/v1/opportunities/:opportunity_id/reminders
      def index
        scope = if params[:opportunity_id].present?
                  current_tenant.opportunities.find(params[:opportunity_id]).reminders
                else
                  policy_scope(Reminder).where(user: current_user)
                end
        scope = scope.where(status: params[:status]) if params[:status].present?
        scope = scope.upcoming                       if params[:upcoming] == "true"

        render_collection(scope.order(:remind_at), with: ReminderSerializer)
      end

      def show
        authorize @reminder
        render_resource(@reminder, with: ReminderSerializer)
      end

      def create
        authorize @opportunity, :update?
        reminder = @opportunity.reminders.new(reminder_params.merge(
          tenant: current_tenant,
          user:   current_user
        ))
        if reminder.save
          render_created(reminder, with: ReminderSerializer)
        else
          render_unprocessable(reminder)
        end
      end

      def update
        authorize @reminder
        if @reminder.update(reminder_params)
          render_resource(@reminder, with: ReminderSerializer)
        else
          render_unprocessable(@reminder)
        end
      end

      def destroy
        authorize @reminder
        @reminder.destroy
        render_no_content
      end

      # POST /api/v1/reminders/:id/complete
      def complete
        authorize @reminder, :update?
        @reminder.update!(status: "done")
        @reminder.opportunity.touch_activity!
        render_no_content
      end

      # POST /api/v1/reminders/:id/snooze  { minutes: 30 }
      def snooze
        authorize @reminder, :update?
        @reminder.update!(remind_at: Time.current + params.fetch(:minutes, 30).to_i.minutes)
        render_no_content
      end

      private

      def set_opportunity
        @opportunity = current_tenant.opportunities.find(params[:opportunity_id])
      end

      def set_reminder
        @reminder = current_tenant.reminders.find(params[:id])
      end

      def reminder_params
        params.require(:reminder).permit(:remind_at, :channel, :subject, :message, :user_id)
      end
    end
  end
end
