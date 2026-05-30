# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # OpportunitiesController — CRUD + acciones de dominio + Kanban + export
    # ========================================================================
    class OpportunitiesController < BaseController
      include ExportAuditable
      include ExportDownloadable

      before_action :set_opportunity, only: %i[show update destroy move_stage assign merge recalculate_bant classify sync_temperature]

      # GET /api/v1/opportunities
      def index
        scope = policy_scope(Opportunity).kept.includes(:contact, :pipeline_stage, :owner_user, :reminders, :lead_source)

        scope = scope.where(status: params[:status])                       if params[:status].present?
        scope = scope.where(pipeline_id: params[:pipeline_id])             if params[:pipeline_id].present?
        if params[:pipeline_stage_id].present?
          scope = scope.where(pipeline_stage_id: params[:pipeline_stage_id])
        elsif params[:stage_id].present?
          scope = scope.where(pipeline_stage_id: params[:stage_id])
        end
        scope = scope.where(contact_id: params[:contact_id])               if params[:contact_id].present?
        scope = scope.where(owner_user_id: params[:owner_id])              if params[:owner_id].present?
        if params[:q].present?
          like = "%#{ActiveRecord::Base.sanitize_sql_like(params[:q].to_s.strip)}%"
          scope = scope.left_joins(:contact).where(
            "opportunities.title ILIKE :q OR contacts.first_name ILIKE :q OR " \
            "contacts.last_name ILIKE :q OR contacts.company_name ILIKE :q OR contacts.email ILIKE :q",
            q: like
          )
        end
        scope = scope.stale(params[:stale_days].to_i)                      if params[:stale_days].present?
        if params[:temperature].present? && Opportunity::TEMPERATURES.include?(params[:temperature].to_s)
          scope = scope.where(temperature: params[:temperature])
        end

        render_collection(
          scope.order(last_activity_at: :desc),
          with:  OpportunitySerializer,
          include: [:owner_user, :lead_source]
        )
      end

      def show
        authorize @opportunity
        render_resource(@opportunity, with: OpportunitySerializer, include: [:owner_user, :lead_source])
      end

      def create
        authorize Opportunity
        attrs = opportunity_create_attributes
        h     = attrs.to_h.symbolize_keys
        contact = resolve_contact_for_opportunity!(h)
        stage_id = h[:pipeline_stage_id].presence || h[:stage_id].presence
        if stage_id.blank?
          @opportunity = current_tenant.opportunities.new
          @opportunity.errors.add(:pipeline_stage_id, "no puede estar en blanco")
          return render_unprocessable(@opportunity)
        end

        # Siempre derivar el pipeline de la etapa: evita 422 cuando el SPA envía un pipeline_id
        # desfasado respecto a la etapa (p. ej. tras cambiar embudo sin actualizar etapa).
        stage = current_tenant.pipeline_stages.find_by(id: stage_id)
        unless stage
          @opportunity = current_tenant.opportunities.new
          @opportunity.errors.add(:pipeline_stage_id, "no es válida o no pertenece a este tenant")
          return render_unprocessable(@opportunity)
        end

        @opportunity = current_tenant.opportunities.new(
          title:             h[:title].presence || default_opportunity_title(contact, h),
          notes:             h[:notes],
          estimated_value:   h[:estimated_value],
          temperature:       h[:temperature].presence || 'cold',
          pipeline_id:       stage.pipeline_id,
          pipeline_stage_id: stage.id,
          lead_source_id:    h[:lead_source_id].presence,
          contact:           contact,
          owner_user:        current_user,
          currency:          current_tenant.currency
        )
        if @opportunity.save
          log_action!("create", @opportunity.attributes)
          flag_duplicates_for!(@opportunity, contact)
          if defined?(Opportunities::TemperatureCalculator)
            Opportunities::TemperatureCalculator.new(@opportunity.reload).apply!
          end
          render_created(@opportunity, with: OpportunitySerializer, include: [:owner_user, :lead_source])
        else
          render_unprocessable(@opportunity)
        end
      rescue ActiveRecord::RecordInvalid => e
        render json: {
          error:   "unprocessable_entity",
          message: "Validación fallida",
          details: e.record.errors.as_json(full_messages: true)
        }, status: :unprocessable_entity
      end

      def update
        authorize @opportunity
        before = @opportunity.attributes.dup
        bant_in = params.dig(:opportunity, :bant_data).present?
        attrs = update_params.to_h
        apply_stage_status!(attrs)
        if @opportunity.update(attrs)
          if bant_in && defined?(Opportunities::BantScorer)
            Opportunities::BantScorer.new(@opportunity).call_and_persist!
            @opportunity.reload
          end
          @opportunity.touch_activity!
          log_action!("update", diff(before, @opportunity.attributes))
          render_resource(@opportunity, with: OpportunitySerializer, include: [:owner_user, :lead_source])
        else
          render_unprocessable(@opportunity)
        end
      end

      def destroy
        authorize @opportunity
        log_action!("destroy", { title: @opportunity.title, contact_id: @opportunity.contact_id })
        @opportunity.discard
        render_no_content
      end

      # POST /api/v1/opportunities/:id/move_stage  { pipeline_stage_id }
      def move_stage
        authorize @opportunity, :move_stage?
        new_stage = current_tenant.pipeline_stages.find(params.require(:pipeline_stage_id))
        from = @opportunity.pipeline_stage_id

        new_status = if new_stage.closed_won  then "won"
                     elsif new_stage.closed_lost then "lost"
                     else @opportunity.status
                     end

        ActiveRecord::Base.transaction do
          @opportunity.update!(
            pipeline_stage_id: new_stage.id,
            pipeline_id:       new_stage.pipeline_id,
            status:            new_status
          )
          @opportunity.touch_activity!
          log_action!("stage_change", { from_stage_id: from, to_stage_id: new_stage.id })
        end

        render_resource(@opportunity, with: OpportunitySerializer, include: [:owner_user, :lead_source])
      end

      # POST /api/v1/opportunities/:id/assign  { owner_user_id }
      def assign
        authorize @opportunity, :assign?
        new_owner = current_tenant.users.find(params.require(:owner_user_id))
        from = @opportunity.owner_user_id
        @opportunity.update!(owner_user_id: new_owner.id)
        log_action!("assign", { from: from, to: new_owner.id })
        render_resource(@opportunity, with: OpportunitySerializer, include: [:owner_user, :lead_source])
      end

      # POST /api/v1/opportunities/:id/merge  { target_id }
      def merge
        authorize @opportunity, :merge?
        target = current_tenant.opportunities.find(params.require(:target_id))
        if defined?(Opportunities::Merger)
          Opportunities::Merger.new(source: @opportunity, target: target, performed_by: current_user).call
        end
        render_resource(target.reload, with: OpportunitySerializer, include: [:owner_user, :lead_source])
      end

      # POST /api/v1/opportunities/:id/recalculate_bant
      def recalculate_bant
        authorize @opportunity, :recalculate_bant?
        Opportunities::BantScorer.new(@opportunity).call_and_persist! if defined?(Opportunities::BantScorer)
        @opportunity.reload
        payload = OpportunitySerializer.new(
          @opportunity,
          include: [:owner_user, :lead_source]
        ).serializable_hash
        ai_meta = maybe_auto_classify_with_claude!
        payload[:meta] = ai_meta if ai_meta.present?
        render json: payload, status: :ok
      end

      # POST /api/v1/opportunities/:id/sync_temperature — reglas BANT + actividad (sin IA)
      def sync_temperature
        authorize @opportunity, :update?
        calc = Opportunities::TemperatureCalculator.new(@opportunity).apply!
        log_action!("classify", { temperature: calc.temperature, ai_used: false, source: "rules" })

        render json: {
          data:      OpportunitySerializer.new(@opportunity.reload, include: [:owner_user, :lead_source]).serializable_hash[:data],
          ai_result: {
            temperature: calc.temperature,
            reasoning:   calc.reasoning,
            next_action: calc.next_action,
            ai_used:     false
          }
        }, status: :ok
      end

      # POST /api/v1/opportunities/:id/classify — Claude (Anthropic) o reglas si no hay API key
      def classify
        authorize @opportunity, :update?
        classifier = Opportunities::AiClassifier.new(@opportunity.reload)
        result = classifier.call
        @opportunity.update!(temperature: result.temperature, last_activity_at: Time.current)
        log_action!(
          "classify",
          {
            temperature:     result.temperature,
            ai_used:         result.ai_used?,
            model:           result.ai_used? ? Opportunities::AiClassifier.model_name : nil,
            fallback_reason: result.fallback_reason,
            anthropic_error: classifier.last_error
          }.compact
        )

        render json: classify_response_payload(result, classifier), status: :ok
      end

      # GET /api/v1/opportunities/kanban?pipeline_id=...
      def kanban
        authorize Opportunity, :kanban?
        pipeline = current_tenant.pipelines.find(params.require(:pipeline_id))
        stages   = pipeline.pipeline_stages.order(:position)

        scope = policy_scope(Opportunity).kept.where(pipeline: pipeline).includes(:contact, :owner_user)
        grouped = scope.group_by(&:pipeline_stage_id)

        render json: {
          data: stages.map do |stage|
            {
              stage:         PipelineStageSerializer.new(stage).serializable_hash[:data],
              opportunities: OpportunitySerializer.new(grouped[stage.id] || []).serializable_hash[:data] || []
            }
          end
        }, status: :ok
      end

      # POST /api/v1/opportunities/export
      # GET /api/v1/opportunities/export.csv | export.xlsx — RFC §6.7
      def export_download
        export_download_for("opportunities")
      end

      def export
        authorize Opportunity, :export?
        file_format = resolve_export_file_format
        filters     = normalize_export_filters_param
        export = current_tenant.exports.create!(
          user:     current_user,
          resource: "opportunities",
          format:   file_format,
          filters:  filters
        )
        safe_enqueue_export_generation_job(export.id)
        record_export_audit!(resource: "opportunities", format: file_format, filters: filters, sync: false)
        render_resource(export, with: ExportSerializer, status: :accepted)
      end

      private

      def set_opportunity
        @opportunity = current_tenant.opportunities.kept.includes(:lead_source, :owner_user).find(params[:id])
      end

      def opportunity_create_attributes
        raw = params[:opportunity].presence || params[:data]
        raise ActionController::ParameterMissing, :opportunity if raw.blank?

        raw.permit(
          :contact_id, :pipeline_id, :pipeline_stage_id, :stage_id,
          :contact_name, :contact_email, :contact_phone, :company_name,
          :title, :notes, :estimated_value, :status, :temperature,
          :expected_close_date, :lead_source_id,
          custom_fields: {}, bant_data: {}
        )
      end

      def resolve_contact_for_opportunity!(attrs)
        attrs = attrs.symbolize_keys
        if attrs[:contact_id].present?
          return current_tenant.contacts.kept.find(attrs[:contact_id])
        end

        name = attrs[:contact_name].to_s.strip
        if name.blank?
          c = current_tenant.contacts.new
          c.errors.add(:contact_name, "es obligatorio")
          raise ActiveRecord::RecordInvalid.new(c)
        end

        parts  = name.split(/\s+/, 2)
        email  = attrs[:contact_email].to_s.strip.presence
        phone  = attrs[:contact_phone].to_s.strip.presence
        company = attrs[:company_name].to_s.strip.presence

        if email.present?
          hit = current_tenant.contacts.kept.where("LOWER(email) = ?", email.downcase).first
          return hit if hit
        end

        if phone.present?
          parsed = Phonelib.parse(phone, "CO")
          if parsed.valid?
            hit = current_tenant.contacts.kept.find_by(phone_e164: parsed.e164)
            return hit if hit
          end
        end

        contact = current_tenant.contacts.new(
          first_name:   parts[0],
          last_name:    parts[1],
          email:        email,
          phone_e164:   phone,
          company_name: company,
          kind:         "person",
          owner_user:   current_user
        )
        contact.save!
        contact
      end

      def default_opportunity_title(contact, h)
        base = contact.display_name
        comp = h[:company_name].to_s.strip.presence
        comp ? "#{base} — #{comp}" : base
      end

      def update_params
        params.require(:opportunity).permit(
          :title, :notes, :estimated_value, :temperature,
          :expected_close_date, :lost_reason, :lead_source_id,
          :pipeline_stage_id,
          custom_fields: {},
          bant_data: {
            budget:    [:score, :answer],
            authority: [:score, :answer],
            need:      [:score, :answer],
            timeline:  [:score, :answer]
          }
        )
      end

      # Misma lógica que move_stage: al cambiar etapa vía PATCH, sincronizar status.
      def apply_stage_status!(attrs)
        stage_id = attrs["pipeline_stage_id"] || attrs[:pipeline_stage_id]
        return if stage_id.blank?

        stage = current_tenant.pipeline_stages.find_by(id: stage_id)
        return unless stage

        if stage.closed_won
          attrs["status"] = "won"
        elsif stage.closed_lost
          attrs["status"] = "lost"
        end
      end

      def maybe_auto_classify_with_claude!
        return {} unless Opportunities::AiClassifier.auto_classify_on_bant?

        result = Opportunities::AiClassifier.new(@opportunity).call
        return { temperature_ai: { ai_used: false, fallback_reason: result.fallback_reason } } unless result.ai_used?

        @opportunity.update!(temperature: result.temperature)
        log_action!(
          "classify",
          {
            temperature: result.temperature,
            ai_used:     true,
            model:       Opportunities::AiClassifier.model_name,
            source:      "auto_bant"
          }
        )

        {
          temperature_ai: {
            ai_used:     true,
            temperature: result.temperature,
            reasoning:   result.reasoning,
            next_action: result.next_action,
            model:       Opportunities::AiClassifier.model_name
          }
        }
      end

      def classify_response_payload(result, classifier = nil)
        {
          data:      OpportunitySerializer.new(@opportunity.reload, include: [:owner_user, :lead_source]).serializable_hash[:data],
          ai_result: {
            temperature:     result.temperature,
            reasoning:       result.reasoning,
            next_action:     result.next_action,
            ai_used:         result.ai_used?,
            fallback_reason: result.fallback_reason
          },
          meta:      {
            claude_configured: Opportunities::AiClassifier.configured?,
            model:             result.ai_used? ? Opportunities::AiClassifier.model_name : nil,
            ai_used:           result.ai_used?,
            anthropic_status:  classifier&.last_status,
            anthropic_error:   classifier&.last_error
          }.compact
        }
      end

      def log_action!(action, changes_data)
        @opportunity.opportunity_logs.create!(
          tenant:       current_tenant,
          user:         current_user,
          action:       action,
          changes_data: LogSanitizer.redact(changes_data),
          ip_address:   request.remote_ip,
          user_agent:   request.user_agent
        )
      end

      def diff(before, after)
        keys = (before.keys + after.keys).uniq - %w[updated_at]
        keys.each_with_object({}) do |k, h|
          h[k] = { from: before[k], to: after[k] } if before[k] != after[k]
        end
      end

      # Crea DuplicateFlag para cada oportunidad abierta existente del mismo
      # contacto que no tenga ya un flag con la oportunidad recién creada.
      def flag_duplicates_for!(opportunity, contact)
        existing_opps = current_tenant.opportunities.kept
                                      .where(contact_id: contact.id)
                                      .where.not(id: opportunity.id)
                                      .where.not(status: %w[won lost merged])

        existing_opps.find_each do |existing|
          flags = DuplicateFlag.where(tenant_id: current_tenant.id)
          next if flags.exists?(opportunity_id: opportunity.id, duplicate_of_opportunity_id: existing.id)
          next if flags.exists?(opportunity_id: existing.id, duplicate_of_opportunity_id: opportunity.id)

          matched = if contact.email.present? && contact.phone_e164.present?
                      "both"
                    elsif contact.phone_e164.present?
                      "phone"
                    else
                      "email"
                    end

          flag = DuplicateFlag.create!(
            tenant:                   current_tenant,
            opportunity:              opportunity,
            duplicate_of_opportunity: existing,
            detected_by_user:         current_user,
            matched_on:               matched,
            match_score:              1.0
          )
          notify_duplicate_collision!(flag, existing)
        rescue ActiveRecord::RecordInvalid => e
          Rails.logger.warn("[DuplicateFlag] No se pudo crear flag opp=#{opportunity.id} vs #{existing.id}: #{e.message}")
        end
      end

      # Notifica al dueño de la oportunidad existente que hay un posible duplicado.
      def notify_duplicate_collision!(flag, existing_opp)
        owner = existing_opp.owner_user
        return unless owner

        Notification.create!(
          tenant:        current_tenant,
          user:          owner,
          kind:          "duplicate_found",
          title:         "Posible duplicado detectado",
          body:          "#{current_user.name} registró una oportunidad para #{existing_opp.contact&.display_name} " \
                         "que ya tienes en tu pipeline.",
          resource:      flag,
          resource_type: "DuplicateFlag",
          resource_id:   flag.id
        )
      rescue ActiveRecord::RecordInvalid => e
        Rails.logger.warn("[Notification] No se pudo crear notificación de duplicado: #{e.message}")
      end
    end
  end
end
