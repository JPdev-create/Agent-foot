import { Faq, Footer, Steps, Trial } from './components/Closing'
import { CommandCenter } from './components/CommandCenter'
import { Features } from './components/Features'
import { Hero } from './components/Hero'
import { Navbar } from './components/Navbar'
import { Pricing } from './components/Pricing'
import { Screens } from './components/Screens'

export default function App() {
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
