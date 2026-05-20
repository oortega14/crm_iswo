# frozen_string_literal: true

# ============================================================================
# DataClassifiable — ISO 27001:2022 A.5.12 Clasificación de la información
# ============================================================================
# Incluir en modelos cuyos registros contienen datos sensibles (PII o datos
# comerciales). El nivel se declara con DATA_CLASSIFICATION en la clase o se
# hereda el valor por defecto ("confidential").
#
# Uso:
#   class Contact < ApplicationRecord
#     include DataClassifiable          # nivel → "confidential" (default)
#   end
#
#   class Pipeline < ApplicationRecord
#     include DataClassifiable
#     DATA_CLASSIFICATION = "internal"  # sobreescribe el default
#   end
# ============================================================================
module DataClassifiable
  extend ActiveSupport::Concern

  LEVELS = %w[public internal confidential restricted].freeze

  included do
    # Nivel por defecto para datos PII / comerciales.
    DATA_CLASSIFICATION = "confidential" unless const_defined?(:DATA_CLASSIFICATION)
  end

  class_methods do
    def data_classification
      const_get(:DATA_CLASSIFICATION)
    end
  end
end
