# frozen_string_literal: true

# Columna sin uso: no está en contact_params, ContactSerializer ni en el SPA.
class RemoveAddressFromContacts < ActiveRecord::Migration[8.1]
  def change
    remove_column :contacts, :address, :string
  end
end
