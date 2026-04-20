# frozen_string_literal: true

# ============================================================================
# TenantScoped — concern para modelos que pertenecen a un tenant.
# ----------------------------------------------------------------------------
# Aplica acts_as_tenant + helpers de discard si el modelo lo soporta.
# Uso:   class Contact < ApplicationRecord; include TenantScoped; end
# ============================================================================
module TenantScoped
  extend ActiveSupport::Concern

  included do
    acts_as_tenant(:tenant)
  end
end
