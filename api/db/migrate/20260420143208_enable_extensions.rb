# frozen_string_literal: true

# ============================================================================
# Extensiones PostgreSQL requeridas
# ----------------------------------------------------------------------------
# - pg_trgm:    similitud trigram para detección de duplicados (phone, email).
# - pgcrypto:   funciones cripto auxiliares (gen_random_uuid, etc.).
# - btree_gist: índices GiST que combinan tipos para constraints de exclusión.
# ============================================================================
class EnableExtensions < ActiveRecord::Migration[8.1]
  def change
    enable_extension "pg_trgm"
    enable_extension "pgcrypto"
    enable_extension "btree_gist"
  end
end
