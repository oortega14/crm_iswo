# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # ReferralNetworksController — red de consultores
    # ========================================================================
    class ReferralNetworksController < BaseController
      before_action :set_edge, only: :destroy

      # GET /api/v1/referral_networks
      def index
        scope = policy_scope(ReferralNetwork).includes(:referrer_user, :referred_user)
        render_collection(scope, with: ReferralNetworkSerializer)
      end

      # POST /api/v1/referral_networks  { referrer_user_id, referred_user_id, depth? }
      def create
        authorize ReferralNetwork
        edge = current_tenant.referral_networks.new(edge_params)
        if edge.save
          render_created(edge, with: ReferralNetworkSerializer)
        else
          render_unprocessable(edge)
        end
      end

      def destroy
        authorize @edge
        @edge.destroy
        render_no_content
      end

      # GET /api/v1/referral_networks/tree?root_user_id=...&depth=3
      def tree
        root_id   = params.fetch(:root_user_id, current_user.id).to_i
        max_depth = [params.fetch(:depth, 3).to_i, 10].min

        render json: { data: build_tree(root_id, max_depth) }, status: :ok
      end

      # GET /api/v1/referral_networks/my_network
      def my_network
        render json: { data: build_tree(current_user.id, 5) }, status: :ok
      end

      private

      def set_edge
        @edge = current_tenant.referral_networks.find(params[:id])
      end

      def edge_params
        params.require(:referral_network).permit(:referrer_user_id, :referred_user_id, :depth, :active)
      end

      def build_tree(root_id, max_depth)
        sql = <<~SQL
          WITH RECURSIVE tree AS (
            SELECT referrer_user_id, referred_user_id, 1 AS lvl
            FROM referral_networks
            WHERE tenant_id = :tenant_id AND referrer_user_id = :root_id AND active = true
            UNION ALL
            SELECT r.referrer_user_id, r.referred_user_id, t.lvl + 1
            FROM referral_networks r
            INNER JOIN tree t ON r.referrer_user_id = t.referred_user_id
            WHERE t.lvl < :max_depth AND r.tenant_id = :tenant_id AND r.active = true
          )
          SELECT referrer_user_id, referred_user_id, lvl FROM tree
        SQL

        rows = ActiveRecord::Base.connection.exec_query(
          ActiveRecord::Base.sanitize_sql([sql, { tenant_id: current_tenant.id, root_id: root_id, max_depth: max_depth }])
        )

        users_by_id = current_tenant.users
                                     .where(id: rows.flat_map { |r| [r["referrer_user_id"], r["referred_user_id"]] }.uniq + [root_id])
                                     .index_by(&:id)

        {
          root: user_node(users_by_id[root_id]),
          edges: rows.map do |r|
            {
              referrer_id: r["referrer_user_id"],
              referred_id: r["referred_user_id"],
              depth:       r["lvl"],
              referred:    user_node(users_by_id[r["referred_user_id"]])
            }
          end
        }
      end

      def user_node(u)
        return nil if u.blank?

        { id: u.id, name: u.name, role: u.role, active: u.active }
      end
    end
  end
end
