# frozen_string_literal: true

namespace :referral do
  desc "Consultores solo ven sus oportunidades: ajusta settings y enlaces de red en todos los tenants"
  task lock_consultant_opportunity_visibility: :environment do
    Tenant.find_each do |tenant|
      settings = (tenant.settings || {}).dup
      settings["referral_opportunity_visibility"] = false
      settings["network_depth"] = 0
      tenant.update!(settings: settings)
      puts "[#{tenant.slug}] referral_opportunity_visibility=false, network_depth=0"
    end
  end

  desc "Quita enlaces consultor→consultor; cada consultor queda referido solo por admin/manager (RFC §6.3)"
  task flatten_consultant_links: :environment do
    Tenant.find_each do |tenant|
      ActsAsTenant.with_tenant(tenant) do
        consultants = User.kept.where(tenant: tenant, role: :consultant)
        next if consultants.empty?

        parent = User.kept.where(tenant: tenant, role: %i[admin manager]).order(:role).first
        unless parent
          puts "[#{tenant.slug}] skip: sin admin/manager"
          next
        end

        consultant_ids = consultants.pluck(:id)
        removed = ReferralNetwork.where(tenant: tenant, referred_user_id: consultant_ids,
                                        referrer_user_id: consultant_ids).delete_all

        consultants.find_each do |c|
          ReferralNetwork.find_or_create_by!(tenant: tenant, referrer_user: parent, referred_user: c) do |rn|
            rn.depth = 1
            rn.active = true
          end
        end

        puts "[#{tenant.slug}] enlaces consultor→consultor eliminados: #{removed}"
      end
    end
  end

  desc "Aplica lock_consultant_opportunity_visibility + flatten_consultant_links"
  task fix_consultant_visibility: %i[lock_consultant_opportunity_visibility flatten_consultant_links]
end
