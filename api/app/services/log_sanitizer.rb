# frozen_string_literal: true

# ============================================================================
# LogSanitizer — enmascara datos sensibles en hashes de auditoría (ISO A.8.11)
# ============================================================================
module LogSanitizer
  SENSITIVE_KEYS = %w[
    email phone phone_e164 phone_normalized
    password encrypted_password reset_password_token
    credentials credentials_ciphertext body to_number from_number
  ].freeze

  module_function

  def redact(value)
    case value
    when Hash
      value.each_with_object({}) do |(k, v), h|
        h[k] = SENSITIVE_KEYS.include?(k.to_s) ? "[REDACTED]" : redact(v)
      end
    when Array
      value.map { |item| redact(item) }
    else
      value
    end
  end
end
