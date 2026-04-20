# frozen_string_literal: true

# ============================================================================
# acts_as_tenant
# ============================================================================
# Scope transparente por tenant_id en todas las queries y writes.
# Si un controlador no setea tenant y toca un modelo tenant-scoped,
# lanza una excepción para prevenir fugas de datos entre tenants.
# ----------------------------------------------------------------------------

ActsAsTenant.configure do |config|
  # Lanzar excepción si se usa un modelo scoped sin tenant seteado.
  # Defensa en profundidad contra data leaks entre tenants.
  config.require_tenant = true

  # En tests podés desactivarlo con:
  #   ActsAsTenant.test_mode!
end
