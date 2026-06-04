# frozen_string_literal: true

class TenantFieldDefinitionSerializer < ApplicationSerializer
  set_type :tenant_field_definition

  attributes :key, :label, :field_type, :options, :required,
             :entity, :position, :active
end
