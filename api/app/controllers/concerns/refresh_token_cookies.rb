# frozen_string_literal: true

# ============================================================================
# RefreshTokenCookies — emisión, rotación e invalidación de refresh httpOnly.
# ============================================================================
module RefreshTokenCookies
  extend ActiveSupport::Concern

  private

  def issue_refresh_cookie(user)
    jti = SecureRandom.uuid
    user.update_column(:refresh_token_jti, jti)

    cookies.encrypted[:refresh_token] = {
      value: {
        user_id:    user.id,
        jti:        jti,
        issued_at:  Time.current.to_i,
        expires_at: 7.days.from_now.to_i
      },
      expires:   7.days.from_now,
      httponly:  true,
      secure:    Rails.env.production?,
      same_site: :lax,
      path:      "/"
    }
  end

  def revoke_refresh_session!(user)
    user.update_column(:refresh_token_jti, nil)
    cookies.delete(:refresh_token)
  end

  def clear_refresh_cookie
    cookies.delete(:refresh_token)
  end

  def token_valid?(token)
    token["expires_at"].to_i > Time.current.to_i
  end

  def refresh_token_matches?(token, user)
    token = token.stringify_keys if token.is_a?(Hash)
    return false unless token_valid?(token)

    jti = token["jti"].to_s
    stored = user.refresh_token_jti.to_s
    return false if jti.blank? || stored.blank?

    ActiveSupport::SecurityUtils.secure_compare(stored, jti)
  end
end
