# frozen_string_literal: true

class PipelineStageSerializer < ApplicationSerializer
  set_type :pipeline_stage

  attributes :name, :description, :position, :probability,
             :closed_won, :closed_lost, :color

  attribute :terminal do |s|
    s.closed_won || s.closed_lost
  end

  belongs_to :pipeline, serializer: :pipeline
end
