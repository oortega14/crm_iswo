# frozen_string_literal: true

class PipelineSerializer < ApplicationSerializer
  set_type :pipeline

  attributes :name, :description, :position, :is_default

  attribute :stages_count do |p|
    p.pipeline_stages.size
  end

  has_many :pipeline_stages, serializer: :pipeline_stage
end
