# frozen_string_literal: true

module Opportunities
  # ==========================================================================
  # Opportunities::Merger — fusiona dos oportunidades duplicadas.
  # ==========================================================================
  # Reglas de merge:
  #   - `target` permanece (es el "ganador").
  #   - `source` se descarta (Discard) y se le marca status="merged".
  #   - Se mueven al target: reminders, opportunity_logs, whatsapp_messages,
  #     duplicate_flags resueltos.
  #   - Datos faltantes en target se llenan con source (no sobreescribe).
  #   - Genera OpportunityLog action="merged" en el target.
  #
  # Atómico (ActiveRecord::Base.transaction). Si algo falla, rollback completo.
  # ==========================================================================
  class Merger
    Result = Struct.new(:target, :source, :moved_counts, keyword_init: true)

    def initialize(source:, target:, performed_by:)
      raise ArgumentError, "source y target deben ser distintos" if source.id == target.id
      raise ArgumentError, "deben pertenecer al mismo tenant"     if source.tenant_id != target.tenant_id

      @source       = source
      @target       = target
      @performed_by = performed_by
    end

    def call
      counts = { reminders: 0, logs: 0, whatsapp_messages: 0, duplicate_flags: 0 }

      ActiveRecord::Base.transaction do
        fill_missing_fields!
        counts[:reminders]         = move_association!(:reminders)
        counts[:logs]              = move_association!(:opportunity_logs)
        counts[:whatsapp_messages] = move_association!(:whatsapp_messages) if @source.respond_to?(:whatsapp_messages)
        counts[:duplicate_flags]   = resolve_duplicate_flags!

        @source.update!(status: "merged")
        @source.discard if @source.respond_to?(:discard)

        log_merge!(counts)
        @target.touch_activity! if @target.respond_to?(:touch_activity!)
      end

      Result.new(target: @target.reload, source: @source.reload, moved_counts: counts)
    end

    # =========================================================================

    private

    # Solo llena attrs que estén en blanco en el target.
    MERGEABLE_FIELDS = %i[
      estimated_value bant_score expected_close_date notes
      lead_source_id pipeline_id pipeline_stage_id
    ].freeze

    def fill_missing_fields!
      attrs = MERGEABLE_FIELDS.each_with_object({}) do |field, h|
        next if @target.public_send(field).present?

        value = @source.public_send(field)
        h[field] = value if value.present?
      end

      # Merge superficial de bant_data y custom_fields.
      if @source.respond_to?(:bant_data) && @source.bant_data.present?
        attrs[:bant_data] = (@source.bant_data || {}).merge(@target.bant_data || {})
      end
      if @source.respond_to?(:custom_fields) && @source.custom_fields.present?
        attrs[:custom_fields] = (@source.custom_fields || {}).merge(@target.custom_fields || {})
      end

      @target.update!(attrs) if attrs.any?
    end

    def move_association!(name)
      relation = @source.public_send(name)
      count    = relation.count
      relation.update_all(opportunity_id: @target.id) if count.positive?
      count
    end

    def resolve_duplicate_flags!
      flags = DuplicateFlag.where(
        "(opportunity_a_id = :s AND opportunity_b_id = :t) OR (opportunity_a_id = :t AND opportunity_b_id = :s)",
        s: @source.id, t: @target.id
      )
      count = flags.count
      flags.update_all(resolution: "merged", resolved_at: Time.current, resolved_by_user_id: @performed_by&.id)
      count
    end

    def log_merge!(counts)
      @target.opportunity_logs.create!(
        tenant: @target.tenant,
        user:   @performed_by,
        action: "merged",
        changes_data: {
          source_opportunity_id: @source.id,
          moved: counts,
          merged_by: @performed_by&.id,
          merged_at: Time.current.iso8601
        }
      )
    end
  end
end
