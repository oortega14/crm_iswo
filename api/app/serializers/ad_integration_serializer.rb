# frozen_string_literal: true

# ============================================================================
# AdIntegrationSerializer
# ============================================================================
# CRÍTICO: nunca incluye `credentials`, `credentials_ciphertext` ni derivados.
# El SPA solo ve el proveedor, el account_identifier y el estado de sync.
# ============================================================================
class AdIntegrationSerializer < ApplicationSerializer
  set_type :ad_integration

  attributes :provider, :account_identifier, :status, :metadata,
             :last_sync_at, :last_error_at, :last_error_message

  attribute :healthy do |i|
    i.status == "active" && i.last_error_at.blank?
  end

  attribute :has_credentials do |i|
    i.respond_to?(:credentials_ciphertext) ? i.credentials_ciphertext.present? : false
  end
end
