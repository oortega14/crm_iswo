# frozen_string_literal: true

# ============================================================================
# users — consultores y administradores
# ----------------------------------------------------------------------------
# Devise + JWT. Email único por tenant (no global). Rol enum string.
# ============================================================================
class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.references :tenant, null: false, foreign_key: true, index: true

      # Devise — database_authenticatable
      t.string  :email,              null: false, default: ""
      t.string  :encrypted_password, null: false, default: ""

      # Devise — recoverable
      t.string   :reset_password_token
      t.datetime :reset_password_sent_at

      # Devise — rememberable
      t.datetime :remember_created_at

      # Devise — trackable
      t.integer  :sign_in_count,         default: 0, null: false
      t.datetime :current_sign_in_at
      t.datetime :last_sign_in_at
      t.string   :current_sign_in_ip
      t.string   :last_sign_in_ip

      # Devise — confirmable
      t.string   :confirmation_token
      t.datetime :confirmed_at
      t.datetime :confirmation_sent_at
      t.string   :unconfirmed_email

      # Devise — lockable
      t.integer  :failed_attempts, default: 0, null: false
      t.string   :unlock_token
      t.datetime :locked_at

      # Atributos de negocio
      t.string  :name,         null: false, comment: "Nombre completo del consultor"
      t.string  :phone,                       comment: "Teléfono de contacto"
      t.string  :role,         null: false, default: "consultant",
                comment: "admin | manager | consultant | viewer"
      t.string  :avatar_url
      t.boolean :active,       null: false,  default: true
      t.jsonb   :preferences,  null: false,  default: {}
      t.datetime :discarded_at, comment: "Soft-delete"

      t.timestamps
    end

    add_index :users, [:tenant_id, :email],               unique: true, name: "index_users_on_tenant_and_email"
    add_index :users, :reset_password_token,              unique: true, where: "reset_password_token IS NOT NULL"
    add_index :users, :confirmation_token,                unique: true, where: "confirmation_token IS NOT NULL"
    add_index :users, :unlock_token,                      unique: true, where: "unlock_token IS NOT NULL"
    add_index :users, [:tenant_id, :role]
    add_index :users, [:tenant_id, :active]
    add_index :users, :discarded_at
  end
end
