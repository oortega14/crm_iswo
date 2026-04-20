# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # ContactsController — CRUD + chequeo de duplicados + export async
    # ========================================================================
    class ContactsController < BaseController
      before_action :set_contact, only: %i[show update destroy]

      # GET /api/v1/contacts
      def index
        scope = policy_scope(Contact).kept

        scope = scope.where(kind: params[:kind])               if params[:kind].present?
        scope = scope.where(owner_user_id: params[:owner_id])  if params[:owner_id].present?
        scope = scope.where.not(phone_normalized: nil)          if params[:has_phone] == "true"

        if (q = params[:q]).present?
          like = "%#{q}%"
          scope = scope.where(
            "first_name ILIKE :q OR last_name ILIKE :q OR company ILIKE :q OR email ILIKE :q OR phone_normalized ILIKE :q",
            q: like
          )
        end

        render_collection(scope.order(updated_at: :desc), with: ContactSerializer)
      end

      def show
        authorize @contact
        render_resource(@contact, with: ContactSerializer)
      end

      def create
        authorize Contact
        @contact = current_tenant.contacts.new(contact_params.merge(owner_user: current_user))
        if @contact.save
          render_created(@contact, with: ContactSerializer)
        else
          render_unprocessable(@contact)
        end
      end

      def update
        authorize @contact
        if @contact.update(contact_params)
          render_resource(@contact, with: ContactSerializer)
        else
          render_unprocessable(@contact)
        end
      end

      def destroy
        authorize @contact
        @contact.discard
        render_no_content
      end

      # GET /api/v1/contacts/check_duplicates?phone=...&email=...&full_name=...
      # Llamado desde el form del SPA mientras el consultor escribe.
      def check_duplicates
        matches = Opportunities::DuplicateDetector.new(
          phone:     params[:phone],
          email:     params[:email],
          full_name: params[:full_name]
        ).call

        render json: { data: matches.map(&:as_json) }, status: :ok
      rescue ArgumentError => e
        render json: { error: "bad_request", message: e.message }, status: :bad_request
      rescue NameError
        render json: { data: [], note: "DuplicateDetector pendiente de implementar" }
      end

      # POST /api/v1/contacts/export  body: { format: "xlsx", filters: {...} }
      def export
        authorize Contact, :export?
        export = current_tenant.exports.create!(
          user:     current_user,
          resource: "contacts",
          format:   params.fetch(:format, "xlsx"),
          filters:  params.fetch(:filters, {}).permit!.to_h
        )
        ExportGenerationJob.perform_later(export.id) if defined?(ExportGenerationJob)
        render_resource(export, with: ExportSerializer, status: :accepted)
      end

      private

      def set_contact
        @contact = current_tenant.contacts.kept.find(params[:id])
      end

      def contact_params
        params.require(:contact).permit(
          :kind, :first_name, :last_name, :company, :position,
          :email, :phone_e164, :city, :country, :notes,
          :owner_user_id, :source_kind, :source_label,
          custom_fields: {}
        )
      end
    end
  end
end
