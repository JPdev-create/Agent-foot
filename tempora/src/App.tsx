import { useEffect, useState } from 'react'
import { Faq, Footer, Steps, Trial } from './components/Closing'
import { CommandCenter } from './components/CommandCenter'
import { Features } from './components/Features'
import { Hero } from './components/Hero'
import { Navbar } from './components/Navbar'
import { Pricing } from './components/Pricing'
import { Screens } from './components/Screens'

// Liens internes (#section) gérés par la page, pour fonctionner aussi dans un lecteur (artefact, iframe) :
// - écoute en phase de capture sur window, donc avant tout script du lecteur ;
// - ne tient pas compte d'un clic déjà « annulé » par le lecteur ;
// - si la page elle-même ne défile pas (cadre agrandi à la hauteur du contenu), on fait défiler le cadre parent.
export type NavLog = { href: string; preventedBefore: boolean; mode: string; yBefore: number; yAfter?: number }
const log: NavLog[] = []

function scrollToTarget(target: HTMLElement) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth'
  const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0
  const pageScrolls = document.documentElement.scrollHeight > window.innerHeight + 2
  if (pageScrolls) {
    const top = target.getBoundingClientRect().top + window.scrollY - header - 12
    window.scrollTo({ top: Math.max(0, top), behavior })
    return 'window.scrollTo'
  }
  target.scrollIntoView({ behavior, block: 'start' })
  return 'scrollIntoView (cadre parent)'
}

function useInPageLinks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      const href = a?.getAttribute('href')
      if (!href || !href.startsWith('#') || href.length < 2) return
      const target = document.getElementById(decodeURIComponent(href.slice(1)))
      if (!target) return
      const entry: NavLog = { href, preventedBefore: e.defaultPrevented, mode: '', yBefore: Math.round(window.scrollY) }
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('tempora:navigate'))
      // laisse le menu mobile se fermer avant de mesurer et de défiler
      requestAnimationFrame(() => {
        entry.mode = scrollToTarget(target)
        if (target.matches('section') && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })
        setTimeout(() => {
          entry.yAfter = Math.round(window.scrollY)
          window.dispatchEvent(new CustomEvent('tempora:navlog'))
        }, 900)
      })
      log.unshift(entry)
      log.length = Math.min(log.length, 5)
    }
    window.addEventListener('click', onClick, true)
    return () => window.removeEventListener('click', onClick, true)
  }, [])
}

/** Panneau de diagnostic : ajouter #debug à l'adresse pour l'afficher. */
function DebugPanel() {
  const [show, setShow] = useState(() => window.location.hash === '#debug')
  const [, force] = useState(0)
  useEffect(() => {
    const onHash = () => setShow(window.location.hash === '#debug')
    const onLog = () => force((n) => n + 1)
    window.addEventListener('hashchange', onHash)
    window.addEventListener('tempora:navlog', onLog)
    window.addEventListener('scroll', onLog, { passive: true })
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('tempora:navlog', onLog)
      window.removeEventListener('scroll', onLog)
    }
  }, [])
  if (!show) return null
  let framed = 'non'
  try {
    framed = window.top !== window.self ? 'oui' : 'non'
  } catch {
    framed = 'oui (autre origine)'
  }
  return (
    <div className="fixed right-3 bottom-3 z-[90] max-w-[min(92vw,380px)] rounded-xl border border-line bg-surface/95 p-3 font-mono text-[11px] leading-relaxed text-ink shadow-card">
      <p className="font-bold text-cyan">Diagnostic navigation</p>
      <p>dans un cadre : {framed}</p>
      <p>hauteur fenêtre : {window.innerHeight}px · hauteur page : {document.documentElement.scrollHeight}px</p>
      <p>la page défile seule : {document.documentElement.scrollHeight > window.innerHeight + 2 ? 'oui' : 'non'} · scrollY : {Math.round(window.scrollY)}</p>
      {log.length === 0 ? (
        <p className="text-mute">Touche un lien du menu…</p>
      ) : (
        log.map((l, i) => (
          <p key={i}>
            {l.href} · annulé avant : {l.preventedBefore ? 'oui' : 'non'} · {l.mode || '…'} · y {l.yBefore} → {l.yAfter ?? '…'}
          </p>
        ))
      )}
    </div>
  )
}

export default function App() {
  useInPageLinks()
  return (
    <div className="noise">
      <a href="#fonctionnalites" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary">
        Aller au contenu
      </a>
      <Navbar />
      <main>
        <Hero />
        <CommandCenter />
        <Features />
        <Screens />
        <Pricing />
        <Steps />
        <Faq />
        <Trial />
      </main>
      <Footer />
      <DebugPanel />
    </div>
  )
}
