# frozen_string_literal: true

# ============================================================================
# DailyBriefingJob — envía el resumen diario a cada usuario activo.
# ============================================================================
# Corre cada mañana via sidekiq-scheduler (config/sidekiq.yml).
# Itera todos los tenants activos y, por cada uno, envía un correo
# personalizado a cada usuario con email válido que tenga oportunidades
# o recordatorios vencidos.
# ============================================================================
class DailyBriefingJob < ApplicationJob
  queue_as :low

  def perform
    ActsAsTenant.without_tenant do
      Tenant.active.find_each do |tenant|
        send_briefings_for(tenant)
      rescue StandardError => e
        Rails.logger.error("[DailyBriefingJob] tenant=#{tenant.id} #{e.class}: #{e.message}")
      end
    end
  end

  private

  def send_briefings_for(tenant)
    ActsAsTenant.with_tenant(tenant) do
      tenant.users.active.where.not(email: [ nil, "" ]).find_each do |user|
        builder = Opportunities::BriefingBuilder.new(user, tenant)
        briefing = builder.call

        next if briefing[:kpis][:total_open].zero? && briefing[:overdue_reminders].empty?

        BriefingMailer.with(briefing: briefing).daily_briefing.deliver_later
      rescue StandardError => e
        Rails.logger.error("[DailyBriefingJob] user=#{user.id} #{e.class}: #{e.message}")
      end
    end
  end
end
