import { useEffect, useState } from 'react'
import { Hand, Server, Video, Volume2 } from 'lucide-react'

// The Python inference server (server.py) is hosted separately from this static site.
// Set VITE_API_URL to its base URL, e.g. https://my-sign-api.example.com
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const steps = [
  { icon: Video, title: 'Webcam', text: 'Your browser captures video locally. Frames never leave your device.' },
  { icon: Hand, title: 'Hand tracking', text: 'MediaPipe extracts 21 landmarks per hand, normalized for position and scale.' },
  { icon: Server, title: 'GRU classifier', text: 'A 30-frame window of landmarks is classified into a sign with confidence debouncing.' },
  { icon: Volume2, title: 'Text + voice', text: 'Recognized words appear as text and are spoken aloud with the Web Speech API.' },
]

export default function App() {
  const [status, setStatus] = useState(API_URL ? 'checking' : 'unconfigured')

  useEffect(() => {
    if (!API_URL) return
    fetch(`${API_URL}/api/status`)
      .then((r) => setStatus(r.ok ? 'online' : 'offline'))
      .catch(() => setStatus('offline'))
  }, [])

  const badge = {
    checking: 'bg-slate-700 text-slate-200',
    online: 'bg-emerald-500/20 text-emerald-300',
    offline: 'bg-rose-500/20 text-rose-300',
    unconfigured: 'bg-amber-500/20 text-amber-300',
  }[status]

  return (
    <main className="min-h-screen px-6 py-16 max-w-5xl mx-auto">
      <header className="text-center mb-14">
        <div className="text-6xl mb-4">🤟</div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Sign<span className="text-cyan-400">AI</span>
        </h1>
        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
          Real-time sign language to text and voice, powered by hand tracking and a lightweight neural network.
        </p>
        <span className={`inline-block mt-6 px-3 py-1 rounded-full text-sm font-mono ${badge}`}>
          inference server: {status}
        </span>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <Icon className="w-8 h-8 text-cyan-400 mb-4" />
            <h2 className="font-bold text-lg mb-2">{title}</h2>
            <p className="text-sm text-slate-400">{text}</p>
          </div>
        ))}
      </section>

      {status === 'unconfigured' && (
        <p className="mt-12 text-center text-sm text-slate-500">
          Run <code className="font-mono text-slate-300">uvicorn server:app --port 8000</code> and set{' '}
          <code className="font-mono text-slate-300">VITE_API_URL</code> to connect a live inference server.
        </p>
      )}
    </main>
  )
}
