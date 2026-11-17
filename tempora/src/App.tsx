import { useEffect } from 'react'
import { Faq, Footer, Steps, Trial } from './components/Closing'
import { CommandCenter } from './components/CommandCenter'
import { Features } from './components/Features'
import { Hero } from './components/Hero'
import { Navbar } from './components/Navbar'
import { Pricing } from './components/Pricing'
import { Screens } from './components/Screens'

// Les liens internes (#section) sont gérés ici : dans certains lecteurs (artefact, iframe),
// le navigateur les traite comme une navigation vers une autre page et ne fait rien.
function useInPageLinks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      const href = a?.getAttribute('href')
      if (!href || !href.startsWith('#') || href.length < 2) return
      const target = document.getElementById(decodeURIComponent(href.slice(1)))
      if (!target) return
      e.preventDefault()
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
      if (target.matches('section') && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])
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
    </div>
  )
}
