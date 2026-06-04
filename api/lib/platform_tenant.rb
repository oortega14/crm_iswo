# frozen_string_literal: true

# Tenant plataforma — único autorizado para onboarding de otros tenants.
module PlatformTenant
  SLUG = "super-admin"

  module_function

  def slug?(value)
    value.to_s.strip.downcase == SLUG
  end

  def protected_from_deactivation?(value)
    slug?(value)
  end
end
