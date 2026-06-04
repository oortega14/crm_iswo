class AddIndexTenantContactToOpportunities < ActiveRecord::Migration[8.1]
  def change
    add_index :opportunities, %i[tenant_id contact_id],
              name: "index_opportunities_on_tenant_id_and_contact_id",
              if_not_exists: true
  end
end
