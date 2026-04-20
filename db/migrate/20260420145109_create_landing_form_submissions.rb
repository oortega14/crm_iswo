# frozen_string_literal: true

# ============================================================================
# landing_form_submissions — envíos del form público de una landing
# ----------------------------------------------------------------------------
# Cada submission genera (vía service) un Contact + Opportunity con
# `lead_source.kind = 'web'`. Se guarda el payload original completo por si
# una landing agrega campos custom fuera del modelo.
# ============================================================================
class CreateLandingFormSubmissions < ActiveRecord::Migration[8.1]
  def change
    create_table :landing_form_submissions do |t|
      t.references :tenant,        null: false, foreign_key: true, index: true
      t.references :landing_page,  null: false, foreign_key: true, index: true
      t.references :contact,       foreign_key: true, index: true
      t.references :opportunity,   foreign_key: true, index: true

      t.jsonb  :payload,      null: false, default: {}
      t.string :ip_address
      t.string :user_agent
      t.string :utm_source
      t.string :utm_medium
      t.string :utm_campaign

      t.datetime :created_at, null: false
    end

    add_index :landing_form_submissions, [:tenant_id, :created_at]
    add_index :landing_form_submissions, :utm_campaign
  end
end
