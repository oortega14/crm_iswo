import { describe, it, expect } from 'vitest'
import { mapNotification } from '@/lib/notificationApi'

describe('mapNotification', () => {
  it('extrae opportunityId cuando resource_type es Opportunity', () => {
    const n = mapNotification({
      id: '42',
      attributes: {
        kind: 'reminder_due',
        title: 'Recordatorio',
        body: 'Mensaje',
        resource_type: 'Opportunity',
        resource_id: '99',
        unread: true,
        read_at: null,
        created_at: '2026-06-01T12:00:00Z',
      },
    })
    expect(n?.id).toBe('42')
    expect(n?.opportunityId).toBe('99')
  })

  it('acepta resource_type en minúsculas', () => {
    const n = mapNotification({
      id: '1',
      attributes: {
        kind: 'duplicate_found',
        title: 'Duplicado',
        body: null,
        resource_type: 'opportunity',
        resource_id: '7',
        unread: true,
        read_at: null,
        created_at: '2026-06-01T12:00:00Z',
      },
    })
    expect(n?.opportunityId).toBe('7')
  })

  it('mapea new_lead con oportunidad vinculada', () => {
    const n = mapNotification({
      id: '3',
      attributes: {
        kind: 'new_lead',
        title: 'Nuevo lead',
        body: 'Lead desde Meta',
        resource_type: 'Opportunity',
        resource_id: '12',
        unread: true,
        read_at: null,
        created_at: '2026-06-01T12:00:00Z',
      },
    })
    expect(n?.type).toBe('new_lead')
    expect(n?.opportunityId).toBe('12')
  })

  it('no asigna opportunityId para otros recursos', () => {
    const n = mapNotification({
      id: '2',
      attributes: {
        kind: 'new_lead',
        title: 'Lead',
        body: null,
        resource_type: 'Contact',
        resource_id: '3',
        unread: true,
        read_at: null,
        created_at: '2026-06-01T12:00:00Z',
      },
    })
    expect(n?.opportunityId).toBeNull()
  })

  it('devuelve null si el recurso no tiene id', () => {
    const n = mapNotification({ id: '', attributes: {} })
    expect(n).toBeNull()
  })
})
