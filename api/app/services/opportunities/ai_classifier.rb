# frozen_string_literal: true

module Opportunities
  # ============================================================================
  # AiClassifier — clasifica la temperatura de un lead llamando a Claude Haiku
  # via la Anthropic Messages API.
  #
  # Si ANTHROPIC_API_KEY no está definida, devuelve una clasificación
  # basada en reglas simples (fallback determinista, sin llamada HTTP).
  #
  # Uso:
  #   result = Opportunities::AiClassifier.new(opportunity).call
  #   result.temperature  # => "hot" | "warm" | "cold"
  #   result.reasoning    # => "El lead tiene BANT alto y fue contactado hace 1 día..."
  #   result.next_action  # => "Enviar propuesta económica esta semana"
  #   result.ai_used?     # => true | false
  # ============================================================================
  class AiClassifier
    ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
    MODEL             = "claude-haiku-4-5-20251001"
    MAX_TOKENS        = 300
    TIMEOUT_SECONDS   = 20

    Result = Struct.new(:temperature, :reasoning, :next_action, :ai_used, keyword_init: true) do
      def ai_used? = ai_used
    end

    def initialize(opportunity)
      @opp = opportunity
    end

    def call
      key = ENV["ANTHROPIC_API_KEY"].to_s.strip
      return rule_based_result if key.blank?

      classify_with_claude(key)
    rescue Faraday::TimeoutError, Faraday::ConnectionFailed => e
      Rails.logger.warn("[AiClassifier] Fallo de red: #{e.class} — #{e.message}. Usando reglas.")
      rule_based_result
    rescue StandardError => e
      Rails.logger.error("[AiClassifier] Error inesperado: #{e.class} — #{e.message}")
      rule_based_result
    end

    private

    # ---- Llamada a la API de Anthropic --------------------------------------

    def classify_with_claude(api_key)
      conn = Faraday.new(url: ANTHROPIC_API_URL) do |f|
        f.request  :json
        f.response :json
        f.options.timeout      = TIMEOUT_SECONDS
        f.options.open_timeout = TIMEOUT_SECONDS
      end

      body = {
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        system:     system_prompt,
        messages:   [{ role: "user", content: user_prompt }]
      }

      res = conn.post("") do |req|
        req.headers["x-api-key"]         = api_key
        req.headers["anthropic-version"] = "2023-06-01"
        req.body = body
      end

      unless res.success?
        err = res.body.is_a?(Hash) ? res.body.dig("error", "message") : res.body.to_s
        Rails.logger.warn("[AiClassifier] Anthropic respondió #{res.status}: #{err}")
        return rule_based_result
      end

      parse_claude_response(res.body)
    end

    def parse_claude_response(body)
      text = body.dig("content", 0, "text").to_s.strip

      # Esperamos JSON: { "temperature": "...", "reasoning": "...", "next_action": "..." }
      parsed = JSON.parse(text)
      raise JSON::ParserError, "expected Hash" unless parsed.is_a?(Hash)

      temp = parsed["temperature"].to_s.downcase
      temp = "cold" unless %w[cold warm hot].include?(temp)

      Result.new(
        temperature: temp,
        reasoning:   parsed["reasoning"].to_s.truncate(500),
        next_action: parsed["next_action"].to_s.truncate(300),
        ai_used:     true
      )
    rescue JSON::ParserError
      # Claude devolvió texto libre — intentamos extraer temperatura
      temp =
        if text.match?(/\bhot\b/i)   then "hot"
        elsif text.match?(/\bwarm\b/i) then "warm"
        else "cold"
        end
      Result.new(temperature: temp, reasoning: text.truncate(400), next_action: nil, ai_used: true)
    end

    # ---- Prompts ------------------------------------------------------------

    def system_prompt
      <<~SYSTEM.strip
        Eres un asistente CRM experto en clasificar el nivel de interés de leads.
        Clasifica la oportunidad en "hot", "warm" o "cold" según los datos del lead.
        Responde ÚNICAMENTE con JSON válido en este formato exacto (sin markdown, sin backticks):
        {"temperature":"hot|warm|cold","reasoning":"...","next_action":"..."}
        - reasoning: máx 120 palabras en español, explica por qué elegiste esa temperatura.
        - next_action: acción concreta recomendada para el consultor, máx 40 palabras.
      SYSTEM
    end

    def user_prompt
      bant = (@opp.bant_data || {}).with_indifferent_access
      bant_parts = []
      bant_parts << "Budget #{bant.dig(:budget, :score).to_i}/100"    if bant.dig(:budget, :score).to_i > 0
      bant_parts << "Authority #{bant.dig(:authority, :score).to_i}/100" if bant.dig(:authority, :score).to_i > 0
      bant_parts << "Need #{bant.dig(:need, :score).to_i}/100"        if bant.dig(:need, :score).to_i > 0
      bant_parts << "Timeline #{bant.dig(:timeline, :score).to_i}/100" if bant.dig(:timeline, :score).to_i > 0

      days_since = if @opp.last_activity_at
                     ((Time.current - @opp.last_activity_at) / 86_400).round
                   end

      lines = []
      lines << "Oportunidad: #{@opp.title}"
      lines << "Contacto: #{@opp.contact&.display_name}"
      lines << "Empresa: #{@opp.contact&.company_name}"    if @opp.contact&.company_name.present?
      lines << "Valor estimado: #{@opp.estimated_value} #{@opp.currency}"
      lines << "Estado: #{@opp.status}"
      lines << "Etapa: #{@opp.pipeline_stage&.name}"       if @opp.pipeline_stage&.name.present?
      lines << "BANT (#{@opp.bant_score}/100): #{bant_parts.join(', ')}" if bant_parts.any?
      lines << "Días sin actividad: #{days_since}"         if days_since
      lines << "Notas: #{@opp.notes.truncate(300)}"        if @opp.notes.present?
      lines << "Temperatura actual: #{@opp.temperature}"

      lines.join("\n")
    end

    # ---- Fallback basado en reglas ------------------------------------------

    def rule_based_result
      score = @opp.bant_score.to_i

      days_since = if @opp.last_activity_at
                     ((Time.current - @opp.last_activity_at) / 86_400).round
                   else
                     999
                   end

      temp =
        if score >= 70 && days_since <= 7
          "hot"
        elsif score >= 40 || days_since <= 14
          "warm"
        else
          "cold"
        end

      reasoning =
        case temp
        when "hot"  then "BANT #{score}/100 y actividad reciente (#{days_since}d). Lead muy comprometido."
        when "warm" then "BANT #{score}/100 o actividad hace #{days_since} días. Mantener contacto."
        else             "BANT #{score}/100 y sin actividad hace #{days_since} días. Lead frío."
        end

      Result.new(
        temperature: temp,
        reasoning:   reasoning,
        next_action: next_action_for(temp),
        ai_used:     false
      )
    end

    def next_action_for(temp)
      case temp
      when "hot"  then "Enviar propuesta o agendar llamada de cierre esta semana."
      when "warm" then "Hacer seguimiento por WhatsApp o llamada en los próximos 3 días."
      else             "Reactivar el lead con contenido de valor o descuento."
      end
    end
  end
end
