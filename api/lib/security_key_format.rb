# frozen_string_literal: true

# ============================================================================
# SecurityKeyFormat — valida el formato de LOCKBOX_MASTER_KEY / BLIND_INDEX_MASTER_KEY.
# ============================================================================
# Usado por config/initializers/00_lockbox.rb, config/initializers/blind_index.rb
# y lib/tasks/security_encrypt_contacts.rake — antes cada uno reimplementaba su
# propia copia de este regex.
# ============================================================================
module SecurityKeyFormat
  HEX_64 = /\A[0-9a-fA-F]{64}\z/

  module_function

  def valid?(key)
    key.to_s.strip.match?(HEX_64)
  end
end
