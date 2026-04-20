# frozen_string_literal: true

# ============================================================================
# referral_networks — árbol de referidos entre consultores
# ----------------------------------------------------------------------------
# Tabla adyacente (adjacency list) con `depth` cacheado para queries rápidos.
# Un consultor puede tener 0..N referidos directos. Para árbol profundo se
# usa WITH RECURSIVE desde el servicio (ReferralTreeQuery).
# ============================================================================
class CreateReferralNetworks < ActiveRecord::Migration[8.1]
  def change
    create_table :referral_networks do |t|
      t.references :tenant,        null: false, foreign_key: true, index: true
      t.references :referrer_user, null: false, foreign_key: { to_table: :users }, index: true
      t.references :referred_user, null: false, foreign_key: { to_table: :users }, index: true

      t.integer :depth,  null: false, default: 1,  comment: "Profundidad desde el root"
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :referral_networks,
              [:tenant_id, :referrer_user_id, :referred_user_id],
              unique: true,
              name: "index_referral_networks_unique_pair"
    add_index :referral_networks, [:tenant_id, :referrer_user_id, :depth]

    # Prevenir auto-referencias
    add_check_constraint :referral_networks,
                         "referrer_user_id <> referred_user_id",
                         name: "referral_networks_no_self_referral"
  end
end
