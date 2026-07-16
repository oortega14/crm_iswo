# frozen_string_literal: true

module Auth
  # Resuelve el tenant para login / recuperación de contraseña.
  # - Sin slug (ni subdominio): busca por email entre tenants activos.
  # - Con slug explícito (p. ej. super-admin): usa ese tenant.
  class LoginTenantResolver
    AUTO_SLUG = "_auto"

    Result = Struct.new(:status, :tenant, :slug, :tenants, keyword_init: true)

    def self.call(slug: nil, email: nil, subdomain_slug: nil)
      new(slug: slug, email: email, subdomain_slug: subdomain_slug).call
    end

    def initialize(slug:, email:, subdomain_slug:)
      @slug           = slug.to_s.strip.downcase.presence
      @email          = email.to_s.downcase.strip
      @subdomain_slug = subdomain_slug.to_s.strip.downcase.presence
    end

    def call
      explicit = @slug.presence
      explicit = nil if explicit == AUTO_SLUG

      # Un slug explícito que no corresponde a ningún tenant es un error real de
      # cliente (typo, config vieja) — no lo enmascaramos resolviendo por email.
      return resolve_explicit(explicit) if explicit.present? && !tenant_exists?(explicit)

      # Prioridad al correo: evita que localStorage/subdominio stale (p. ej. micasita)
      # fuerce el tenant equivocado al entrar con admin@iswo.local.
      if @email.present?
        by_email = resolve_from_email
        return by_email if %i[ok ambiguous].include?(by_email.status)
        return by_email if by_email.status == :no_account
      end

      return resolve_explicit(explicit) if explicit.present?
      return resolve_explicit(@subdomain_slug) if @subdomain_slug.present?

      resolve_from_email
    end

    private

    def tenant_exists?(slug)
      ActsAsTenant.without_tenant { Tenant.kept.exists?(slug: slug) }
    end

    def resolve_explicit(slug)
      tenant = find_active_tenant(slug)
      return Result.new(status: :not_found, slug: slug) unless tenant
      return Result.new(status: :inactive, slug: slug) unless tenant.active?

      Result.new(status: :ok, tenant: tenant, slug: slug)
    end

    def resolve_from_email
      return Result.new(status: :missing_email) if @email.blank?

      tenants = tenants_for_email(@email)
      return Result.new(status: :no_account) if tenants.empty?

      if tenants.size == 1
        return Result.new(status: :ok, tenant: tenants.first)
      end

      commercial = tenants.reject { |t| PlatformTenant.slug?(t.slug) }
      if commercial.size == 1
        return Result.new(status: :ok, tenant: commercial.first)
      end

      Result.new(
        status:  :ambiguous,
        tenants: tenants.map { |t| { slug: t.slug, name: t.name } }
      )
    end

    def tenants_for_email(email)
      ActsAsTenant.without_tenant do
        User.kept.active
            .joins(:tenant)
            .merge(Tenant.kept.where(active: true))
            .where(email: email)
            .includes(:tenant)
            .map(&:tenant)
            .uniq
      end
    end

    def find_active_tenant(slug)
      ActsAsTenant.without_tenant { Tenant.kept.find_by(slug: slug) }
    end
  end
end
