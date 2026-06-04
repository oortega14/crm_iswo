# frozen_string_literal: true

# ============================================================================
# AuthHelpers — helpers para request specs autenticados.
# ============================================================================
# Genera JWTs para devise-jwt sin pasar por el endpoint de login, y arma los
# headers habituales (Authorization + X-Tenant-Slug + Content-Type).
# ----------------------------------------------------------------------------
module AuthHelpers
  def json
    JSON.parse(response.body)
  rescue JSON::ParserError
    {}
  end

  # Compatibilidad con specs que llamaban reset explícito entre requests.
  def reset_json_cache!
    nil
  end

  def jwt_for(user)
    Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
  end

  # Headers autenticados listos para inyectar en request specs.
  #
  #   get "/api/v1/contacts", headers: auth_headers(user)
  def auth_headers(user, tenant: nil)
    tenant ||= user.tenant
    {
      "Authorization"  => "Bearer #{jwt_for(user)}",
      "X-Tenant-Slug"  => tenant.slug,
      "Content-Type"   => "application/json",
      "Accept"         => "application/json"
    }
  end

  def tenant_headers(tenant)
    {
      "X-Tenant-Slug" => tenant.slug,
      "Content-Type"  => "application/json",
      "Accept"        => "application/json"
    }
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :request
  config.before(:each, type: :request) { reset_json_cache! }
end
