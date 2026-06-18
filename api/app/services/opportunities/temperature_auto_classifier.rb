# frozen_string_literal: true

module Opportunities
  # ============================================================================
  # TemperatureAutoClassifier — clasificación automática (job o sync) tras editar dossier.
  # ============================================================================
  class TemperatureAutoClassifier
    CACHE_PREFIX = "temperature_classify_result"
    CACHE_TTL    = 10.minutes

    OPPORTUNITY_DOSSIER_KEYS = %w[
      notes estimated_value custom_fields title expected_close_on description
    ].freeze

    CONTACT_DOSSIER_KEYS = %w[
      first_name last_name email company_name phone_e164 phone_normalized
      city country notes custom_fields document_id job_title kind
    ].freeze

    class << self
      def enabled?
        AiClassifier.auto_classify_enabled?
      end

      def opportunity_dossier_changed?(changed_keys)
        keys = Array(changed_keys).map(&:to_s)
        keys.any? { |k| OPPORTUNITY_DOSSIER_KEYS.include?(k) }
      end

      def contact_dossier_changed?(changed_keys)
        keys = Array(changed_keys).map(&:to_s)
        keys.any? { |k| CONTACT_DOSSIER_KEYS.include?(k) }
      end

      def read_cached_result(opportunity_id)
        Rails.cache.read("#{CACHE_PREFIX}:#{opportunity_id}")
      end

      def enqueue_for_opportunity!(opportunity:, source:, user:, changed_keys:, ip_address: nil, user_agent: nil)
        return false unless enabled?
        return false unless opportunity_dossier_changed?(changed_keys)

        OpportunityTemperatureClassifyJob.perform_later(
          opportunity.id,
          tenant_id:   opportunity.tenant_id,
          user_id:     user&.id,
          source:      source,
          ip_address:  ip_address,
          user_agent:  user_agent
        )
        true
      end

      def enqueue_for_contact!(contact:, source:, user:, changed_keys:, ip_address: nil, user_agent: nil)
        return [] unless enabled?
        return [] unless contact_dossier_changed?(changed_keys)

        ids = []
        contact.opportunities.kept.open.find_each do |opp|
          OpportunityTemperatureClassifyJob.perform_later(
            opp.id,
            tenant_id:   contact.tenant_id,
            user_id:     user&.id,
            source:      source,
            ip_address:  ip_address,
            user_agent:  user_agent
          )
          ids << opp.id
        end
        ids
      end
    end

    def initialize(opportunity, source:, user: nil, ip_address: nil, user_agent: nil)
      @opportunity = opportunity
      @source      = source
      @user        = user
      @ip_address  = ip_address
      @user_agent  = user_agent
    end

    def call
      return nil unless self.class.enabled?

      opp = @opportunity.reload
      classifier = AiClassifier.new(opp)
      result = classifier.call

      opp.update!(temperature: result.temperature, last_activity_at: Time.current)

      opp.opportunity_logs.create!(
        tenant:       opp.tenant,
        user:         @user,
        action:       "classify",
        changes_data: LogSanitizer.redact(
          {
            temperature:     result.temperature,
            ai_used:         result.ai_used?,
            model:           result.ai_used? ? AiClassifier.model_name : nil,
            fallback_reason: result.fallback_reason,
            source:          @source
          }.compact
        ),
        ip_address:   @ip_address,
        user_agent:   @user_agent
      )

      payload = {
        temperature:     result.temperature,
        reasoning:       result.reasoning,
        next_action:     result.next_action,
        ai_used:         result.ai_used?,
        fallback_reason: result.fallback_reason,
        data_considered: result.data_considered,
        source:          @source,
        classified_at:   Time.current.iso8601
      }

      self.class.store_result!(opp.id, payload)
      payload
    end

    def self.store_result!(opportunity_id, payload)
      Rails.cache.write("#{CACHE_PREFIX}:#{opportunity_id}", payload, expires_in: CACHE_TTL)
    end
  end
end
