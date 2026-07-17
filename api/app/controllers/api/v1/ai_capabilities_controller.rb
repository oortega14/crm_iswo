# frozen_string_literal: true

module Api
  module V1
    # GET /api/v1/ai/capabilities — qué funciones de IA están disponibles en el tenant/servidor.
    class AiCapabilitiesController < BaseController
      # Solo expone flags de disponibilidad de IA (no secretos ni datos de tenant).
      def show
        render json: {
          data: {
            claude_temperature: {
              available:           Opportunities::AiClassifier.configured?,
              model:               Opportunities::AiClassifier.model_name,
              auto_on_save:        Opportunities::AiClassifier.auto_classify_enabled?,
              auto_on_bant_recalc: Opportunities::AiClassifier.auto_classify_on_bant?
            }
          }
        }, status: :ok
      end
    end
  end
end
