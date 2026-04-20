# frozen_string_literal: true

# ============================================================================
# LandingSubmissionProcessor — procesa un LandingFormSubmission público.
# ============================================================================
# Flujo:
#   1. Extrae nombre/email/teléfono del payload (heurística por keys comunes).
#   2. Normaliza teléfono a E.164 (Phonelib).
#   3. Busca duplicados con DuplicateDetector; si hay match >= 0.85 reusa
#      el contacto y encola DuplicateResolutionJob; si no, crea uno nuevo.
#   4. Crea Opportunity en el pipeline default del tenant, stage inicial.
#   5. Asigna owner por round-robin (o según la landing.default_owner_id).
#   6. Marca submission.processed_at y submission.contact/opportunity.
#
# Se llama desde el controller público o vía job (#call_later).
# ============================================================================
class LandingSubmissionProcessor
  NAME_KEYS  = %w[full_name name nombre nombre_completo].freeze
  EMAIL_KEYS = %w[email correo e_mail].freeze
  PHONE_KEYS = %w[phone telefono celular whatsapp mobile].freeze
  DUP_THRESHOLD = 0.85

  def initialize(submission)
    @submission = submission
    @tenant     = submission.tenant
    @payload    = (submission.payload || {}).with_indifferent_access
    @landing    = submission.landing_page
  end

  def call_later
    LandingSubmissionProcessorJob.perform_later(@submission.id) if defined?(LandingSubmissionProcessorJob)
  end

  def call
    ActsAsTenant.with_tenant(@tenant) do
      ActiveRecord::Base.transaction do
        contact     = find_or_create_contact!
        opportunity = create_opportunity!(contact)

        @submission.update!(
          contact:      contact,
          opportunity:  opportunity,
          processed_at: Time.current
        )
      end
    end
    true
  rescue StandardError => e
    Rails.logger.error("[LandingSubmissionProcessor] submission=#{@submission.id} #{e.class}: #{e.message}")
    @submission.update(process_error: e.message.truncate(500)) if @submission.respond_to?(:process_error)
    false
  end

  # ===========================================================================

  private

  def find_or_create_contact!
    phone = normalized_phone
    email = extract(EMAIL_KEYS)&.downcase

    matches = Opportunities::DuplicateDetector.new(
      phone:     phone,
      email:     email,
      full_name: full_name,
      threshold: DUP_THRESHOLD
    ).call

    if matches.any?
      matches.first.contact
    else
      @tenant.contacts.create!(
        first_name:       first_name,
        last_name:        last_name,
        email:            email,
        phone_e164:       phone,
        phone_normalized: Phonelib.parse(phone).sanitized,
        custom_fields:    extra_fields,
        source_kind:      "web",
        source_label:     @landing&.slug
      )
    end
  end

  def create_opportunity!(contact)
    pipeline = @tenant.pipelines.find_by(is_default: true) || @tenant.pipelines.first
    stage    = pipeline&.pipeline_stages&.order(:position)&.first
    source   = @tenant.lead_sources.find_by(kind: "web") || @tenant.lead_sources.first
    owner    = @landing&.default_owner || next_round_robin_owner

    opp = @tenant.opportunities.create!(
      contact:          contact,
      pipeline:         pipeline,
      pipeline_stage:   stage,
      owner_user:       owner,
      lead_source:      source,
      status:           "open",
      title:            "Lead landing: #{@landing&.title || 'Formulario público'}",
      custom_fields:    utm_fields,
      last_activity_at: Time.current
    )

    opp.opportunity_logs.create!(
      tenant:       @tenant,
      user:         nil,
      action:       "created_from_landing",
      changes_data: { landing_id: @landing&.id, utm: utm_fields }
    )

    opp
  end

  # --- Extracción del payload --------------------------------------------

  def extract(keys)
    keys.each { |k| v = @payload[k]; return v if v.present? }
    nil
  end

  def full_name
    extract(NAME_KEYS) || [@payload[:first_name], @payload[:last_name]].compact.join(" ").presence
  end

  def first_name
    if @payload[:first_name].present?
      @payload[:first_name]
    else
      full_name.to_s.split.first
    end
  end

  def last_name
    if @payload[:last_name].present?
      @payload[:last_name]
    else
      full_name.to_s.split[1..]&.join(" ")
    end
  end

  def normalized_phone
    raw = extract(PHONE_KEYS)
    return nil if raw.blank?

    parsed = Phonelib.parse(raw, @tenant.country_code || "CO")
    parsed.valid? ? parsed.e164 : raw
  end

  def extra_fields
    @payload.except(*(NAME_KEYS + EMAIL_KEYS + PHONE_KEYS + %w[first_name last_name])).to_h
  end

  def utm_fields
    {
      utm_source:   @submission.utm_source,
      utm_medium:   @submission.utm_medium,
      utm_campaign: @submission.utm_campaign,
      utm_term:     @submission.utm_term,
      utm_content:  @submission.utm_content
    }.compact
  end

  # Round-robin simple: el consultant con menos opportunities abiertas.
  def next_round_robin_owner
    @tenant.users
           .where(role: "consultant", active: true)
           .left_joins(:owned_opportunities)
           .where(opportunities: { status: [nil, "open"] })
           .group("users.id")
           .order(Arel.sql("COUNT(opportunities.id) ASC"))
           .first
  end
end
