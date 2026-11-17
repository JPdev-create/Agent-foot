import { Career, CtaBand } from './components/Career'
import { FaqContact } from './components/FaqContact'
import { Features } from './components/Features'
import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import { Navbar } from './components/Navbar'

export default function App() {
  return (
    <>
      <a href="#fonctionnalites" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-lime focus:px-4 focus:py-2 focus:text-night">
        Aller au contenu
      </a>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Career />
        <CtaBand />
        <FaqContact />
      </main>
      <Footer />
    </>
  )
}
