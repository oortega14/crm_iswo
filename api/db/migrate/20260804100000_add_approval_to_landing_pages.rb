# frozen_string_literal: true

# ============================================================================
# Aprobación de landings — toda landing nace "pending" y solo el super-admin
# (tenant plataforma) puede aprobarla para que se pueda publicar.
# ============================================================================
class AddApprovalToLandingPages < ActiveRecord::Migration[8.1]
  def up
    add_column :landing_pages, :approval_status, :string, null: false, default: "pending"
    add_column :landing_pages, :requested_by_user_id, :bigint
    add_column :landing_pages, :reviewed_by_user_id, :bigint
    add_column :landing_pages, :reviewed_at, :datetime
    add_column :landing_pages, :rejection_reason, :string

    add_index :landing_pages, :approval_status
    add_foreign_key :landing_pages, :users, column: :requested_by_user_id
    add_foreign_key :landing_pages, :users, column: :reviewed_by_user_id

    # Landings que ya estaban publicadas antes de existir este flujo se dan
    # por aprobadas — la aprobación es para publicaciones nuevas en adelante,
    # no retroactiva.
    execute <<~SQL.squish
      UPDATE landing_pages
      SET approval_status = 'approved', reviewed_at = COALESCE(published_at, updated_at)
      WHERE published = true
    SQL
  end

  def down
    remove_foreign_key :landing_pages, column: :reviewed_by_user_id
    remove_foreign_key :landing_pages, column: :requested_by_user_id
    remove_index :landing_pages, :approval_status

    remove_column :landing_pages, :rejection_reason
    remove_column :landing_pages, :reviewed_at
    remove_column :landing_pages, :reviewed_by_user_id
    remove_column :landing_pages, :requested_by_user_id
    remove_column :landing_pages, :approval_status
  end
end
