# frozen_string_literal: true

# ============================================================================
# ApplicationJob — base para todos los jobs del CRM.
# ============================================================================
# - Corre sobre Solid Queue (PostgreSQL), configurado en config/environments/*.
# - Colas: critical, default, integrations, exports, low (ver config/queue.yml).
# - Tareas recurrentes: config/recurring.yml
# ============================================================================
class ApplicationJob < ActiveJob::Base
  # retry_on / discard_on según cada job
end
