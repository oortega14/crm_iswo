import {
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from '@dnd-kit/core'

/** Prioriza el puntero; si no hay hit (entre tarjetas), usa intersección de rectángulos. */
export const kanbanCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args)
  if (pointerHits.length > 0) return pointerHits
  return rectIntersection(args)
}
