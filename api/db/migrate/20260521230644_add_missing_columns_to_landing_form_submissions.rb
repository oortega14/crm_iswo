class AddMissingColumnsToLandingFormSubmissions < ActiveRecord::Migration[8.1]
  def change
    add_column :landing_form_submissions, :utm_term, :string
    add_column :landing_form_submissions, :utm_content, :string
    add_column :landing_form_submissions, :processed_at, :datetime
    add_column :landing_form_submissions, :process_error, :string
  end
end
