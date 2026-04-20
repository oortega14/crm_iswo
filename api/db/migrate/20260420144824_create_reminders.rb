# frozen_string_literal: true

# ============================================================================
# reminders — recordatorios multi-canal
# ----------------------------------------------------------------------------
# `ReminderNotificationJob` consulta esta tabla cada minuto buscando
# `status = 'pending' AND remind_at <= NOW()` y dispara el envío por canal.
# SLA objetivo del RFC: entrega ≤ 5 minutos del tiempo configurado.
# ============================================================================
class CreateReminders < ActiveRecord::Migration[8.1]
  def change
    create_table :reminders do |t|
      t.references :tenant,      null: false, foreign_key: true, index: true
      t.references :opportunity, null: false, foreign_key: true, index: true
      t.references :user,        null: false, foreign_key: true, index: true,
                                 comment: "Destinatario del recordatorio"

      t.datetime :remind_at, null: false
      t.string   :channel,   null: false, comment: "email | whatsapp | in_app"
      t.string   :status,    null: false, default: "pending",
                             comment: "pending | sent | failed | done"
      t.string   :subject
      t.text     :message
      t.datetime :sent_at
      t.text     :last_error
      t.integer  :attempts,  null: false, default: 0

      t.timestamps
    end

    # Índice compuesto para el dispatcher cada minuto
    add_index :reminders, [:status, :remind_at], name: "index_reminders_dispatch"
    add_index :reminders, [:tenant_id, :user_id, :status]
    add_index :reminders, [:opportunity_id, :remind_at]
  end
end
