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
      def render_collection(scope, with:, params: {}, meta: {})
        pagy_obj, records = paginate(scope)
        pagy_headers(pagy_obj)

        payload = with.new(records, params: params).serializable_hash
        payload[:meta] = pagination_meta(pagy_obj).merge(meta) if payload.is_a?(Hash)

        render json: payload, status: :ok
      end

      # Para un único record.
      def render_resource(record, with:, status: :ok, params: {})
        render json: with.new(record, params: params).serializable_hash, status: status
      end

      # Para creaciones — atajo legible.
      def render_created(record, with:, params: {})
        render_resource(record, with: with, status: :created, params: params)
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

      # ------------------------------------------------------------------
      private

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

        {
          pagination: {
            page:        pagy_obj.page,
            items:       pagy_obj.items,
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
