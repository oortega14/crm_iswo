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
  NAME_KEYS    = %w[full_name name nombre nombre_completo].freeze
  EMAIL_KEYS   = %w[email correo e_mail].freeze
  PHONE_KEYS   = %w[phone telefono celular whatsapp mobile].freeze
  COMPANY_KEYS = %w[company empresa compania organization].freeze
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
        contact     = apply_payload_to_contact!(contact)
        opportunity = create_opportunity!(contact)

        @submission.update!(
          contact:      contact,
          opportunity:  opportunity,
          processed_at: Time.current
        )
        # lead_count ya se incrementa en Public::LandingFormSubmissionsController#create
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
        phone_normalized: normalized_phone.present? ? Phonelib.parse(phone).sanitized : nil,
        company_name:     extract(COMPANY_KEYS),
        custom_fields:    extra_fields.stringify_keys,
        source_kind:      "web",
        source_label:     @landing&.slug
      )
    end
  end

  # Actualiza contacto existente o recién creado con lo enviado en el formulario.
  def apply_payload_to_contact!(contact)
    phone = normalized_phone
    updates = {}
    updates[:first_name]   = first_name if first_name.present?
    updates[:last_name]    = last_name if last_name.present?
    updates[:email]        = email if email.present?
    updates[:phone_e164]   = phone if phone.present?
    if phone.present?
      updates[:phone_normalized] = Phonelib.parse(phone).sanitized
    end
    company = extract(COMPANY_KEYS)
    updates[:company_name] = company if company.present?

    extras = extra_fields
    if extras.present?
      updates[:custom_fields] = (contact.custom_fields || {}).merge(extras.stringify_keys)
    end

    contact.update!(updates) if updates.present?
    contact
  end

  def create_opportunity!(contact)
    pipeline = @tenant.pipelines.find_by(is_default: true) || @tenant.pipelines.first
    stage    = pipeline&.pipeline_stages&.order(:position)&.first
    source   = @tenant.lead_sources.find_by(kind: "web") || @tenant.lead_sources.first
    owner    = next_round_robin_owner

    opp = @tenant.opportunities.create!(
      contact:          contact,
      pipeline:         pipeline,
      pipeline_stage:   stage,
      owner_user:       owner,
      lead_source:      source,
      status:           "new_lead",
      title:            "Lead landing: #{@landing&.title || 'Formulario público'}",
      custom_fields:    opportunity_custom_fields,
      notes:            opportunity_notes_from_payload,
      last_activity_at: Time.current
    )

    opp.opportunity_logs.create!(
      tenant:       @tenant,
      user:         nil,
      action:       "create",
      changes_data: {
        landing_id: @landing&.id,
        utm:        utm_fields,
        form:       stored_form_payload
      }.compact
    )

    Notifications::NewLeadNotifier.call(
      opportunity:  opp,
      source_kind:  "web",
      source_label: @landing&.title.presence || @landing&.slug
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

    country = @tenant.locale.to_s.split("-").last.presence || "CO"
    parsed = Phonelib.parse(raw, country)
    parsed.valid? ? parsed.e164 : nil
  end

  def extra_fields
    @payload.except(*(NAME_KEYS + EMAIL_KEYS + PHONE_KEYS + COMPANY_KEYS + %w[first_name last_name])).to_h
  end

  def utm_fields
    {
      utm_source:   @submission.utm_source,
      utm_medium:   @submission.utm_medium,
      utm_campaign: @submission.utm_campaign,
      utm_term:     @submission.utm_term,
      utm_content:  @submission.utm_content
    }.compact.stringify_keys
  end

  def landing_tracking_fields
    return {} unless @landing

    {
      "landing_page_id" => @landing.id.to_s,
      "landing_slug"    => @landing.slug,
      "landing_title"   => @landing.title
    }
  end

  def opportunity_custom_fields
    utm_fields
      .merge(landing_tracking_fields)
      .merge(extra_fields.stringify_keys)
      .merge(
        "landing_submission" => {
          "submission_id" => @submission.id,
          "submitted_at"  => Time.current.iso8601,
          "payload"       => stored_form_payload
        }
      )
  end

  def stored_form_payload
    @payload.to_h.transform_values { |v| v.is_a?(String) ? v.strip.truncate(500) : v }
  end

  def opportunity_notes_from_payload
    lines = []
    lines << "Envío landing: #{@landing&.title || @landing&.slug || 'formulario'}"
    stored_form_payload.each do |key, value|
      next if value.blank?

      lines << "#{key.to_s.humanize}: #{value}"
    end
    lines.join("\n").presence
  end

  def next_round_robin_owner
    Leads::RoundRobinOwner.call(@tenant)
  end
end
