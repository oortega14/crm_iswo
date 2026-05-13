# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # BaseController — padre de todos los controllers autenticados del API.
    # ========================================================================
    # - Resuelve tenant por subdominio / header.
    # - Autentica con devise-jwt (`authenticate_user!` viene de Devise).
    # - Pundit para autorización.
    # - Handler de errores JSON uniforme.
    # - Paginación con pagy.
    # - Serialización con jsonapi-serializer (formato JSON:API spec).
    # ========================================================================
    class BaseController < ApplicationController
      include TenantResolver
      include ErrorHandler
      include Paginatable
      include Pundit::Authorization

      # Devise :trackable actualiza users en cada request (sign_in_count, current_sign_in_at).
      # Con JWT + SPA eso dispara un UPDATE en cada GET (p. ej. polling del dashboard).
      # El login real sigue pasando por SessionsController (sin este skip).
      prepend_before_action :skip_devise_trackable_for_api_requests

      before_action :authenticate_user!
      before_action :verify_user_belongs_to_tenant

      # ------------------------------------------------------------------
      # Render helpers (los usan todos los controllers concretos)
      # ------------------------------------------------------------------
      protected

      # Para listas paginadas. Aplica pagy_headers y serializa la colección.
      #
      #   render_collection(scope, with: ContactSerializer)
      #   render_collection(scope, with: UserSerializer, params: { current_user: true })
      def render_collection(scope, with:, params: {}, meta: {}, include: nil)
        pagy_obj, records = paginate(scope)
        pagy_headers(pagy_obj)

        ser_opts = { params: params }
        ser_opts[:include] = include if include.present?
        payload = with.new(records, **ser_opts).serializable_hash
        payload[:meta] = pagination_meta(pagy_obj).merge(meta) if payload.is_a?(Hash)

        render json: payload, status: :ok
      end

      # Para un único record.
      def render_resource(record, with:, status: :ok, params: {}, include: nil)
        ser_opts = { params: params }
        ser_opts[:include] = include if include.present?
        render json: with.new(record, **ser_opts).serializable_hash, status: status
      end

      # Para creaciones — atajo legible.
      def render_created(record, with:, params: {}, include: nil)
        render_resource(record, with: with, status: :created, params: params, include: include)
      end

      def render_no_content
        head :no_content
      end

      # Errores de validación uniformes.
      def render_unprocessable(record)
        render json: {
          error:   "unprocessable_entity",
          details: record.errors.as_json(full_messages: true)
        }, status: :unprocessable_entity
      end

      # JSON de export: `filters` puede venir como Hash puro (Axios) o como
      # ActionController::Parameters. Hash no implementa #permit! → 500.
      def normalize_export_filters_param
        raw = params[:filters]
        return {} if raw.blank?

        case raw
        when ActionController::Parameters
          raw.permit!.to_h
        when Hash
          raw.deep_stringify_keys
        else
          {}
        end
      end

      # Tipo de archivo (csv/xlsx). NO confundir con `params[:format]` de Rails,
      # que es el formato de la respuesta HTTP (casi siempre "json") — guardarlo
      # en Export rompe el enum y devuelve 500.
      def resolve_export_file_format
        %i[export_format file_format].each do |key|
          v = params[key].to_s.presence
          return v if v.present? && Export::FORMATS.include?(v)
        end

        v = params[:format].to_s.presence
        return v if v.present? && Export::FORMATS.include?(v)

        "xlsx"
      end

      # Encola el job sin tumbar la petición HTTP si Redis/Sidekiq fallan.
      def safe_enqueue_export_generation_job(export_id)
        return unless defined?(ExportGenerationJob)

        ExportGenerationJob.perform_later(export_id)
      rescue StandardError => e
        Rails.logger.error(
          "[ExportGenerationJob] No se pudo encolar export_id=#{export_id}: #{e.class}: #{e.message}"
        )
      end

      # ------------------------------------------------------------------
      private

      def skip_devise_trackable_for_api_requests
        request.env["devise.skip_trackable"] = true
      end

      # Guard extra: después de Devise autenticar, asegurarse de que el user
      # pertenece al tenant resuelto. Si el JWT es válido pero corresponde a
      # otro tenant, negar acceso.
      def verify_user_belongs_to_tenant
        return if current_user.blank? || current_tenant.blank?

        return if current_user.tenant_id == current_tenant.id

        render json: {
          error:   "tenant_mismatch",
          message: "El token no corresponde a este tenant"
        }, status: :forbidden
      end

      def pagination_meta(pagy_obj)
        return {} unless pagy_obj
        per_page = pagy_obj.respond_to?(:items) ? pagy_obj.items : pagy_obj.limit

        {
          pagination: {
            page:        pagy_obj.page,
            items:       per_page,
            pages:       pagy_obj.pages,
            count:       pagy_obj.count,
            next_page:   pagy_obj.next,
            prev_page:   pagy_obj.prev
          }
        }
      end
    end
  end
end
