import { About, Skills } from './components/About'
import { Contact, Footer } from './components/Contact'
import { Hero } from './components/Hero'
import { Navbar } from './components/Navbar'
import { Projects } from './components/Projects'

export default function App() {
  return (
    <div className="noise">
      <a href="#projets" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-full focus:bg-cyan focus:px-4 focus:py-2 focus:text-void">
        Aller au contenu
      </a>
      <Navbar />
      <main>
        <Hero />
        <Projects />
        <About />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
