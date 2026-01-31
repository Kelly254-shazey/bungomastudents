import { Hero } from '@/components/Hero'
import { About } from '@/components/About'
import { Programs } from '@/components/Programs'
import { Leaders } from '@/components/Leaders'
import { Events } from '@/components/Events'
import { Announcements } from '@/components/Announcements'
import { Impact } from '@/components/Impact'
import { Contact } from '@/components/Contact'
import { Footer } from '@/components/Footer'

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Programs />
      <Leaders />
      <Events />
      <Announcements />
      <Impact />
      <Contact />
      <Footer />
    </main>
  )
}
