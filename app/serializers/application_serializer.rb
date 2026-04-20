# frozen_string_literal: true

# ============================================================================
# ApplicationSerializer — base de todos los serializers JSON:API.
# ============================================================================
# Convenciones:
#   - Usa `jsonapi-serializer` (ex fast_jsonapi).
#   - Por defecto incluye `id`, `created_at`, `updated_at`.
#   - Subclases declaran `attributes :a, :b, ...` y `belongs_to/has_many` al estilo
#     JSON:API. Ver https://github.com/jsonapi-serializer/jsonapi-serializer
#   - Para envoltorios sin JSON:API spec usar `serializer.serializable_hash[:data][:attributes]`
#     o el helper `BaseController#serialize` que ya está definido.
# ============================================================================
class ApplicationSerializer
  include JSONAPI::Serializer

  # Activa el formato camelCase si el frontend lo prefiere; aquí dejamos snake_case
  # para mantenerlo aligned con el SPA TanStack que mapea a snake.
  set_key_transform :underscore

  attributes :created_at, :updated_at

  # Helper para colecciones grandes que no necesitan relationships completas.
  def self.collection_payload(records, params: {})
    new(records, params: params).serializable_hash
  end
end
