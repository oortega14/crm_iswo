# frozen_string_literal: true

# ============================================================================
# WebMock — bloquea cualquier request externo no stubeado.
# ============================================================================
WebMock.disable_net_connect!(
  allow_localhost: true,
  allow:           ["chromedriver.storage.googleapis.com"]
)
