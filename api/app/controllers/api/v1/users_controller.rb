# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # UsersController — gestión de consultores y administradores del tenant
    # ========================================================================
    class UsersController < BaseController
      before_action :set_user, only: %i[show update destroy activate deactivate reset_password]

      # GET /api/v1/users
      def index
        authorize User, :index?
        scope = policy_scope(User).kept.order(:name, :email)
        scope = scope.where(role: params[:role])     if params[:role].present?
        scope = scope.where(active: cast_bool(params[:active])) if params[:active].present?

        if params[:q].present?
          like = "%#{params[:q]}%"
          scope = scope.where(
            "name ILIKE :q OR email ILIKE :q", q: like
          )
        end

        render_collection(scope, with: UserSerializer)
      end

      # GET /api/v1/users/:id
      def show
        authorize @user
        render_resource(@user, with: UserSerializer)
      end

      # POST /api/v1/users
      def create
        authorize User

        if platform_tenant? && requested_role.present? && requested_role != "admin"
          return render json: {
            error:   "forbidden",
            message: "En el tenant plataforma solo se pueden crear usuarios con rol admin."
          }, status: :forbidden
        end

        plain_password     = params.dig(:user, :password).presence || SecureRandom.hex(12)
        password_generated = params.dig(:user, :password).blank?

        @user = current_tenant.users.new(user_params)
        @user.password = plain_password
        @user.skip_confirmation! if @user.respond_to?(:skip_confirmation!)
        if @user.save
          begin
            UserMailer.with(user: @user).welcome.deliver_later if defined?(UserMailer)
          rescue StandardError => e
            Rails.logger.warn("[UsersController#create] Welcome mailer failed: #{e.class}: #{e.message}")
          end
          payload = UserSerializer.new(@user).serializable_hash
          payload[:meta] = {
            password_generated:  password_generated,
            temporary_password:  password_generated ? plain_password : nil
          }
          render json: payload, status: :created
        else
          render_unprocessable(@user)
        end
      end

      # PATCH /api/v1/users/:id
      def update
        authorize @user
        if platform_tenant? && requested_role.present? && requested_role != "admin"
          return render json: {
            error:   "forbidden",
            message: "En el tenant plataforma solo se puede asignar rol admin."
          }, status: :forbidden
        end

        old_role = @user.role
        if @user.update(user_params)
          log_role_change_audit!(old_role, @user) if old_role != @user.role
          render_resource(@user, with: UserSerializer)
        else
          render_unprocessable(@user)
        end
      end

      # DELETE /api/v1/users/:id
      def destroy
        authorize @user
        @user.discard
        render_no_content
      end

      # POST /api/v1/users/:id/activate
      def activate
        authorize @user, :activate?
        @user.update!(active: true)
        UserMailer.with(user: @user).account_activated.deliver_later if defined?(UserMailer)
        render_no_content
      end

      # POST /api/v1/users/:id/deactivate
      def deactivate
        authorize @user, :deactivate?
        @user.update!(active: false)
        render_no_content
      end

      # POST /api/v1/users/:id/reset_password
      def reset_password
        authorize @user, :reset_password?
        Users::PasswordResetIssuer.new(user: @user, allow_any_role: true).call
        head :accepted
      rescue StandardError => e
        # No romper la UI de gestión por fallos de mailer/SMTP en entorno local.
        Rails.logger.error("[UsersController#reset_password] user_id=#{@user&.id} #{e.class}: #{e.message}")
        head :accepted
      end

      private

      def set_user
        @user = current_tenant.users.find(params[:id])
      end

      def user_params
        base = params.require(:user).permit(:name, :first_name, :last_name, :email, :phone, :avatar_url, :password)
        return base unless current_user&.role_admin?

        base.merge(params.require(:user).permit(:role, :active))
      end

      def requested_role
        params.dig(:user, :role).to_s.strip.presence
      end

      def platform_tenant?
        PlatformTenant.slug?(current_tenant&.slug)
      end

      def cast_bool(v)
        ActiveModel::Type::Boolean.new.cast(v)
      end

      def log_role_change_audit!(old_role, user)
        AuditEvent.create!(
          tenant:      current_tenant,
          user:        current_user,
          action:      "role_change",
          entity_type: "User",
          entity_id:   user.id,
          metadata:    { from: old_role, to: user.role },
          ip_address:  request.remote_ip,
          user_agent:  request.user_agent.to_s.truncate(255)
        )
      rescue StandardError => e
        Rails.logger.warn("[AuditEvent] role_change user=#{user.id}: #{e.message}")
      end
    end
  end
end
