# frozen_string_literal: true

# ============================================================================
# jwt_denylists — revocación de access tokens
# ----------------------------------------------------------------------------
# Estrategia denylist: cada JWT lleva un `jti`. Al hacer logout se persiste el
# JTI con su expiración. La middleware de devise-jwt verifica esta tabla.
# No se scopea por tenant: un token revocado lo está globalmente.
# ============================================================================
class CreateJwtDenylists < ActiveRecord::Migration[8.1]
  def change
    create_table :jwt_denylists do |t|
      t.string   :jti, null: false
      t.datetime :exp, null: false

      t.timestamps
    end

    add_index :jwt_denylists, :jti, unique: true
    add_index :jwt_denylists, :exp
  end
end
