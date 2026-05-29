# frozen_string_literal: true

class AddRefreshTokenJtiToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :refresh_token_jti, :string
    add_index :users, :refresh_token_jti, where: "refresh_token_jti IS NOT NULL"
  end
end
