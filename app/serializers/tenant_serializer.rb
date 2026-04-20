# frozen_string_literal: true

# ============================================================================
# TenantSerializer — configuración del tenant expuesta al SPA.
# ============================================================================
# Incluye branding, settings y timezone. No expone discarded_at ni campos
# de infraestructura (slug sí, sirve para debugging).
# ============================================================================
class TenantSerializer < ApplicationSerializer
  set_type :tenant

  attributes :name, :slug, :timezone, :locale, :currency, :country_code,
             :brand_color, :logo_url, :settings

  attribute :active do |t|
    t.respond_to?(:discarded?) ? !t.discarded? : true
  end

  attribute :users_count do |t|
    t.users.where(active: true).count
  end
end
