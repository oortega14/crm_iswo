# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # Búsqueda global (barra "Buscar" / ⌘K) — contactos y oportunidades
    # visibles según Pundit; sin datos de demostración.
    # ========================================================================
    class SearchesController < BaseController
      MAX_PER_TYPE = 8

      def index
        authorize Contact, :index?
        authorize Opportunity, :index?

        q = params[:q].to_s.strip
        return render json: { data: [] }, status: :ok if q.length < 2

        like = "%#{ActiveRecord::Base.sanitize_sql_like(q)}%"

        contact_rows     = contact_hits(like)
        opportunity_rows = opportunity_hits(like)

        data = (contact_rows + opportunity_rows)
                 .sort_by { |r| -r[:_sort].to_f }
                 .map { |r| r.except(:_sort) }

        render json: { data: data }, status: :ok
      end

      private

      def contact_hits(like)
        scope = policy_scope(Contact).kept
        scope = scope.where(
          "first_name ILIKE :q OR last_name ILIKE :q OR company_name ILIKE :q OR email ILIKE :q OR phone_normalized ILIKE :q",
          q: like
        )
        scope = scope.order(updated_at: :desc).limit(MAX_PER_TYPE)

        scope.map do |c|
          {
            type:     "contact",
            id:       c.id.to_s,
            title:    c.display_name,
            subtitle: [c.email.presence, c.company_name.presence].compact.join(" · ").presence,
            url:      "/contacts?selected=#{c.id}",
            _sort:    c.updated_at.to_f
          }
        end
      end

      def opportunity_hits(like)
        scope = policy_scope(Opportunity).kept
        scope = scope.left_joins(:contact)
        scope = scope.where(
          "opportunities.title ILIKE :q OR contacts.first_name ILIKE :q OR " \
          "contacts.last_name ILIKE :q OR contacts.company_name ILIKE :q OR contacts.email ILIKE :q",
          q: like
        )
        scope = scope.includes(:contact, :pipeline_stage)
        scope = scope.order(updated_at: :desc).limit(MAX_PER_TYPE)

        scope.map do |o|
          contact_label = o.contact&.display_name
          {
            type:     "opportunity",
            id:       o.id.to_s,
            title:    o.title,
            subtitle: [contact_label, o.pipeline_stage&.name].compact.join(" · ").presence,
            url:      "/opportunities?selected=#{o.id}",
            _sort:    o.updated_at.to_f
          }
        end
      end
    end
  end
end
