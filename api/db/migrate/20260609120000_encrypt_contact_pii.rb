# frozen_string_literal: true

# Fase 2 — Lockbox + blind_index en contacts.document_id y contacts.phone_e164.
# Columnas legado se mantienen durante migrating:true; backfill con security:encrypt_contacts.
class EncryptContactPii < ActiveRecord::Migration[8.1]
  def change
    change_table :contacts, bulk: true do |t|
      t.text   :document_id_ciphertext
      t.text   :phone_e164_ciphertext
      t.string :document_id_bidx
      t.string :phone_e164_bidx
    end

    add_index :contacts, %i[tenant_id document_id_bidx],
              name: "index_contacts_on_tenant_id_and_document_id_bidx",
              where: "document_id_bidx IS NOT NULL AND discarded_at IS NULL"

    add_index :contacts, %i[tenant_id phone_e164_bidx],
              name: "index_contacts_on_tenant_id_and_phone_e164_bidx",
              where: "phone_e164_bidx IS NOT NULL AND discarded_at IS NULL"

    remove_index :contacts, name: "index_contacts_on_tenant_id_and_document_id", if_exists: true
    remove_index :contacts, name: "index_contacts_on_tenant_id_and_phone_e164", if_exists: true
    remove_index :contacts, name: "index_contacts_on_phone_normalized_trgm", if_exists: true
  end
end
