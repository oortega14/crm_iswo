# frozen_string_literal: true

# ============================================================================
# OpportunityLog — audit log específico de cada Opportunity
# ============================================================================
# Se alimenta desde callbacks del modelo Opportunity y desde controllers
# cuando se ejecutan acciones especiales (export, merge, reassign, note).
# ============================================================================
class OpportunityLog < ApplicationRecord
  include TenantScoped

  ACTIONS = %w[create update stage_change assign merge export note merged destroy].freeze
  enum :action, ACTIONS.zip(ACTIONS).to_h, prefix: :action

  # Campos de contacto que se enmascaran antes de persistir (A.8.11)
  SENSITIVE_FIELDS = %w[email phone_e164 phone_normalized contact_email contact_phone].freeze

  belongs_to :tenant
  belongs_to :opportunity, optional: true
  belongs_to :user, optional: true

  validates :action, inclusion: { in: ACTIONS }

  before_create :mask_sensitive_fields!

  scope :recent, -> { order(created_at: :desc) }

  private

  def mask_sensitive_fields!
    return unless changes_data.is_a?(Hash)

    self.changes_data = deep_mask(changes_data)
  end

  def deep_mask(obj)
    case obj
    when Hash
      obj.each_with_object({}) do |(k, v), h|
        h[k] = SENSITIVE_FIELDS.include?(k.to_s) ? mask_value(v) : deep_mask(v)
      end
    when Array
      obj.map { |el| deep_mask(el) }
    else
      obj
    end
  end

  def mask_value(val)
    return val unless val.is_a?(String) && val.present?

    if val.include?("@")
      parts = val.split("@")
      "#{parts[0][0]}#{"*" * (parts[0].length - 1)}@#{parts[1]}"
    else
      "#{val[0..1]}#{"*" * [val.length - 3, 4].max}#{val[-1]}"
    end
  end
end
