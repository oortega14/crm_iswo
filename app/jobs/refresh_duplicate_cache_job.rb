# frozen_string_literal: true

# ============================================================================
# RefreshDuplicateCacheJob — recorre contactos y genera DuplicateFlags.
# ============================================================================
# Programado nocturno (sidekiq-scheduler). Escanea los contactos creados
# en las últimas 24h y busca candidatos duplicados dentro del tenant.
# Por cada match >= 0.85 crea un DuplicateFlag pending (idempotente por el
# índice único del par).
#
# Alternativa: se podría mover a un MATERIALIZED VIEW refrescada aquí, pero
# la tabla de flags sirve bien para la UI de resolución.
# ============================================================================
class RefreshDuplicateCacheJob < ApplicationJob
  queue_as :low

  SCAN_WINDOW = 24.hours
  DUP_THRESHOLD = 0.85

  def perform
    ActsAsTenant.without_tenant do
      Tenant.active.find_each do |tenant|
        ActsAsTenant.with_tenant(tenant) { scan_tenant(tenant) }
      end
    end
  end

  private

  def scan_tenant(tenant)
    recent = tenant.contacts.where("created_at > ?", SCAN_WINDOW.ago)
    recent.find_each do |contact|
      matches = Opportunities::DuplicateDetector.new(
        phone:              contact.phone_e164,
        email:              contact.email,
        full_name:          contact.full_name,
        exclude_contact_id: contact.id,
        threshold:          DUP_THRESHOLD
      ).call

      matches.each do |m|
        create_flag(tenant, contact, m)
      end
    end
  end

  def create_flag(tenant, contact, match)
    a, b = [contact.id, match.contact.id].sort
    DuplicateFlag.find_or_create_by!(tenant: tenant, contact_a_id: a, contact_b_id: b) do |f|
      f.matched_on  = match.matched_on
      f.match_score = match.score
      f.resolution  = "pending"
    end
  rescue ActiveRecord::RecordNotUnique
    # índice único en (contact_a_id, contact_b_id) — carrera benigna.
  end
end
