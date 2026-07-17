# frozen_string_literal: true

require "rails_helper"

RSpec.describe Maintenance::DemoDataPurger do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:owner)  { create(:user, :consultant, tenant: tenant) }

  it "elimina contactos con email @ejemplo.co" do
    contact = create(:contact, tenant: tenant, owner_user: owner, email: "prueba@ejemplo.co")
    create(:opportunity, tenant: tenant, contact: contact, owner_user: owner)

    expect { described_class.run!(wipe_tenant_slugs: []) }
      .to change(Contact, :count).by(-1)
      .and change(Opportunity, :count).by(-1)
  end

  it "no elimina contactos reales" do
    create(:contact, tenant: tenant, owner_user: owner, email: "cliente@empresa-real.com")

    expect { described_class.run!(wipe_tenant_slugs: []) }.not_to change(Contact, :count)
  end

  it "elimina duplicate_flags de oportunidades demo" do
    contact = create(:contact, tenant: tenant, owner_user: owner, email: "dup2@ejemplo.co")
    opp_a = create(:opportunity, tenant: tenant, contact: contact, owner_user: owner, title: "Lead A")
    opp_b = create(:opportunity, tenant: tenant, contact: contact, owner_user: owner, title: "Lead B")
    flag = create(:duplicate_flag, tenant: tenant, opportunity: opp_a, duplicate_of_opportunity: opp_b)

    expect { described_class.run!(wipe_tenant_slugs: []) }.to change(DuplicateFlag, :count).by(-1)
    expect(DuplicateFlag.exists?(flag.id)).to be(false)
  end

  it "elimina recordatorios demo por asunto" do
    contact = create(:contact, tenant: tenant, owner_user: owner, email: "rem@ejemplo.co")
    opp = create(:opportunity, tenant: tenant, contact: contact, owner_user: owner)
    reminder = create(:reminder, tenant: tenant, user: owner, opportunity: opp,
                      subject: "Seguimiento demo lead #1")

    expect { described_class.run!(wipe_tenant_slugs: []) }
      .to change(Reminder, :count).by(-1)

    expect(Reminder.exists?(reminder.id)).to be(false)
  end

  it "elimina duplicate_flags huérfanos tras borrar oportunidades demo" do
    contact = create(:contact, tenant: tenant, owner_user: owner, email: "dup@ejemplo.co")
    opp = create(:opportunity, tenant: tenant, contact: contact, owner_user: owner)
    other = create(:opportunity, tenant: tenant, owner_user: owner)
    flag = create(:duplicate_flag, tenant: tenant, opportunity: opp, duplicate_of_opportunity: other)

    described_class.run!(wipe_tenant_slugs: [])

    expect(DuplicateFlag.exists?(flag.id)).to be(false)
  end

  it "vacía todos los contactos en tenants con wipe (iswo)" do
    iswo = create(:tenant, slug: "iswo", name: "ISWO")
    ActsAsTenant.with_tenant(iswo) do
      consultant = create(:user, :consultant, tenant: iswo)
      real = create(:contact, tenant: iswo, owner_user: consultant, email: "cliente@empresa-real.com")
      expect { described_class.run!(wipe_tenant_slugs: %w[iswo]) }
        .to change { Contact.where(tenant_id: iswo.id).count }.from(1).to(0)
      expect(Contact.exists?(real.id)).to be(false)
    end
  end

  it "elimina contactos demo_pack por nombre (dup) sin depender del email" do
    contact = create(:contact, tenant: tenant, owner_user: owner,
                    first_name: "Camila R. (dup)", last_name: "", email: nil)
    create(:opportunity, tenant: tenant, contact: contact, owner_user: owner)

    expect { described_class.run!(wipe_tenant_slugs: []) }
      .to change(Contact, :count).by(-1)
  end

  it "conserva tenants y usuarios del tenant" do
    admin = create(:user, :admin, tenant: tenant)
    create(:contact, tenant: tenant, owner_user: owner, email: "borrar@ejemplo.co")

    expect { described_class.run!(wipe_tenant_slugs: []) }
      .to change(Contact, :count).by(-1)
      .and change(Tenant, :count).by(0)
      .and change(User, :count).by(0)

    expect(User.exists?(admin.id)).to be(true)
    expect(User.exists?(owner.id)).to be(true)
  end
end
