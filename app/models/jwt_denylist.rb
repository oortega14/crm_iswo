# frozen_string_literal: true

# ============================================================================
# JwtDenylist — estrategia de revocación de JWTs por JTI
# ============================================================================
class JwtDenylist < ApplicationRecord
  include Devise::JWT::RevocationStrategies::Denylist

  self.table_name = "jwt_denylists"
end
