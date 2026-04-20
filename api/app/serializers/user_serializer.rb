# frozen_string_literal: true

# ============================================================================
# UserSerializer
# ============================================================================
# Nunca expone:
#   - encrypted_password / reset tokens / confirmation tokens
#   - jti (JWT) ni datos de devise internos
#
# Para el endpoint /api/v1/me se usa la variante con `current_user: true`
# que adiciona `permissions` (resumen de capacidades de Pundit).
# ============================================================================
class UserSerializer < ApplicationSerializer
  set_type :user

  attributes :email, :first_name, :last_name, :phone, :role, :active,
             :preferences, :last_sign_in_at

  attribute :full_name do |u|
    [u.first_name, u.last_name].compact.join(" ").presence || u.email
  end

  attribute :avatar_url do |u|
    u.respond_to?(:avatar_url) ? u.avatar_url : nil
  end

  # Solo se incluye en /me — opt-in con params[:include_permissions].
  attribute :permissions, if: ->(_record, params) { params && params[:include_permissions] } do |u|
    {
      manage_users:        u.role.in?(%w[admin manager]),
      manage_pipelines:    u.role.in?(%w[admin manager]),
      manage_integrations: u.role == "admin",
      view_audit_log:      u.role.in?(%w[admin manager]),
      export_data:         u.role.in?(%w[admin manager])
    }
  end

  belongs_to :tenant, serializer: :tenant
end
