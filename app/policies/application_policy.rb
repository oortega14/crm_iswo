# frozen_string_literal: true

# ============================================================================
# ApplicationPolicy — base para todas las policies (Pundit)
# ============================================================================
# Convención de roles (User#role enum string):
#   admin     → todo permitido en su tenant
#   manager   → CRUD sobre datos de gestión + ve todo el tenant
#   consultant→ ve y edita SUS contactos/oportunidades; ve datos del tenant solo lectura
#   viewer    → solo lectura
#
# Cada policy concreta puede sobreescribir métodos. Por defecto:
#   - admin/manager: pueden todo
#   - consultant/viewer: solo index/show
# ============================================================================
class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user   = user
    @record = record
  end

  def index?  = staff?
  def show?   = staff?
  def create? = manager_or_admin?
  def new?    = create?
  def update? = manager_or_admin?
  def edit?   = update?
  def destroy? = admin?

  protected

  def admin?            = user&.role == "admin"
  def manager?          = user&.role == "manager"
  def consultant?       = user&.role == "consultant"
  def viewer?           = user&.role == "viewer"
  def manager_or_admin? = admin? || manager?
  def staff?            = admin? || manager? || consultant? || viewer?

  # Permite ver/editar el record si pertenece al mismo tenant del usuario.
  # acts_as_tenant ya filtra los queries, esto es defensa en profundidad
  # para llamadas con `find_by` que podrían saltarse el scope.
  def same_tenant?
    return false unless user&.tenant_id
    return true  unless record.respond_to?(:tenant_id)

    record.tenant_id == user.tenant_id
  end

  # =============================================================
  # Scope base — sub-clases la heredan o sobreescriben.
  # =============================================================
  class Scope
    attr_reader :user, :scope

    def initialize(user, scope)
      @user  = user
      @scope = scope
    end

    # Por default todo lo del tenant (acts_as_tenant ya lo filtra).
    def resolve
      scope.all
    end

    protected

    def admin?      = user&.role == "admin"
    def manager?    = user&.role == "manager"
    def consultant? = user&.role == "consultant"
    def viewer?     = user&.role == "viewer"
  end
end
