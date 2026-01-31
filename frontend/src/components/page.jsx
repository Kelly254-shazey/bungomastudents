import { getApiUrl } from '@/lib/auth'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/Footer'

async function getEvent(id) {
  const apiUrl = getApiUrl()
  // Fetch from the new endpoint
  const res = await fetch(`${apiUrl}/api/events/${id}`, { next: { revalidate: 60 } }) // Revalidate every 60 seconds
  if (!res.ok) {
    return null
  }
  return res.json()
}

export async function generateMetadata({ params }) {
    const event = await getEvent(params.id)
    if (!event) {
        return {
            title: 'Event Not Found'
        }
    }
    return {
        title: `${event.title} | BUCCUSA Events`,
        description: event.description.substring(0, 150),
    }
}

export default async function EventPage({ params }) {
  const event = await getEvent(params.id)

  if (!event) {
    notFound()
  }
  
  const imageUrl = event.image_url?.startsWith('/')
    ? `${getApiUrl()}${event.image_url}`
    : event.image_url

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    })
  }

  return (
    <>
      <main className="pt-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <article>
            <header className="mb-8">
              <h1 className="text-3xl md:text-5xl font-heading font-bold text-primary mb-4">{event.title}</h1>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-600">
                <p>📅 <span className="font-medium">{formatDate(event.event_date)}</span></p>
                {event.location && <p>📍 <span className="font-medium">{event.location}</span></p>}
              </div>
            </header>

            {imageUrl && (
              <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden mb-8 shadow-lg">
                <Image src={imageUrl} alt={event.title} fill className="object-cover" quality={90} />
              </div>
            )}

            <div className="prose prose-lg max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: event.description?.replace(/\n/g, '<br />') || '' }} />
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}