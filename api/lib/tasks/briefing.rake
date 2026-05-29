# frozen_string_literal: true

namespace :briefing do
  desc "Envía un briefing de prueba al email indicado (o admin@iswo.local). En dev: http://localhost:3000/letter_opener"
  task :send_test, [ :email ] => :environment do |_t, args|
    email = args[:email].presence || ENV.fetch("BRIEFING_TEST_EMAIL", "admin@iswo.local")

    user = User.active.find_by(email: email)
    unless user
      abort "No hay usuario activo con email #{email}. Ejecuta: bin/rails db:seed"
    end

    tenant = user.tenant
    ActsAsTenant.with_tenant(tenant) do
      scope = OpportunityPolicy::Scope.new(user, Opportunity.all).resolve
      briefing = Opportunities::BriefingBuilder.new(user, tenant, opportunity_scope: scope).call

      puts "Tenant: #{tenant.slug}"
      puts "Usuario: #{user.email}"
      puts "KPIs: abiertas=#{briefing[:kpis][:total_open]} calientes=#{briefing[:kpis][:hot_count]} vencidos=#{briefing[:kpis][:overdue_count]}"

      if briefing[:kpis][:total_open].zero? && briefing[:overdue_reminders].empty?
        puts "AVISO: sin oportunidades abiertas ni recordatorios vencidos — el job diario no enviaría correo."
        puts "       Se envía igualmente un correo de prueba."
      end

      mail = BriefingMailer.with(briefing: briefing).daily_briefing
      mail.deliver_now

      puts "✓ Correo enviado a #{user.email}"
      if Rails.env.development?
        puts "  Bandeja local: http://localhost:3000/letter_opener"
      end
    end
  end

  desc "Ejecuta DailyBriefingJob (todos los tenants activos)"
  task run_job: :environment do
    DailyBriefingJob.perform_now
    puts "✓ DailyBriefingJob terminado"
    puts "  En development los correos están en http://localhost:3000/letter_opener" if Rails.env.development?
  end
end
