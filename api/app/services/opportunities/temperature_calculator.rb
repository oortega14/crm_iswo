# frozen_string_literal: true

module Opportunities
  # ============================================================================
  # TemperatureCalculator — frío / tibio / caliente según BANT y actividad reciente.
  # Usado por BantScorer, AiClassifier (fallback) y sync manual.
  # ============================================================================
  class TemperatureCalculator
    THRESHOLDS = {
      hot_bant_min:  70,
      warm_bant_min: 40,
      hot_days_max:  7,
      warm_days_max: 14
    }.freeze

    Result = Struct.new(:temperature, :reasoning, :next_action, :bant_score, :days_since, keyword_init: true)

    def initialize(opportunity)
      @opp = opportunity
    end

    def call
      score      = @opp.bant_score.to_i
      days_since = days_since_activity

      temp =
        if score >= THRESHOLDS[:hot_bant_min] && days_since <= THRESHOLDS[:hot_days_max]
          "hot"
        elsif score >= THRESHOLDS[:warm_bant_min] || days_since <= THRESHOLDS[:warm_days_max]
          "warm"
        else
          "cold"
        end

      Result.new(
        temperature:  temp,
        reasoning:    reasoning_for(temp, score, days_since),
        next_action:  next_action_for(temp),
        bant_score:   score,
        days_since:   days_since
      )
    end

    # Persiste temperatura y devuelve el resultado.
    def apply!
      result = call
      @opp.update!(temperature: result.temperature)
      result
    end

    private

    def days_since_activity
      return 999 unless @opp.last_activity_at

      ((Time.current - @opp.last_activity_at) / 86_400).round
    end

    def reasoning_for(temp, score, days_since)
      case temp
      when "hot"
        "BANT #{score}/100 y actividad reciente (#{days_since}d). Lead muy comprometido."
      when "warm"
        "BANT #{score}/100 o actividad hace #{days_since} días. Mantener contacto."
      else
        "BANT #{score}/100 y sin actividad reciente (#{days_since}d). Lead frío."
      end
    end

    def next_action_for(temp)
      case temp
      when "hot"  then "Enviar propuesta o agendar llamada de cierre esta semana."
      when "warm" then "Hacer seguimiento por WhatsApp o llamada en los próximos 3 días."
      else             "Reactivar el lead con contenido de valor o un recordatorio."
      end
    end
  end
end
