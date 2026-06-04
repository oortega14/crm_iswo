# frozen_string_literal: true

module Opportunities
  # ============================================================================
  # AiClassifier — temperatura con Claude (Anthropic Messages API).
  # Sin API key válida → TemperatureCalculator (reglas).
  # ============================================================================
  class AiClassifier
    ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
    DEFAULT_MODEL     = "claude-haiku-4-5-20251001"
    FALLBACK_MODEL    = "claude-3-5-haiku-20241022"
    MAX_TOKENS        = 400
    TIMEOUT_SECONDS   = 25

    attr_reader :last_status, :last_error

    Result = Struct.new(:temperature, :reasoning, :next_action, :ai_used, :fallback_reason, keyword_init: true) do
      def ai_used? = ai_used
    end

    class << self
      def api_key
        raw = ENV["ANTHROPIC_API_KEY"].to_s.strip
        # Quitar comillas al copiar desde .env / consola
        raw = raw.delete_prefix('"').delete_suffix('"').delete_prefix("'").delete_suffix("'").strip
        raw.presence
      end

      def configured?
        api_key.present?
      end

      def model_name
        ENV.fetch("ANTHROPIC_MODEL", DEFAULT_MODEL).to_s.strip.presence || DEFAULT_MODEL
      end

      def auto_classify_on_bant?
        configured? && ActiveModel::Type::Boolean.new.cast(
          ENV.fetch("ANTHROPIC_AUTO_CLASSIFY_TEMPERATURE", "false")
        )
      end
    end

    def initialize(opportunity)
      @opp = opportunity
      @last_status = nil
      @last_error  = nil
    end

    def call
      key = self.class.api_key
      return rule_based_result("missing_api_key") if key.blank?

      classify_with_claude(key)
    rescue Faraday::TimeoutError, Faraday::ConnectionFailed => e
      @last_error = e.message
      Rails.logger.warn("[AiClassifier] Red: #{e.class} — #{e.message}")
      rule_based_result("network_error")
    rescue StandardError => e
      @last_error = e.message
      Rails.logger.error("[AiClassifier] #{e.class}: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}")
      rule_based_result("unexpected_error")
    end

    private

    def classify_with_claude(api_key)
      models = [self.class.model_name, FALLBACK_MODEL].uniq
      models.each do |model|
        response = post_to_anthropic(api_key, model)
        @last_status = response.status

        if response.success?
          body = parse_response_body(response.body)
          return parse_claude_response(body)
        end

        @last_error = extract_api_error(response)
        Rails.logger.warn("[AiClassifier] Anthropic #{response.status} (#{model}): #{@last_error}")
        # Reintenta solo si el modelo no existe; otros errores (401, 402) no sirve cambiar modelo
        break unless response.status == 404 || @last_error.to_s.match?(/model|not_found/i)
      end

      rule_based_result("api_error")
    end

    def post_to_anthropic(api_key, model)
      payload = {
        model:      model,
        max_tokens: MAX_TOKENS,
        system:     system_prompt,
        messages:   [{ role: "user", content: user_prompt }]
      }

      Faraday.post(
        ANTHROPIC_API_URL,
        payload.to_json,
        {
          "Content-Type"    => "application/json",
          "x-api-key"       => api_key,
          "anthropic-version" => "2023-06-01"
        }
      ) do |req|
        req.options.timeout      = TIMEOUT_SECONDS
        req.options.open_timeout = TIMEOUT_SECONDS
      end
    end

    def parse_response_body(raw)
      return raw if raw.is_a?(Hash)

      JSON.parse(raw.to_s)
    rescue JSON::ParserError
      { "content" => [{ "text" => raw.to_s }] }
    end

    def extract_api_error(response)
      body = parse_response_body(response.body)
      return body.dig("error", "message").to_s if body.is_a?(Hash)

      response.body.to_s.truncate(300)
    rescue StandardError
      "HTTP #{response.status}"
    end

    def parse_claude_response(body)
      body = parse_response_body(body) unless body.is_a?(Hash)
      text = body.dig("content", 0, "text").to_s.strip
      raise JSON::ParserError, "empty response" if text.blank?

      parsed = JSON.parse(extract_json_text(text))
      raise JSON::ParserError, "expected Hash" unless parsed.is_a?(Hash)

      temp = parsed["temperature"].to_s.downcase
      temp = "cold" unless Opportunity::TEMPERATURES.include?(temp)

      Result.new(
        temperature:     temp,
        reasoning:       parsed["reasoning"].to_s.truncate(500),
        next_action:     parsed["next_action"].to_s.truncate(300),
        ai_used:         true,
        fallback_reason: nil
      )
    rescue JSON::ParserError
      temp =
        if text.match?(/\bhot\b/i)   then "hot"
        elsif text.match?(/\bwarm\b/i) then "warm"
        else "cold"
        end
      Result.new(
        temperature:     temp,
        reasoning:       text.truncate(400),
        next_action:     nil,
        ai_used:         true,
        fallback_reason: nil
      )
    end

    def extract_json_text(text)
      fenced = text.match(/```(?:json)?\s*(\{.*?\})\s*```/m)
      return fenced[1] if fenced

      bare = text.match(/\{.*\}/m)
      return bare[0] if bare

      text
    end

    def system_prompt
      <<~SYSTEM.strip
        Eres un consultor comercial senior en un CRM B2B latinoamericano (metodología BANT).
        Clasifica el interés del lead en exactamente una temperatura:
        - "hot": listo para cerrar o muy comprometido (propuesta, urgencia, BANT alto, actividad reciente).
        - "warm": interés real pero necesita nurturing o seguimiento en días.
        - "cold": bajo compromiso, sin actividad o BANT débil.

        Responde ÚNICAMENTE JSON válido (sin markdown):
        {"temperature":"hot|warm|cold","reasoning":"...","next_action":"..."}
        reasoning: español, máx 100 palabras, cita datos concretos del lead.
        next_action: una acción concreta para el consultor, máx 35 palabras.
      SYSTEM
    end

    def user_prompt
      bant = (@opp.bant_data || {}).with_indifferent_access
      bant_parts = []
      %i[budget authority need timeline].each do |dim|
        sc = bant.dig(dim, :score).to_i
        bant_parts << "#{dim}: #{sc}/100" if sc.positive?
      end

      days_since =
        if @opp.last_activity_at
          ((Time.current - @opp.last_activity_at) / 86_400).round
        end

      recent_logs = @opp.opportunity_logs.order(created_at: :desc).limit(5).map do |log|
        "- #{log.action} (#{log.created_at&.strftime('%d/%m')})"
      end

      lines = []
      lines << "Oportunidad: #{@opp.title}"
      lines << "Contacto: #{@opp.contact&.display_name}"
      lines << "Empresa: #{@opp.contact&.company_name}" if @opp.contact&.company_name.present?
      if @opp.contact
        lines << "Teléfono/email: #{[@opp.contact.phone_normalized, @opp.contact.email].compact.join(' / ')}"
      end
      lines << "Origen: #{@opp.lead_source&.name || 'desconocido'}"
      lines << "Valor estimado: #{@opp.estimated_value} #{@opp.currency}"
      lines << "Estado CRM: #{@opp.status} · Etapa: #{@opp.pipeline_stage&.name}"
      lines << "BANT total: #{@opp.bant_score}/100#{bant_parts.any? ? " (#{bant_parts.join(', ')})" : ''}"
      lines << "Días sin actividad: #{days_since}" if days_since
      lines << "Temperatura actual en sistema: #{@opp.temperature}"
      lines << "Notas: #{@opp.notes.truncate(400)}" if @opp.notes.present?
      if recent_logs.any?
        lines << "Actividad reciente:"
        lines.concat(recent_logs)
      end

      lines.join("\n")
    end

    def rule_based_result(reason)
      calc = TemperatureCalculator.new(@opp).call
      Result.new(
        temperature:     calc.temperature,
        reasoning:       calc.reasoning,
        next_action:     calc.next_action,
        ai_used:         false,
        fallback_reason: reason
      )
    end
  end
end
