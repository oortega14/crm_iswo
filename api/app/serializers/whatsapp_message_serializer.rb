# frozen_string_literal: true

# ============================================================================
# WhatsappMessageSerializer
# ============================================================================
# `raw_payload` se excluye por default (puede contener PII del proveedor);
# se habilita con params[:include_raw] para vistas de debug.
# ============================================================================
class WhatsappMessageSerializer < ApplicationSerializer
  set_type :whatsapp_message

  attributes :direction, :provider, :provider_message_id, :status,
             :from_number, :to_number, :body, :media_url,
             :sent_at, :delivered_at, :read_at, :error_message

  attribute :raw_payload, if: ->(_r, params) { params && params[:include_raw] }

  belongs_to :contact,     serializer: :contact
  belongs_to :opportunity, serializer: :opportunity
end
