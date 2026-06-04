# frozen_string_literal: true

require "rails_helper"

RSpec.describe TenantFieldDefinition do
  let(:tenant) { ActsAsTenant.current_tenant }

  describe "validaciones" do
    it "válido con atributos mínimos" do
      field = build(:tenant_field_definition, tenant: tenant)
      expect(field).to be_valid
    end

    describe "key" do
      it "requerido" do
        expect(build(:tenant_field_definition, tenant: tenant, key: "")).not_to be_valid
      end

      it "acepta minúsculas, números y guion bajo" do
        %w[empleador nit_empleador campo1 a_b_c].each do |k|
          expect(build(:tenant_field_definition, tenant: tenant, key: k)).to be_valid
        end
      end

      it "rechaza mayúsculas" do
        expect(build(:tenant_field_definition, tenant: tenant, key: "Empleador")).not_to be_valid
      end

      it "rechaza espacios y guiones" do
        expect(build(:tenant_field_definition, tenant: tenant, key: "campo uno")).not_to be_valid
        expect(build(:tenant_field_definition, tenant: tenant, key: "campo-uno")).not_to be_valid
      end

      it "rechaza clave duplicada en mismo tenant+entidad" do
        create(:tenant_field_definition, tenant: tenant, key: "duplicado", entity: "opportunity")
        dup = build(:tenant_field_definition,  tenant: tenant, key: "duplicado", entity: "opportunity")
        expect(dup).not_to be_valid
        expect(dup.errors[:key]).to be_present
      end

      it "permite misma clave en distinta entidad" do
        create(:tenant_field_definition, tenant: tenant, key: "campo", entity: "opportunity")
        other = build(:tenant_field_definition, tenant: tenant, key: "campo", entity: "contact")
        expect(other).to be_valid
      end
    end

    describe "field_type" do
      it "acepta tipos válidos" do
        %w[text number select date boolean currency].each do |t|
          expect(build(:tenant_field_definition, tenant: tenant, field_type: t)).to be_valid
        end
      end

      it "rechaza tipo desconocido" do
        expect(build(:tenant_field_definition, tenant: tenant, field_type: "file")).not_to be_valid
      end
    end

    describe "entity" do
      it "acepta opportunity y contact" do
        expect(build(:tenant_field_definition, tenant: tenant, entity: "opportunity")).to be_valid
        expect(build(:tenant_field_definition, tenant: tenant, entity: "contact")).to be_valid
      end

      it "rechaza entidad desconocida" do
        expect(build(:tenant_field_definition, tenant: tenant, entity: "deal")).not_to be_valid
      end
    end
  end

  describe "scopes" do
    let!(:active_opp)     { create(:tenant_field_definition, tenant: tenant, entity: "opportunity", active: true)  }
    let!(:inactive_opp)   { create(:tenant_field_definition, tenant: tenant, entity: "opportunity", active: false) }
    let!(:active_contact) { create(:tenant_field_definition, :for_contact, tenant: tenant, active: true) }

    it ".active filtra solo activos" do
      expect(described_class.active).to include(active_opp, active_contact)
      expect(described_class.active).not_to include(inactive_opp)
    end

    it ".for_entity filtra por entidad" do
      expect(described_class.for_entity("opportunity")).to include(active_opp, inactive_opp)
      expect(described_class.for_entity("opportunity")).not_to include(active_contact)
    end

    it ".ordered ordena por position" do
      f1 = create(:tenant_field_definition, tenant: tenant, position: 2)
      f2 = create(:tenant_field_definition, tenant: tenant, position: 0)
      f3 = create(:tenant_field_definition, tenant: tenant, position: 1)
      expect(described_class.ordered.to_a.map(&:position)).to eq(
        described_class.ordered.map(&:position).sort
      )
    end
  end
end
