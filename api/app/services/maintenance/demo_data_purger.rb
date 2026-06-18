# frozen_string_literal: true

module Maintenance
  # Elimina contactos, oportunidades y envíos generados por seeds, demo_pack y tareas demo.
  #
  # Por defecto vacía datos operativos en iswo y micasita (WIPE=iswo,micasita).
  # El resto de tenants solo borra registros que coinciden con patrones demo.
  #
  # NO modifica: Tenant, User, Pipeline, ReferralNetwork, BantCriterion, LeadSource
  # F5 (iswo/micasita/libranzas): plantillas por vertical; solo borra demo/extras.
  class DemoDataPurger
    PROTECTED_ROLES = %w[admin manager consultant viewer].freeze
    DEFAULT_WIPE_SLUGS = %w[iswo micasita].freeze

    DEMO_CONTACT_SQL = <<~SQL.squish
      email ILIKE '%@ejemplo.co'
      OR email ILIKE '%@%.demo'
      OR email ILIKE '%@leads.iswo.test'
      OR email ~* '^demo\\.[^@]+@'
      OR email ~* '^lead\\.(meta|web)\\.'
      OR source_label ILIKE 'demo%'
      OR first_name ILIKE '%(dup)%'
      OR last_name ILIKE '%(dup)%'
      OR TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) ILIKE 'Lead Demo %'
      OR company_name ILIKE 'Empresa demo'
    SQL

    DEMO_SUBMISSION_SQL = <<~SQL.squish
      utm_campaign LIKE 'demo_%'
      OR utm_campaign = 'leads_demo_import'
      OR payload::text ILIKE '%@ejemplo.co%'
      OR payload::text ILIKE '%@%.demo%'
      OR payload::text ILIKE '%@leads.iswo.test%'
    SQL

    DEMO_OPPORTUNITY_SQL = <<~SQL.squish
      title ILIKE '%(demo)%'
      OR title ILIKE 'Duplicado de %'
      OR title ILIKE 'Lead Demo %'
    SQL

    def self.run!(wipe_tenant_slugs: DEFAULT_WIPE_SLUGS)
      new(wipe_tenant_slugs: Array(wipe_tenant_slugs).map(&:to_s).reject(&:blank?)).run!
    end

    def initialize(wipe_tenant_slugs:)
      @wipe_tenant_slugs = wipe_tenant_slugs
    end

    def run!
      totals = { contacts: 0, opportunities: 0, reminders: 0, submissions: 0, flags: 0, landings: 0, referral_networks: 0 }
      snapshot = staff_snapshot

      ActsAsTenant.without_tenant do
        Tenant.find_each do |tenant|
          ActsAsTenant.with_tenant(tenant) do
            wipe = @wipe_tenant_slugs.include?(tenant.slug)
            print "  #{tenant.slug}#{wipe ? ' (vacío operativo)' : ''}: "
            counts = purge_tenant!(wipe: wipe)
            totals.keys.each { |k| totals[k] += counts[k] }
            puts counts.values.sum.positive? ? counts.inspect : "sin datos demo"
          end
        end
      end

      assert_staff_unchanged!(snapshot)
      puts "\nTotal eliminado: #{totals.inspect}"
      puts "Conservados: #{snapshot[:tenants]} tenants, #{snapshot[:users]} usuarios (#{snapshot[:by_role].inspect})"
      reset_landing_templates!
      totals
    end

    private

    def staff_snapshot
      ActsAsTenant.without_tenant do
        {
          tenants: Tenant.count,
          users:   User.unscoped.count,
          by_role: User.unscoped.where(role: PROTECTED_ROLES).group(:role).count
        }
      end
    end

    def assert_staff_unchanged!(before)
      ActsAsTenant.without_tenant do
        after_roles = User.unscoped.where(role: PROTECTED_ROLES).group(:role).count
        if Tenant.count != before[:tenants] ||
           User.unscoped.count != before[:users] ||
           after_roles != before[:by_role]
          raise "demo:purge alteró tenants o usuarios del sistema — operación abortada"
        end
      end
    end

    def purge_tenant!(wipe: false)
      return wipe_operational_data! if wipe

      purge_demo_patterns!
    end

    # ISWO / Mi Casita: deja solo estructura (usuarios, pipeline, landings plantilla, red).
    def wipe_operational_data!
      counts = empty_counts
      merge_counts!(counts, purge_landing_demo_data!)

      counts[:flags] = DuplicateFlag.count
      DuplicateFlag.delete_all

      counts[:reminders] = Reminder.count
      Reminder.delete_all

      counts[:opportunities] = destroy_opportunities!(Opportunity.all)

      counts[:contacts] = Contact.count
      Contact.find_each(&:destroy!)

      delete_opportunity_notifications!

      counts
    end

    def purge_demo_patterns!
      counts = empty_counts
      merge_counts!(counts, purge_landing_demo_data!)

      demo_opps = Opportunity.where(DEMO_OPPORTUNITY_SQL)
      counts[:opportunities] += destroy_opportunities!(demo_opps)

      counts[:flags] += delete_demo_duplicate_flags!

      contacts = Contact.where(DEMO_CONTACT_SQL)
      counts[:contacts] = contacts.count
      contacts.find_each(&:destroy!)

      counts[:flags] += delete_orphan_duplicate_flags!

      counts[:reminders] = delete_demo_reminders!

      counts[:referral_networks] = delete_orphan_referral_networks!

      counts
    end

    # Borra envíos, landings fuera de plantilla (demo-*, copias, pruebas) y recalcula métricas.
    def purge_landing_demo_data!
      counts = { landings: 0, submissions: 0, opportunities: 0 }

      kept_slugs = Landings::TenantSetup.template_slugs_for(ActsAsTenant.current_tenant)
      stray = LandingPage.where.not(slug: kept_slugs)
      counts[:landings] = stray.count
      stray.find_each(&:destroy!)

      submissions = LandingFormSubmission.all
      opp_ids = submissions.where.not(opportunity_id: nil).pluck(:opportunity_id)
      counts[:opportunities] = destroy_opportunities!(Opportunity.where(id: opp_ids)) if opp_ids.any?

      counts[:submissions] = submissions.count
      submissions.delete_all

      recalc_landing_lead_counts!
      counts
    end

    def reset_landing_templates!
      puts "\n[Landings] Sincronizando plantillas por tenant..."
      ActsAsTenant.without_tenant do
        Tenant.find_each do |tenant|
          ActsAsTenant.with_tenant(tenant) do
            Landings::TenantSetup.apply!(tenant)
            n = LandingPage.where(tenant: tenant).count
            slugs = LandingPage.where(tenant: tenant).pluck(:slug).join(", ")
            puts "  → #{tenant.slug}: #{n} landing(s)#{slugs.present? ? " — #{slugs}" : ''}"
          end
        end
      end
    end

    def empty_counts
      { contacts: 0, opportunities: 0, reminders: 0, submissions: 0, flags: 0, landings: 0, referral_networks: 0 }
    end

    def merge_counts!(target, extra)
      extra.each { |k, v| target[k] = target[k].to_i + v.to_i }
    end

    def delete_demo_reminders!
      Reminder.where(
        <<~SQL.squish
          subject ILIKE '%demo%'
          OR message ILIKE '%pack demo%'
          OR NOT EXISTS (SELECT 1 FROM opportunities o WHERE o.id = reminders.opportunity_id)
        SQL
      ).delete_all
    end

    def delete_demo_duplicate_flags!
      demo_contact_ids = Contact.where(DEMO_CONTACT_SQL).select(:id)
      opp_ids = Opportunity.where(contact_id: demo_contact_ids).pluck(:id)
      title_ids = Opportunity.where(DEMO_OPPORTUNITY_SQL).pluck(:id)
      all_ids = (opp_ids + title_ids).uniq
      return 0 if all_ids.empty?

      delete_flags_for_opportunity_ids(all_ids)
    end

    def delete_orphan_referral_networks!
      ReferralNetwork.where(
        <<~SQL.squish
          NOT EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = referral_networks.referrer_user_id AND u.discarded_at IS NULL
          )
          OR NOT EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = referral_networks.referred_user_id AND u.discarded_at IS NULL
          )
        SQL
      ).delete_all
    end

    def delete_orphan_duplicate_flags!
      DuplicateFlag.where(
        <<~SQL.squish
          NOT EXISTS (SELECT 1 FROM opportunities o WHERE o.id = duplicate_flags.opportunity_id)
          OR NOT EXISTS (SELECT 1 FROM opportunities o WHERE o.id = duplicate_flags.duplicate_of_opportunity_id)
        SQL
      ).delete_all
    end

    def delete_flags_for_opportunity_ids(ids)
      return 0 if ids.empty?

      DuplicateFlag.where(opportunity_id: ids)
                   .or(DuplicateFlag.where(duplicate_of_opportunity_id: ids))
                   .delete_all
    end

    def destroy_opportunities!(scope)
      ids = scope.pluck(:id)
      return 0 if ids.empty?

      delete_flags_for_opportunity_ids(ids)
      delete_opportunity_notifications!(ids)
      Opportunity.where(id: ids).find_each(&:destroy!)
      ids.size
    end

    def delete_opportunity_notifications!(opp_ids = nil)
      scope = Notification.where(resource_type: "Opportunity")
      scope = scope.where(resource_id: opp_ids) if opp_ids.present?
      scope.delete_all
    end

    def recalc_landing_lead_counts!
      LandingPage.find_each do |lp|
        real = LandingFormSubmission.where(landing_page_id: lp.id).count
        lp.update_columns(lead_count: real, view_count: 0) if lp.lead_count != real || lp.view_count != 0
      end
    end
  end
end
