import DOMPurify, { type Config } from 'dompurify'

const LANDING_HTML_CONFIG: Config = {
  ADD_TAGS: ['iframe', 'video', 'source'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'rel', 'data-gjs-type', 'data-highlightable'],
}

/** Sanitiza HTML de GrapeJS antes de renderizar en landings públicas. */
export function sanitizeLandingHtml(html: string): string {
  if (!html) return ''
  // DOMPurify puede tipar el retorno como TrustedHTML según lib.dom
  return DOMPurify.sanitize(html, LANDING_HTML_CONFIG) as string
}

/**
 * Quita formularios embebidos en GrapeJS: el único formulario activo es el del CRM al pie.
 */
export function stripLandingFormElements(html: string): string {
  const safe = sanitizeLandingHtml(html)
  if (!safe) return ''
  if (typeof document === 'undefined') {
    return safe.replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '')
  }
  const tpl = document.createElement('template')
  tpl.innerHTML = safe
  tpl.content.querySelectorAll('form').forEach((node) => node.remove())
  return tpl.innerHTML
}

/** Evita ruptura de &lt;style&gt; e inyección vía CSS en landings. */
export function sanitizeLandingCss(css: string): string {
  if (!css) return ''
  return css
    .replace(/<\/style/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/behavior\s*:/gi, '')
}
