# frozen_string_literal: true

module Reminders
  # @deprecated Usar MessageComposer#due_whatsapp
  module StaffWhatsappBody
    module_function

    def for(reminder)
      MessageComposer.for(reminder).due_whatsapp
    end
  end
end
