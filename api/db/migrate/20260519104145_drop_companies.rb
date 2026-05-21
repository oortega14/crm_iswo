class DropCompanies < ActiveRecord::Migration[8.1]
  def up
    drop_table :companies
  end

  def down
    create_table :companies do |t|
      t.string :name
      t.timestamps
    end
  end
end
