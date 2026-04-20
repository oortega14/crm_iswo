# frozen_string_literal: true

# ============================================================================
# Clase base para todos los modelos AR del proyecto.
# ============================================================================
class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class
end
