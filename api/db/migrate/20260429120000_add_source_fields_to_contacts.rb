# frozen_string_literal: true

# Origen del lead (Meta Ads, landing, WhatsApp, etc.) — el código ya asigna estos campos;
# sin columnas, ActiveRecord y el serializador fallan al crear/listar contactos.
class AddSourceFieldsToContacts < ActiveRecord::Migration[8.1]
  def change
    add_column :contacts, :source_kind, :string
    add_column :contacts, :source_label, :string
  end
end
