# frozen_string_literal: true

module Ads
  # ==========================================================================
  # Ads::MetaLeadProcessor — convierte un leadgen de Meta en contacto + opp.
  # ==========================================================================
  # El WebhookProcessorJob recibe `{ leadgen_id:, page_id:, form_id:, ad_id:, ... }`.
  # Este servicio:
  #   1. Resuelve el tenant por `page_id` contra AdIntegration.account_identifier.
  #   2. Llama a Graph API: GET /{leadgen_id}?fields=field_data,form_id,ad_id,...
  #   3. Parsea field_data → hash plano (email, full_name, phone_number).
  #   4. Invoca LandingSubmissionProcessor-like flow (contact + opportunity).
  # ==========================================================================
  class MetaLeadProcessor
    Result = Struct.new(:tenant, :contact, :opportunity, keyword_init: true)

    def initialize(payload)
      @payload = payload.with_indifferent_access
    end

    def call
      integration = resolve_integration!
      tenant      = integration.tenant

      lead_data = fetch_leadgen(integration, @payload["leadgen_id"])
      attrs     = flatten_field_data(lead_data["field_data"])

      result = Opportunities::LeadImporter.new(
        tenant:        tenant,
        attrs:         attrs,
        source_kind:   "meta",
        source_label:  "meta_ads",
        title:         "Lead Meta Ads ##{@payload['leadgen_id']}",
        custom_fields: attrs.except("email", "phone", "full_name", "first_name", "last_name").merge(
          "meta_leadgen_id"  => @payload["leadgen_id"],
          "meta_ad_id"       => @payload["ad_id"],
          "meta_form_id"     => @payload["form_id"],
          "meta_campaign_id" => @payload["campaign_id"],
          "integration_id"   => integration.id
        )
      ).call

      Result.new(tenant: tenant, contact: result.contact, opportunity: result.opportunity)
    end

    # =========================================================================

    private

    def resolve_integration!
      page_id = @payload["page_id"] || @payload.dig("value", "page_id")
      raise ArgumentError, "page_id ausente en payload Meta" if page_id.blank?

      AdIntegration
        .where(provider: "meta", status: "active")
        .find_by!(account_identifier: page_id.to_s)
    end

    def fetch_leadgen(integration, leadgen_id)
      token = integration.credentials["access_token"]
      raise "Meta integration sin access_token" if token.blank?

      conn = Faraday.new(url: "https://graph.facebook.com") do |f|
        f.response :json
        f.options.timeout = 15
      end

      res = conn.get("/v18.0/#{leadgen_id}", {
        access_token: token,
        fields: "field_data,form_id,ad_id,adset_id,campaign_id,created_time"
      })
      raise "Meta Graph respondió #{res.status}" unless res.success?

      res.body
    end

    def flatten_field_data(field_data)
      Array(field_data).each_with_object({}) do |item, h|
        name = item["name"].to_s
        val  = Array(item["values"]).first
        h[normalize_key(name)] = val if val.present?
      end
    end

    def normalize_key(k)
      case k.downcase
      when "email"                        then "email"
      when "phone_number", "phone"        then "phone"
      when "full_name", "nombre completo" then "full_name"
      when "first_name"                   then "first_name"
      when "last_name"                    then "last_name"
      else k.downcase
      end
    end
  end
end
