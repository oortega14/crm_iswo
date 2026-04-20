# frozen_string_literal: true

module Ads
  # ==========================================================================
  # Ads::GoogleLeadProcessor — convierte un lead form de Google Ads en opp.
  # ==========================================================================
  # Formato del payload (Lead Form Extensions webhook):
  #   {
  #     "lead_id":       "...",
  #     "api_version":   "1.0",
  #     "user_column_data": [
  #        { "column_id": "FULL_NAME", "string_value": "..." },
  #        { "column_id": "EMAIL",     "string_value": "..." },
  #        { "column_id": "PHONE_NUMBER", "string_value": "..." }
  #     ],
  #     "campaign_id": "...",
  #     "form_id":     "...",
  #     "gcl_id":      "..."
  #   }
  # ==========================================================================
  class GoogleLeadProcessor
    Result = Struct.new(:tenant, :contact, :opportunity, keyword_init: true)

    COLUMN_MAP = {
      "FULL_NAME"    => "full_name",
      "FIRST_NAME"   => "first_name",
      "LAST_NAME"    => "last_name",
      "EMAIL"        => "email",
      "PHONE_NUMBER" => "phone"
    }.freeze

    def initialize(payload)
      @payload = payload.with_indifferent_access
    end

    def call
      integration = resolve_integration!
      tenant      = integration.tenant

      ActsAsTenant.with_tenant(tenant) do
        attrs   = extract_columns(@payload["user_column_data"])
        contact = upsert_contact(tenant, attrs)
        opp     = create_opportunity(tenant, contact, attrs, integration)

        Result.new(tenant: tenant, contact: contact, opportunity: opp)
      end
    end

    # =========================================================================

    private

    def resolve_integration!
      # Google no manda page_id/customer_id en el webhook directamente; en
      # producción se resuelve por form_id o campaign_id mapeado en metadata.
      form_id = @payload["form_id"].to_s
      scope   = AdIntegration.where(provider: "google_ads", status: "active")

      integration = scope.find_by("metadata->>'form_id' = ?", form_id) if form_id.present?
      integration ||= scope.first

      raise ArgumentError, "AdIntegration google_ads no configurada" unless integration

      integration
    end

    def extract_columns(columns)
      Array(columns).each_with_object({}) do |col, h|
        key = COLUMN_MAP[col["column_id"]] || col["column_id"].to_s.downcase
        val = col["string_value"].presence
        h[key] = val if val.present?
      end
    end

    def upsert_contact(tenant, attrs)
      matches = Opportunities::DuplicateDetector.new(
        phone:     attrs["phone"],
        email:     attrs["email"],
        full_name: attrs["full_name"]
      ).call

      return matches.first.contact if matches.any?

      tenant.contacts.create!(
        first_name:       attrs["first_name"] || attrs["full_name"].to_s.split.first,
        last_name:        attrs["last_name"]  || attrs["full_name"].to_s.split[1..]&.join(" "),
        email:            attrs["email"]&.downcase,
        phone_e164:       attrs["phone"],
        phone_normalized: Phonelib.parse(attrs["phone"]).sanitized,
        source_kind:      "google",
        source_label:     "google_ads"
      )
    end

    def create_opportunity(tenant, contact, _attrs, integration)
      pipeline = tenant.pipelines.find_by(is_default: true) || tenant.pipelines.first
      stage    = pipeline&.pipeline_stages&.order(:position)&.first
      source   = tenant.lead_sources.find_by(kind: "google") || tenant.lead_sources.first

      opp = tenant.opportunities.create!(
        contact:          contact,
        pipeline:         pipeline,
        pipeline_stage:   stage,
        owner_user:       nil,
        lead_source:      source,
        status:           "open",
        title:            "Lead Google Ads ##{@payload['lead_id']}",
        custom_fields:    {
          "google_lead_id"    => @payload["lead_id"],
          "google_form_id"    => @payload["form_id"],
          "google_campaign_id" => @payload["campaign_id"],
          "gcl_id"            => @payload["gcl_id"]
        },
        last_activity_at: Time.current
      )

      opp.opportunity_logs.create!(
        tenant: tenant,
        user:   nil,
        action: "created_from_google",
        changes_data: { lead_id: @payload["lead_id"], integration_id: integration.id }
      )

      opp
    end
  end
end
