class AddDescriptionAndActiveToBantCriteria < ActiveRecord::Migration[8.1]
  def change
    add_column :bant_criteria, :description, :text
    add_column :bant_criteria, :active, :boolean, default: true, null: false
  end
end
