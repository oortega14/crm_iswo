# frozen_string_literal: true

# ============================================================================
# whatsapp_messages — log bidireccional de mensajes WhatsApp
# ----------------------------------------------------------------------------
# Cada mensaje entrante o saliente queda aquí. `provider_message_id` viene de
# Twilio/Meta y es único por proveedor (idempotencia contra webhooks repetidos).
# ============================================================================
class CreateWhatsappMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :whatsapp_messages do |t|
      t.references :tenant,      null: false, foreign_key: true, index: true
      t.references :opportunity,              foreign_key: true, index: true
      t.references :contact,                  foreign_key: true, index: true

      t.string   :direction,           null: false, comment: "in | out"
      t.string   :provider,            null: false, comment: "twilio | whatsapp_cloud"
      t.string   :provider_message_id
      t.string   :from_number,         null: false
      t.string   :to_number,           null: false
      t.text     :body
      t.string   :media_url
      t.string   :media_content_type
      t.string   :status,              null: false, default: "pending",
                                       comment: "pending | queued | sent | delivered | read | failed"
      t.datetime :sent_at
      t.datetime :delivered_at
      t.datetime :read_at
      t.text     :error_message
      t.jsonb    :raw_payload, null: false, default: {}

      t.timestamps
    end

    add_index :whatsapp_messages, [:provider, :provider_message_id],
              unique: true,
              where: "provider_message_id IS NOT NULL",
              name: "index_whatsapp_messages_unique_provider_id"
    add_index :whatsapp_messages, [:tenant_id, :created_at]
    add_index :whatsapp_messages, [:opportunity_id, :created_at]
    add_index :whatsapp_messages, :status
  end
end
