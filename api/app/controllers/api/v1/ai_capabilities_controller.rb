# frozen_string_literal: true

module Api
  module V1
    # GET /api/v1/ai/capabilities — qué funciones de IA están disponibles en el tenant/servidor.
    class AiCapabilitiesController < BaseController
      def show
        key = Opportunities::AiClassifier.api_key
        render json: {
          data: {
            claude_temperature: {
              available:           Opportunities::AiClassifier.configured?,
              model:               Opportunities::AiClassifier.model_name,
              auto_on_save:        Opportunities::AiClassifier.auto_classify_enabled?,
              auto_on_bant_recalc: Opportunities::AiClassifier.auto_classify_on_bant?,
              key_hint:            key ? "#{key[0, 7]}…#{key[-4, 4]}" : nil
            }
          }
        }, status: :ok
      end
    end
  end
end
