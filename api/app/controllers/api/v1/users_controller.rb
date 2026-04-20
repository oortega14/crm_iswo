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
        scope = policy_scope(User).kept.order(:first_name, :last_name)
        scope = scope.where(role: params[:role])     if params[:role].present?
        scope = scope.where(active: cast_bool(params[:active])) if params[:active].present?

        if params[:q].present?
          like = "%#{params[:q]}%"
          scope = scope.where(
            "first_name ILIKE :q OR last_name ILIKE :q OR email ILIKE :q", q: like
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
        @user = current_tenant.users.new(user_params)
        @user.password ||= SecureRandom.hex(12) # admin invita; user setea después
        if @user.save
          UserMailer.with(user: @user).welcome.deliver_later if defined?(UserMailer)
          render_created(@user, with: UserSerializer)
        else
          render_unprocessable(@user)
        end
      end

      # PATCH /api/v1/users/:id
      def update
        authorize @user
        if @user.update(user_params)
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
        authorize @user, :update?
        @user.update!(active: true)
        UserMailer.with(user: @user).account_activated.deliver_later if defined?(UserMailer)
        render_no_content
      end

      # POST /api/v1/users/:id/deactivate
      def deactivate
        authorize @user, :update?
        @user.update!(active: false)
        render_no_content
      end

      # POST /api/v1/users/:id/reset_password
      def reset_password
        authorize @user, :update?
        @user.send_reset_password_instructions
        head :accepted
      end

      private

      def set_user
        @user = current_tenant.users.find(params[:id])
      end

      def user_params
        params.require(:user).permit(:first_name, :last_name, :email, :phone, :role, :active, :avatar_url)
      end

      def cast_bool(v)
        ActiveModel::Type::Boolean.new.cast(v)
      end
    end
  end
end
