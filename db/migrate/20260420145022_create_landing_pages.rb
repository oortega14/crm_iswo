# frozen_string_literal: true

# ============================================================================
# landing_pages — páginas editables por tenant
# ----------------------------------------------------------------------------
# `content` guarda la estructura JSON que escupe GrapeJS (o el editor que se
# elija en D1). Se sirve por subdominio del tenant + `slug`.
# ============================================================================
class CreateLandingPages < ActiveRecord::Migration[8.1]
  def change
    create_table :landing_pages do |t|
      t.references :tenant, null: false, foreign_key: true, index: true

      t.string  :title,        null: false
      t.string  :slug,         null: false
      t.string  :seo_title
      t.string  :seo_description
      t.string  :og_image_url
      t.jsonb   :content,      null: false, default: {}, comment: "Estructura GrapeJS"
      t.jsonb   :styles,       null: false, default: {}
      t.string  :thumbnail_url
      t.boolean :published,    null: false, default: false
      t.datetime :published_at
      t.integer :view_count,   null: false, default: 0
      t.integer :lead_count,   null: false, default: 0

      t.timestamps
    end

    add_index :landing_pages, [:tenant_id, :slug], unique: true
    add_index :landing_pages, [:tenant_id, :published]
  end
end
