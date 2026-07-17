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
      attrs       = extract_columns(@payload["user_column_data"])

      result = Opportunities::LeadImporter.new(
        tenant:        tenant,
        attrs:         attrs,
        source_kind:   "google",
        source_label:  "google_ads",
        title:         "Lead Google Ads ##{@payload['lead_id']}",
        custom_fields: {
          "google_lead_id"     => @payload["lead_id"],
          "google_form_id"     => @payload["form_id"],
          "google_campaign_id" => @payload["campaign_id"],
          "gcl_id"             => @payload["gcl_id"],
          "integration_id"     => integration.id
        }
      ).call

      Result.new(tenant: tenant, contact: result.contact, opportunity: result.opportunity)
    end

    # =========================================================================

    private

    def resolve_integration!
      # Google no manda page_id/customer_id en el webhook directamente; se
      # resuelve por form_id (o campaign_id) mapeado en la metadata de la
      # integración. El job corre sin tenant (without_tenant), así que este
      # scope abarca TODAS las integraciones google del sistema: NO se debe
      # caer a `scope.first`, porque eso asignaría el lead a un tenant
      # arbitrario (fuga cross-tenant). Si no hay match explícito, se falla.
      form_id     = @payload["form_id"].to_s
      campaign_id = @payload["campaign_id"].to_s
      scope       = AdIntegration.where(provider: "google", status: "active")

      integration   = scope.find_by("metadata->>'form_id' = ?", form_id) if form_id.present?
      integration ||= scope.find_by("metadata->>'campaign_id' = ?", campaign_id) if campaign_id.present?

      unless integration
        raise ArgumentError,
              "AdIntegration google no resuelta (form_id=#{form_id.presence || '∅'}, " \
              "campaign_id=#{campaign_id.presence || '∅'}): no se asigna el lead a un tenant arbitrario"
      end

      integration
    end

    def extract_columns(columns)
      Array(columns).each_with_object({}) do |col, h|
        key = COLUMN_MAP[col["column_id"]] || col["column_id"].to_s.downcase
        val = col["string_value"].presence
        h[key] = val if val.present?
      end
    end
  end
end
