# frozen_string_literal: true

# ============================================================================
# SecurityTaskReport — ✅/❌/⚠️ compartido por las tareas rake de seguridad
# (security:infra, security:rls, security:pii, prod:security_dry_run) y por
# staging:preflight. Antes cada .rake redefinía su propio par de lambdas
# report/warn_item con el mismo formato.
# ============================================================================
class SecurityTaskReport
  attr_reader :failures, :warnings, :results

  def initialize
    @failures = 0
    @warnings = 0
    @results  = []
  end

  def report(name, ok, detail = nil)
    icon = ok ? "✅" : "❌"
    puts detail.present? ? "#{icon} #{name} — #{detail}" : "#{icon} #{name}"
    @results << { name: name, ok: ok, detail: detail }
    @failures += 1 unless ok
    ok
  end

  def warn_item(name, detail)
    puts "⚠️  #{name} — #{detail}"
    @results << { name: name, ok: true, detail: "WARN: #{detail}" }
    @warnings += 1
  end

  # Para fallos detectados fuera de un report(...) puntual (p. ej. un
  # subprocess o una subtask de Rake invocada aparte).
  def fail!
    @failures += 1
  end
end
