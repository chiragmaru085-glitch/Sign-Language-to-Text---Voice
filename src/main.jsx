import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

function App() {
  const videoRef = useRef(null)
  const socketRef = useRef(null)
  const [active, setActive] = useState(false)
  const [status, setStatus] = useState('Camera is off')
  const [sentence, setSentence] = useState('')
  const [prediction, setPrediction] = useState('Waiting for a session')

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let mediaStream
    let socket
    let timer

    async function startSession() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera access requires HTTPS and a supported browser.')
        }
        setStatus('Requesting camera access…')
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (cancelled) {
          mediaStream.getTracks().forEach(track => track.stop())
          return
        }
        videoRef.current.srcObject = mediaStream
        const endpoint = import.meta.env.VITE_TRANSLATION_WS_URL
          || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/stream`
        socket = new WebSocket(endpoint)
        socketRef.current = socket
        setStatus('Connecting to translation server…')
        socket.onopen = () => setStatus('Translation server connected')
        socket.onclose = () => {
          if (!cancelled) setStatus('Camera preview only — translation server disconnected')
        }
        socket.onerror = () => setStatus('Camera preview only — translation server unavailable')
        socket.onmessage = event => {
          try {
            const message = JSON.parse(event.data)
            if (message.type === 'prediction') {
              setPrediction(message.pred_label || 'Waiting for hands')
              setSentence(message.sentence || '')
            }
            if (message.type === 'sentence_cleared') setSentence('')
          } catch {
            setStatus('Translation server returned an invalid response')
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = 640
        canvas.height = 480
        const context = canvas.getContext('2d')
        timer = window.setInterval(() => {
          const video = videoRef.current
          if (!context || !video || video.readyState < 2 || socket.readyState !== WebSocket.OPEN || socket.bufferedAmount > 0) return
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          socket.send(JSON.stringify({ image: canvas.toDataURL('image/jpeg', 0.7) }))
        }, 100)
      } catch (error) {
        if (!cancelled) {
          setStatus(error.message || 'Unable to start the camera')
          setActive(false)
        }
      }
    }

    startSession()
    return () => {
      cancelled = true
      window.clearInterval(timer)
      if (socket) {
        socket.onopen = null
        socket.onclose = null
        socket.onerror = null
        socket.onmessage = null
        socket.close()
      }
      socketRef.current = null
      mediaStream?.getTracks().forEach(track => track.stop())
    }
  }, [active])

  function clearSentence() {
    setSentence('')
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'clear_sentence' }))
    }
  }

  function speakSentence() {
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(sentence))
  }

  return (
    <main className="studio">
      <header><span className="wordmark">SignAI<span> / STUDIO</span></span><span className="eyebrow">SIGN → TEXT → VOICE</span></header>
      <section className="intro"><p className="eyebrow">REAL-TIME SIGN LANGUAGE</p><h1>Make every gesture<br />a conversation.</h1><p>Start your camera and connect to the translation engine to turn signs into text.</p></section>
      <div className="workspace">
        <section className="panel camera"><h2>Camera workspace</h2><div className="preview"><video ref={videoRef} autoPlay playsInline muted hidden={!active} />{!active && <p>Your camera preview appears here.</p>}</div><p role="status">{status}</p><button onClick={() => { setActive(!active); if (active) setStatus('Camera is off') }}>{active ? 'Stop camera' : 'Start camera'}</button></section>
        <section className="panel output"><p className="eyebrow">LIVE TRANSCRIPTION</p><h2>Your words, translated.</h2><p className="prediction">{prediction}</p><div className="transcript" aria-live="polite">{sentence || 'Recognized signs will appear here once the translation server is connected.'}</div><div className="actions"><button disabled={!sentence || !('speechSynthesis' in window)} onClick={speakSentence}>Speak text</button><button className="secondary" disabled={!sentence} onClick={clearSentence}>Clear</button></div><p className="note">Translation requires a separately running Python server. Camera frames are sent to that server while connected; Netlify hosts the frontend only.</p></section>
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
