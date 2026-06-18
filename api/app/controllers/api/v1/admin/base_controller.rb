# frozen_string_literal: true

module Api
  module V1
    module Admin
      # Base para endpoints /api/v1/admin/* (tenant plataforma super-admin).
      class BaseController < ApplicationController
        include Devise::Controllers::Helpers
        include ErrorHandler
        include PlatformTenantAuthorizable
      end
    end
  end
end
