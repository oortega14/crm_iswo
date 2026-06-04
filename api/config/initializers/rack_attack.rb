# frozen_string_literal: true

# ============================================================================
# Rack::Attack — rate limiting y protección de endpoints (A.6.8 ISO 27001)
# ============================================================================

class Rack::Attack
  # --------------------------------------------------------------------------
  # Caché: Redis si está disponible, memoria en desarrollo
  # --------------------------------------------------------------------------
  Rack::Attack.cache.store = if ENV["REDIS_URL"].present?
                                ActiveSupport::Cache::RedisCacheStore.new(url: ENV["REDIS_URL"])
                              else
                                ActiveSupport::Cache::MemoryStore.new
                              end

  # --------------------------------------------------------------------------
  # IPs de confianza (bypass): health checks, load balancers internos
  # --------------------------------------------------------------------------
  safelist("allow-localhost") { |req| req.ip == "127.0.0.1" || req.ip == "::1" }

  # --------------------------------------------------------------------------
  # Throttle: webhooks de ads (A.6.8)
  # 60 req/min por IP — suficiente para volumen legítimo de Meta/Google
  # --------------------------------------------------------------------------
  throttle("webhooks/ip", limit: 60, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/api/v1/webhooks/")
  end

  # --------------------------------------------------------------------------
  # Throttle: autenticación (login, forgot-password)
  # 10 intentos/minuto por IP para frenar fuerza bruta
  # --------------------------------------------------------------------------
  throttle("auth/ip", limit: 10, period: 1.minute) do |req|
    next unless req.post?

    req.ip if req.path == "/api/v1/sessions" ||
              req.path == "/api/v1/sessions/refresh" ||
              req.path.start_with?("/api/v1/password/")
  end

  # 5 intentos/minuto por email para frenar fuerza bruta por cuenta
  throttle("auth/email", limit: 5, period: 1.minute) do |req|
    if req.path == "/api/v1/sessions" && req.post?
      req.params["user"]&.dig("email").to_s.downcase.strip.presence
    end
  end

  # --------------------------------------------------------------------------
  # Throttle: endpoint público de landing (evitar scraping / flood)
  # 200 req/min por IP
  # --------------------------------------------------------------------------
  throttle("public/landings", limit: 200, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/api/v1/public/")
  end

  # --------------------------------------------------------------------------
  # Respuesta JSON uniforme al activarse un throttle
  # --------------------------------------------------------------------------
  self.throttled_responder = lambda do |env|
    retry_after = (env["rack.attack.match_data"] || {})[:period]
    [
      429,
      {
        "Content-Type"  => "application/json",
        "Retry-After"   => retry_after.to_s
      },
      [{ error: "too_many_requests", message: "Demasiadas solicitudes. Intenta en #{retry_after}s." }.to_json]
    ]
  end
end
