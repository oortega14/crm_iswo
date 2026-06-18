# frozen_string_literal: true

module Reminders
  # Recordatorios solo para usuarios operativos (admin, manager, consultant).
  module StaffRecipient
    ROLES = %w[admin manager consultant].freeze

    module_function

    def eligible?(user)
      user.present? && ROLES.include?(user.role)
    end

    def phone_e164(user)
      return nil if user&.phone.blank?

      parsed = Phonelib.parse(user.phone)
      parsed.valid? ? parsed.full_e164 : nil
    end
  end
end
