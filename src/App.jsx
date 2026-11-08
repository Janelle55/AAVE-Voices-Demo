import { useState, useCallback, useEffect, useRef } from 'react'
import './index.css'
import Globe from './components/Globe'
import { useRespondents } from './data/useRespondents'

function cleanTranscript(text) {
  return (text || '')
    .replace(/\{BR\}/gi, ' ')
    .replace(/\{[^}]+\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sentimentLabel(score) {
  const s = parseFloat(score)
  if (isNaN(s)) return ''
  if (s >= 1)    return 'Mostly Positive'
  if (s >= 0.5)  return 'Slightly Positive'
  if (s === 0)   return 'Neutral'
  if (s >= -0.5) return 'Slightly Negative'
  return 'Mostly Negative'
}

function friendlyName(respondent) {
  return respondent?.voiceNumber
    ? `Voice #${String(respondent.voiceNumber).padStart(3, '0')}`
    : respondent?.id || 'Voice'
}

// Nature-inspired palette: deep greens, warm browns, white
const HU = {
  red:   '#2d6a4f',   // deep forest green (primary actions)
  gold:  '#a07850',   // warm brown/tan (accents)
  navy:  '#1b4332',   // darkest green (backgrounds)
  black: '#0d2018',   // near-black green
  white: '#f8f4f0',   // warm white
}

// Extended palette
const C = {
  green1: '#0d2018',  // darkest
  green2: '#1b4332',  // dark
  green3: '#2d6a4f',  // mid
  green4: '#40916c',  // bright
  green5: '#74c69d',  // light
  brown1: '#5c3d2e',  // dark brown
  brown2: '#a07850',  // mid brown
  brown3: '#c9a87c',  // tan
  brown4: '#e8d5b7',  // light tan
  white:  '#f8f4f0',  // warm white
}

const MEMOJI_FILES = [
  '0063635ff4fa81bee10e1195c422ec3a-sticker 1.png',
  '01891804d18a5099dd03141574be67c3-sticker 1.png',
  '1.png','105_rectangle.png','107_rectangle.png','111_rectangle.png',
  '12.png','12_rectangle.png','14.png',
  '14d8c72494c6bddcce027449b51438d3-sticker 1.png','16.png',
  '1fd0cd2627eb482fa6a374fa18d39f06-sticker 1.png',
  '2d223f3b177606c5e863c50be70f9c86-sticker 1.png','33.png',
  '3546b87e3056c378136201ccb29cbc04-sticker 1.png',
  '394428831f98da33767a77ab6c60a6f9-sticker 1.png',
  '3ccdf295dc30c4b50e7e973ae46fdc35-sticker 1.png',
  '46f03b3aa1727bb0cb9d113f88f5511c-sticker 1.png',
  '5319de986232bf2b2c87f1bbf7fbc69b-sticker 1.png',
  '53a2765873424ff5ffdb2edbad4f489b-sticker 1.png',
  '55ce5ce04933f69f67a23bebdfe44627-sticker 1.png','59_rectangle.png',
  '64e1132a61bc221e550a41186a81b9ad-sticker 1.png','74_rectangle.png',
  '754020afcf84d4cbaa88e65056285de2-sticker 1.png',
  '948dd757fee522396e6cf9dbe70c9cf2-sticker 1.png',
  '9788e7d57029acf5331f4127f21515c6-sticker 1.png','97_rectangle.png',
  '9994a9107c7c2060534b01adf239d5d8-sticker 1.png',
  'acc8592004e3750e611dea3419c67d52-sticker 1.png',
  'b57b0bf5a8e8b2d4f3b536533d1e3f75-sticker 1.png',
  'c87ecb919d329c7b2b3a43f896b223eb-sticker 1.png',
  'cfcff37411665d2c7fa4db405835510c-sticker 1.png',
  'da17180f857808d78fc4961d2079aec6-sticker 1.png',
  'dd5ad9ae60dfe6a6a5821f2fa2ed4f2e-sticker 1.png',
  'f82775abb8f97d077c3700584fdb4977-sticker 1.png',
]

function getMemojiUrl(respondent) {
  let hash = 0
  const s = respondent?.sessionId || respondent?.id || ''
  for (let i = 0; i < s.length; i++) hash += s.charCodeAt(i)
  return `/Memojis/${encodeURIComponent(MEMOJI_FILES[hash % MEMOJI_FILES.length])}`
}

function MemojiAvatar({ respondent, size = 50, emotionColor }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2.5px solid ${emotionColor}`,
      boxShadow: `0 0 20px ${emotionColor}44`,
      overflow: 'hidden', flexShrink: 0,
      background: '#0a1628',
    }}>
      <img
        src={getMemojiUrl(respondent)}
        width={size} height={size}
        style={{ display: 'block', objectFit: 'cover', borderRadius: '50%' }}
      />
    </div>
  )
}

const glass = {
  background: 'rgba(255,252,245,0.55)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
}

const glassDark = {
  background: 'rgba(255,252,245,0.35)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
}

const PANEL_W = 360

const EMOTION_ORDER = [
  'Neutral', 'Emphasis / Excited', 'Enthusiastic',
  'Proud', 'Deprecation', 'Upset / Anger'
]

export default function App() {
  const { respondents, emotions, questions, loading, error } =
    useRespondents('/sample-data.xlsx')

  const safeRespondents = respondents || []
  const safeEmotions    = emotions   || {}
  const safeQuestions   = questions  || []

  const allEmotions = {
    'Neutral':           '#A0AEC0',
    'Emphasis / Excited':'#7B61FF',
    'Enthusiastic':      '#00C48C',
    'Proud':             '#F5C518',
    'Deprecation':       '#FF851B',
    'Upset / Anger':     '#E53E3E',
    ...safeEmotions,
  }

  const orderedEmotions = EMOTION_ORDER
    .filter(label => allEmotions[label])
    .map(label => [label, allEmotions[label]])

  const dataReady = !loading && safeRespondents.length > 0

  const [showIntro, setShowIntro] = useState(true)
  const [globeMounted, setGlobeMounted] = useState(false)
  const [presentationMode, setPresentationMode] = useState(false)
  const [activeEmotion, setActiveEmotion] = useState(null)
  const [selectedQuestionId, setSelectedQuestionId] = useState(null)
  const [selectedDot, setSelectedDot] = useState(null)
  const [selectedDotIndex, setSelectedDotIndex] = useState(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [qSearch, setQSearch] = useState('')
  const [tourActive, setTourActive] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [audioFilter, setAudioFilter] = useState(false)
  const [audioManifest, setAudioManifest] = useState(null)
  const [audioActiveCity, setAudioActiveCity] = useState(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioRef = useRef(null)
  const [sidebarTab, setSidebarTab] = useState('questions')
  const [voiceSearch, setVoiceSearch] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [activeState, setActiveState] = useState(null)
  const tourRef = useRef(null)
  const tourIndexRef = useRef(0)

  // Theme tokens — swap between light (cream) and dark (forest)
  const T = darkMode ? {
    bg:           '#0d2018',
    navBg:        'rgba(13,32,24,0.98)',
    navBorder:    'rgba(64,145,108,0.4)',
    glassBg:      'rgba(13,32,24,0.80)',
    glassBlur:    'blur(32px)',
    panelBg:      'rgba(13,32,24,0.92)',
    inputBg:      'rgba(64,145,108,0.1)',
    inputBorder:  'rgba(64,145,108,0.3)',
    inputColor:   '#f8f4f0',
    textPrimary:  '#f8f4f0',
    textSecondary:'rgba(116,198,157,0.8)',
    textMuted:    'rgba(116,198,157,0.5)',
    tabActive:    '#74c69d',
    tabInactive:  'rgba(248,244,240,0.35)',
    tabBorder:    'rgba(64,145,108,0.3)',
    tabBg:        'rgba(5,15,10,0.7)',
    qActive:      'rgba(45,106,79,0.2)',
    qActiveBorder:'#40916c',
    qActiveText:  '#74c69d',
    qText:        'rgba(248,244,240,0.65)',
    qNum:         'rgba(116,198,157,0.6)',
    qCount:       'rgba(116,198,157,0.12)',
    btnBg:        'rgba(64,145,108,0.15)',
    btnBorder:    'rgba(64,145,108,0.4)',
    btnText:      '#74c69d',
    sidebarBorder:'rgba(64,145,108,0.2)',
    globeBg:      '#0d2018',
    atmosphereColor: '#74c69d',
  } : {
    bg:           '#f5f0e8',
    navBg:        'rgba(245,240,232,0.95)',
    navBorder:    'rgba(45,106,79,0.4)',
    glassBg:      'rgba(255,252,245,0.55)',
    glassBlur:    'blur(32px)',
    panelBg:      'rgba(255,252,245,0.80)',
    inputBg:      'rgba(255,255,255,0.65)',
    inputBorder:  'rgba(64,145,108,0.25)',
    inputColor:   '#1b4332',
    textPrimary:  '#1b4332',
    textSecondary:'#40916c',
    textMuted:    'rgba(45,106,79,0.5)',
    tabActive:    '#2d6a4f',
    tabInactive:  'rgba(45,106,79,0.4)',
    tabBorder:    'rgba(64,145,108,0.2)',
    tabBg:        'rgba(255,252,245,0.4)',
    qActive:      'rgba(45,106,79,0.1)',
    qActiveBorder:'#2d6a4f',
    qActiveText:  '#2d6a4f',
    qText:        'rgba(27,67,50,0.75)',
    qNum:         'rgba(45,106,79,0.6)',
    qCount:       'rgba(64,145,108,0.1)',
    btnBg:        'rgba(45,106,79,0.1)',
    btnBorder:    'rgba(45,106,79,0.25)',
    btnText:      '#2d6a4f',
    sidebarBorder:'rgba(64,145,108,0.15)',
    globeBg:      '#f5f0e8',
    atmosphereColor: '#74c69d',
  }

  // ── AUTO-TOUR ──
  useEffect(() => {
    if (!tourActive || !dataReady) return

    function showNext() {
      const pool = safeRespondents.filter(r => !r.isUnknown)
      if (!pool.length) return
      // shuffle-ish by incrementing index
      tourIndexRef.current = (tourIndexRef.current + 1) % pool.length
      const respondent = pool[tourIndexRef.current]
      const firstAns = respondent.answers?.[0]
      const enriched = {
        ...respondent,
        emotionColor: firstAns?.emotion?.color || respondent.emotionColor,
        emotion: firstAns?.emotion?.label || respondent.emotion,
        _override: firstAns?.transcript,
      }
      setSelectedDot(respondent)
      setSelectedDotIndex(tourIndexRef.current)
      setCurrentQ(0)
      window.dispatchEvent(new CustomEvent('aave-dot-selected', { detail: enriched }))
    }

    showNext()
    tourRef.current = setInterval(showNext, 6000)

    return () => clearInterval(tourRef.current)
  }, [tourActive, dataReady])

  function toggleTour() {
    if (tourActive) {
      clearInterval(tourRef.current)
      setTourActive(false)
      closePopup()
    } else {
      tourIndexRef.current = Math.floor(Math.random() * safeRespondents.length)
      setTourActive(true)
    }
  }

  const introAvatars = dataReady
    ? safeRespondents.slice(0, 12).map((r, i) => ({
        respondent: r,
        left: `${i % 2 === 0
          ? 2 + (i * 7) % 28        // left side: 2%–30%
          : 68 + (i * 7) % 28}%`,   // right side: 68%–96%
        top: `${6 + (i * 14) % 82}%`,
        size: 36 + (i % 3) * 12,
        delay: i * 0.25,
        emotionColor: r.emotionColor,
      }))
    : []

  function handleExplore() {
    setGlobeMounted(true)
    // Small delay to let globe mount, then fade out intro
    setTimeout(() => setShowIntro(false), 100)
  }

  const handleDotClick = useCallback((point) => {
    // Stop tour if running
    if (tourRef.current) {
      clearInterval(tourRef.current)
      setTourActive(false)
    }
    const idx = safeRespondents.findIndex(r => r.sessionId === point.sessionId)
    setSelectedDot(point)
    setSelectedDotIndex(idx)
    setCurrentQ(0)
    const firstAns = point.answers?.[0]
    const enriched = {
      ...point,
      emotionColor: firstAns?.emotion?.color || point.emotionColor,
      emotion: firstAns?.emotion?.label || point.emotion,
      _override: firstAns?.transcript,
    }
    window.dispatchEvent(new CustomEvent('aave-dot-selected', { detail: enriched }))
  }, [safeRespondents])

  function closePopup() {
    setSelectedDot(null)
    setSelectedDotIndex(null)
    window.dispatchEvent(new CustomEvent('aave-dot-selected', { detail: null }))
  }

  function handleQuestionSelect(qId) {
    setSelectedQuestionId(prev => prev === qId ? null : qId)
    setSelectedDot(null)
    setSelectedDotIndex(null)
    window.dispatchEvent(new CustomEvent('aave-dot-selected', { detail: null }))
  }

  function countForQuestion(qId) {
    return safeRespondents.filter(r => r.answers?.some(a => a.questionId === qId)).length
  }

  const filteredQuestions = safeQuestions.filter(q =>
    !qSearch || q.text.toLowerCase().includes(qSearch.toLowerCase())
  )

  const filteredVoices = voiceSearch.trim()
    ? safeRespondents.filter(r => {
        const q = voiceSearch.toLowerCase()
        const name = `voice #${String(r.voiceNumber).padStart(3,'0')}`.toLowerCase()
        const city = (r.city || '').toLowerCase()
        const emotion = (r.emotion || '').toLowerCase()
        const transcript = r.answers?.map(a => a.transcript).join(' ').toLowerCase() || ''
        return name.includes(q) || city.includes(q) || emotion.includes(q) || transcript.includes(q)
      }).slice(0, 30)
    : []

  const ans = selectedDot?.answers?.[currentQ]
  const cleaned = ans ? cleanTranscript(ans.transcript) : ''
  const displayName = selectedDot ? friendlyName(selectedDot) : ''

  // Per-answer color — drives header, bubble, sentiment, pagination, and globe avatar
  const ansColor = ans?.emotion?.color || selectedDot?.emotionColor
  const dotColor = selectedDot?.emotionColor || ansColor
  const ansEmotionLabel = ans?.emotion?.label || selectedDot?.emotion

  // Compute state-level heatmap — dominant emotion color per state
  const heatmapData = showHeatmap ? (() => {
    const pool = activeEmotion
      ? safeRespondents.filter(r => r.emotion === activeEmotion)
      : safeRespondents

    // Build per-state emotion counts
    const stateEmotions = {}  // { stateName: { emotionLabel: count } }
    const stateTotals  = {}  // { stateName: totalCount }

    pool.forEach(r => {
      if (r.isUnknown) return
      const key = r.city?.toLowerCase()
      if (!key) return
      if (!stateEmotions[key]) stateEmotions[key] = {}
      stateEmotions[key][r.emotion] = (stateEmotions[key][r.emotion] || 0) + 1
      stateTotals[key] = (stateTotals[key] || 0) + 1
    })

    // Find dominant emotion and its color per state
    const dominantEmotion = {}  // { stateName: { color, label, count, total } }
    Object.entries(stateEmotions).forEach(([state, emotions]) => {
      const top = Object.entries(emotions).reduce((a, b) => b[1] > a[1] ? b : a)
      const color = allEmotions[top[0]] || '#A0AEC0'
      dominantEmotion[state] = {
        color,
        label: top[0],
        count: top[1],
        total: stateTotals[state],
        pct: Math.round(top[1] / stateTotals[state] * 100),
      }
    })

    return { dominantEmotion, counts: stateTotals, max: Math.max(...Object.values(stateTotals), 1) }
  })() : null

  // When the current question changes, re-send the globe event with the
  // updated emotion color so the avatar ring/stem/dot all shift too
  useEffect(() => {
    if (!selectedDot || !ans) return
    const enriched = {
      ...selectedDot,
      emotionColor: ans.emotion.color,
      emotion: ans.emotion.label,
      _override: ans.transcript,
    }
    window.dispatchEvent(new CustomEvent('aave-dot-selected', { detail: enriched }))
  }, [currentQ, selectedDot])

    // Audio manifest fetch
  useEffect(() => {
    if (audioFilter && !audioManifest) {
      fetch('/audio/map-data/v1/manifest.json')
        .then(r => r.json())
        .then(setAudioManifest)
        .catch(console.error)
    }
    if (!audioFilter) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      setAudioPlaying(false)
      setAudioActiveCity(null)
    }
  }, [audioFilter])

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: T.bg, fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* ── ERROR ── */}
      {error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: HU.black,
        }}>
          <div style={{
            textAlign: 'center', padding: '36px 40px',
            background: HU.navy, borderRadius: 20,
            border: `1px solid ${HU.red}44`, maxWidth: 420,
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <div style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800,
              fontSize: 18, color: HU.white, marginBottom: 10,
            }}>Error loading data</div>
            <div style={{ fontSize: 13, color: HU.red, lineHeight: 1.6 }}>{error}</div>
          </div>
        </div>
      )}

      {/* ── INTRO ── */}
      {showIntro && !error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 150,
          background: darkMode ? '#0d2018' : '#f5f0e8',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          transition: 'opacity 0.8s ease',
          opacity: 1,
        }}>
          <style>{`
            @keyframes floatAvatar{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-14px) scale(1.05)}}
            @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
            @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
            @keyframes breathe{0%,100%{opacity:0.08}50%{opacity:0.18}}
            @keyframes popIn{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}
          `}</style>

          {/* Background rings */}
          {[300,500,700,900].map((size, i) => (
            <div key={i} style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: size, height: size, borderRadius: '50%',
              border: `1px solid rgba(45,106,79,${0.12 - i * 0.02})`,
              pointerEvents: 'none',
              animation: `breathe ${3 + i}s ${i * 0.5}s ease-in-out infinite`,
            }}/>
          ))}

          {/* Floating memojis */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {introAvatars.map(({ respondent, left, top, size, delay, emotionColor }, i) => (
              <div key={i} style={{
                position: 'absolute', left, top,
                animation: `popIn 0.5s ${delay * 0.5}s ease both, floatAvatar ${3.5 + (i % 3) * 0.8}s ${delay}s ease-in-out infinite`,
                opacity: 0,
              }}>
                <div style={{
                  width: size, height: size, borderRadius: '50%',
                  border: `2.5px solid ${emotionColor}`,
                  boxShadow: `0 0 20px ${emotionColor}66, 0 0 40px ${emotionColor}22`,
                  overflow: 'hidden',
                  background: darkMode ? '#1b4332' : '#e8f5e9',
                }}>
                  <img src={getMemojiUrl(respondent)} width={size} height={size}
                    style={{ display: 'block', objectFit: 'cover' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Center content */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 24,
          }}>

            {/* Stats row */}
            {dataReady && (
              <div style={{
                display: 'flex', gap: 32, marginBottom: 8,
                animation: 'fadeUp 0.6s 0.1s ease both', opacity: 0,
                animationFillMode: 'forwards',
              }}>
                {[
                  { num: safeRespondents.length, label: 'Voices' },
                  { num: safeQuestions.length, label: 'Questions' },
                  { num: 3, label: 'Phases' },
                ].map(({ num, label }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'Syne, sans-serif', fontWeight: 800,
                      fontSize: 28, color: '#2d6a4f', lineHeight: 1,
                    }}>{num}</div>
                    <div style={{
                      fontSize: 9, color: darkMode ? 'rgba(116,198,157,0.6)' : 'rgba(45,106,79,0.55)',
                      letterSpacing: 2, textTransform: 'uppercase', marginTop: 4,
                    }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Loading spinner */}
            {loading && (
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '2px solid rgba(45,106,79,0.2)',
                borderTopColor: '#2d6a4f',
                animation: 'spin 0.8s linear infinite',
              }}/>
            )}

            {/* CTA */}
            <button
              onClick={handleExplore}
              disabled={!dataReady}
              style={{
                background: dataReady
                  ? 'linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)'
                  : (darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(45,106,79,0.1)'),
                border: `1.5px solid ${dataReady ? '#40916c' : 'rgba(45,106,79,0.2)'}`,
                borderRadius: 50, padding: '15px 56px',
                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: 16, letterSpacing: 0.5,
                color: dataReady ? '#f8f4f0' : (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(45,106,79,0.4)'),
                cursor: dataReady ? 'pointer' : 'not-allowed',
                boxShadow: dataReady ? '0 8px 32px rgba(45,106,79,0.35), 0 2px 8px rgba(45,106,79,0.2)' : 'none',
                animation: dataReady ? 'fadeUp 0.6s 0.3s ease both' : 'none',
                animationFillMode: 'forwards',
                opacity: dataReady ? undefined : 0.5,
                transition: 'transform 0.2s, filter 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                if (!dataReady) return
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(45,106,79,0.5), 0 4px 12px rgba(45,106,79,0.3)'
              }}
              onMouseLeave={e => {
                if (!dataReady) return
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(45,106,79,0.35), 0 2px 8px rgba(45,106,79,0.2)'
              }}
            >
              {loading ? 'Loading voices...' : 'Explore the Globe →'}
            </button>

            
              {/* Map View Button */}
              

              {/* Emotion chips */}
            {dataReady && (
              <div style={{
                display: 'flex', gap: 6, flexWrap: 'wrap',
                justifyContent: 'center', maxWidth: 360,
                animation: 'fadeUp 0.6s 0.5s ease both', opacity: 0,
                animationFillMode: 'forwards',
              }}>
                {orderedEmotions.map(([label, color]) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: `${color}14`,
                    border: `1px solid ${color}44`,
                    borderRadius: 20, padding: '4px 10px 4px 7px',
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: color, boxShadow: `0 0 6px ${color}`,
                    }}/>
                    <span style={{
                      fontSize: 10,
                      color: darkMode ? `${color}dd` : '#2d6a4f',
                      fontWeight: 500,
                    }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            position: 'absolute', bottom: 24,
            fontSize: 10,
            color: darkMode ? 'rgba(116,198,157,0.3)' : 'rgba(45,106,79,0.35)',
            letterSpacing: 1.5, textAlign: 'center', zIndex: 1,
            textTransform: 'uppercase',
          }}>
            Howard University × Google
          </div>
        </div>
      )}

      {/* ── MAIN APP ── */}
      {globeMounted && (
        <>
          {/* TOP NAV */}
          {!presentationMode && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 52,
              background: T.navBg,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: `2px solid ${T.navBorder}`,
              boxShadow: darkMode ? '0 2px 20px rgba(0,0,0,0.4)' : '0 2px 16px rgba(45,106,79,0.12)',
              display: 'flex', alignItems: 'center',
              padding: '0 20px', zIndex: 35, gap: 10,
            }}>
              {/* Present */}
              <button onClick={() => setPresentationMode(true)} style={{
                background: T.btnBg, border: `1px solid ${T.btnBorder}`,
                borderRadius: 20, padding: '5px 14px',
                color: T.btnText, fontSize: 11, cursor: 'pointer', flexShrink: 0,
                fontFamily: 'Syne, sans-serif', fontWeight: 600, letterSpacing: 0.3,
                transition: 'all 0.2s',
              }}>⛶ Present</button>

              {/* Auto Tour */}
              <button onClick={toggleTour} style={{
                background: tourActive ? '#2d6a4f' : T.btnBg,
                border: `1px solid ${tourActive ? '#40916c' : T.btnBorder}`,
                borderRadius: 20, padding: '5px 14px',
                color: tourActive ? '#f8f4f0' : T.btnText,
                fontSize: 11, cursor: 'pointer', flexShrink: 0,
                fontFamily: 'Syne, sans-serif', fontWeight: 600, letterSpacing: 0.3,
                transition: 'all 0.2s',
              }}>{tourActive ? '⏹ Stop Tour' : '▶ Auto Tour'}</button>

              {/* Heatmap */}
              <button onClick={() => setShowHeatmap(h => !h)} style={{
                background: showHeatmap ? 'rgba(160,120,80,0.2)' : T.btnBg,
                border: `1px solid ${showHeatmap ? '#a07850' : T.btnBorder}`,
                borderRadius: 20, padding: '5px 14px',
                color: showHeatmap ? '#a07850' : T.btnText,
                fontSize: 11, cursor: 'pointer', flexShrink: 0,
                fontFamily: 'Syne, sans-serif', fontWeight: 600, letterSpacing: 0.3,
                transition: 'all 0.2s',
              }}>🗺 {showHeatmap ? 'Hide Heatmap' : 'Heatmap'}</button>

              {/* 🎵 Audio filter */}
            <button onClick={() => setAudioFilter(a => !a)} style={{
              background: audioFilter ? 'rgba(245,158,11,0.15)' : darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              border: `1px solid ${audioFilter ? 'rgba(245,158,11,0.5)' : darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
              borderRadius: 20, padding: '5px 14px',
              color: audioFilter ? '#f59e0b' : darkMode ? '#a0a0a0' : '#555',
              fontSize: 13, cursor: 'pointer', flexShrink: 0,
              transition: 'all 0.3s',
            }}>🎵 Audio</button>

            {/* 🌙 Dark / Light toggle */}
              <button onClick={() => setDarkMode(d => !d)} style={{
                background: darkMode ? 'rgba(116,198,157,0.15)' : 'rgba(45,106,79,0.08)',
                border: `1px solid ${darkMode ? 'rgba(116,198,157,0.4)' : 'rgba(45,106,79,0.2)'}`,
                borderRadius: 20, padding: '5px 14px',
                color: darkMode ? '#74c69d' : '#2d6a4f',
                fontSize: 13, cursor: 'pointer', flexShrink: 0,
                transition: 'all 0.3s',
              }}>{darkMode ? '☀️' : '🌙'}</button>

              {/* Emotion filters */}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
                <span style={{
                  fontSize: 9, color: T.textMuted,
                  letterSpacing: 1.5, textTransform: 'uppercase', marginRight: 4,
                }}>Filter</span>
                {orderedEmotions.map(([label, color]) => (
                  <button
                    key={label}
                    onClick={() => setActiveEmotion(prev => prev === label ? null : label)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: activeEmotion === label ? color + '22' : T.btnBg,
                      border: `1px solid ${activeEmotion === label ? color : T.btnBorder}`,
                      borderRadius: 20, padding: '3px 10px 3px 7px',
                      cursor: 'pointer',
                      color: activeEmotion === label ? (darkMode ? '#f8f4f0' : '#1b4332') : T.qText,
                      fontSize: 11, fontWeight: activeEmotion === label ? 600 : 400,
                      transition: 'all 0.2s', whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: color, flexShrink: 0, boxShadow: `0 0 4px ${color}`,
                    }}/>
                    {label}
                  </button>
                ))}
                {activeEmotion && (
                  <button onClick={() => setActiveEmotion(null)} style={{
                    background: 'transparent', border: `1px solid ${T.btnBorder}`,
                    borderRadius: 20, padding: '3px 10px',
                    color: T.textMuted, fontSize: 11, cursor: 'pointer',
                  }}>✕</button>
                )}
              </div>
            </div>
          )}

          {/* MAIN LAYOUT */}
          <div style={{
            position: 'absolute', top: presentationMode ? 0 : 52,
            left: 0, right: 0, bottom: 0,
            transition: 'top 0.3s ease',
          }}>

            {/* GLASS SIDEBAR — overlays the globe */}
            {!presentationMode && (
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                width: 260, flexShrink: 0,
                background: T.glassBg,
                backdropFilter: T.glassBlur,
                WebkitBackdropFilter: T.glassBlur,
                borderRight: `1px solid ${T.sidebarBorder}`,
                display: 'flex', flexDirection: 'column', zIndex: 20,
                boxShadow: darkMode ? '4px 0 32px rgba(0,0,0,0.3)' : '4px 0 32px rgba(0,0,0,0.06)',
                transition: 'background 0.3s ease',
              }}>
                {/* ── TAB SWITCHER ── */}
                <div style={{
                  display: 'flex', borderBottom: `1px solid ${T.tabBorder}`,
                  background: T.tabBg, flexShrink: 0,
                }}>
                  {[
                    { id: 'questions', label: 'Questions' },
                    { id: 'voices',    label: '🔍 Voices'  },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setSidebarTab(tab.id)} style={{
                      flex: 1, padding: '11px 0', border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      fontFamily: 'Syne, sans-serif', fontWeight: 700,
                      fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
                      color: sidebarTab === tab.id ? T.tabActive : T.tabInactive,
                      borderBottom: `2px solid ${sidebarTab === tab.id ? T.tabActive : 'transparent'}`,
                      transition: 'all 0.2s',
                    }}>{tab.label}</button>
                  ))}
                </div>

                {/* ── QUESTIONS TAB ── */}
                {sidebarTab === 'questions' && (
                  <>
                    <div style={{
                      padding: '12px 14px 10px', flexShrink: 0,
                      borderBottom: `1px solid ${T.sidebarBorder}`,
                      background: 'transparent',
                    }}>
                      <div style={{ position: 'relative' }}>
                        <span style={{
                          position: 'absolute', left: 10, top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 12, color: T.textMuted, pointerEvents: 'none',
                        }}>🔍</span>
                        <input
                          value={qSearch}
                          onChange={e => setQSearch(e.target.value)}
                          placeholder="Search questions..."
                          style={{
                            width: '100%', padding: '7px 12px 7px 30px',
                            background: T.inputBg,
                            border: `1px solid ${T.inputBorder}`,
                            borderRadius: 20, fontSize: 11,
                            color: T.inputColor, outline: 'none',
                            fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
                          }}
                          onFocus={e => e.target.style.borderColor = '#40916c'}
                          onBlur={e => e.target.style.borderColor = T.inputBorder}
                        />
                      </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      {!qSearch && (
                        <button
                          onClick={() => {
                            setSelectedQuestionId(null)
                            setSelectedDot(null)
                            setSelectedDotIndex(null)
                            window.dispatchEvent(new CustomEvent('aave-dot-selected', { detail: null }))
                          }}
                          style={{
                            width: '100%', textAlign: 'left', padding: '11px 14px',
                            background: !selectedQuestionId ? T.qActive : 'transparent',
                            border: 'none',
                            borderLeft: `3px solid ${!selectedQuestionId ? T.qActiveBorder : 'transparent'}`,
                            color: !selectedQuestionId ? T.tabActive : T.textSecondary,
                            cursor: 'pointer', fontSize: 12,
                            fontWeight: !selectedQuestionId ? 700 : 400, transition: 'all 0.15s',
                          }}
                        >All {safeRespondents.length} voices</button>
                      )}

                      {filteredQuestions.length === 0 && qSearch && (
                        <div style={{
                          padding: '24px 14px', fontSize: 12,
                          color: T.textMuted, textAlign: 'center', lineHeight: 1.6,
                        }}>
                          No questions match<br/>
                          <strong style={{ color: T.textSecondary }}>"{qSearch}"</strong>
                        </div>
                      )}

                      {filteredQuestions.map((q) => {
                        const isActive = selectedQuestionId === q.id
                        const count = countForQuestion(q.id)
                        const globalIndex = safeQuestions.findIndex(x => x.id === q.id)
                        return (
                          <button
                            key={q.id}
                            onClick={() => handleQuestionSelect(q.id)}
                            style={{
                              width: '100%', textAlign: 'left', padding: '10px 14px',
                              background: isActive ? T.qActive : 'transparent',
                              border: 'none',
                              borderLeft: `3px solid ${isActive ? T.qActiveBorder : 'transparent'}`,
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = darkMode ? 'rgba(64,145,108,0.08)' : 'rgba(64,145,108,0.05)' }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                          >
                            <div style={{
                              display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', marginBottom: 4,
                            }}>
                              <span style={{
                                fontSize: 9, color: isActive ? T.qActiveText : T.qNum,
                                fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: 0.5,
                              }}>Q{globalIndex + 1}</span>
                              <span style={{
                                fontSize: 9, color: T.qNum,
                                background: T.qCount,
                                borderRadius: 8, padding: '1px 7px',
                              }}>{count}</span>
                            </div>
                            <div style={{
                              fontSize: 11, color: isActive ? T.tabActive : T.qText, lineHeight: 1.5,
                            }}>{q.text}</div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* ── VOICES TAB ── */}
                {sidebarTab === 'voices' && (
                  <>
                    <div style={{
                      padding: '12px 14px 10px', flexShrink: 0,
                      borderBottom: `1px solid ${T.sidebarBorder}`,
                      background: 'transparent',
                    }}>
                      <div style={{ position: 'relative' }}>
                        <span style={{
                          position: 'absolute', left: 10, top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 12, color: T.textMuted, pointerEvents: 'none',
                        }}>🔍</span>
                        <input
                          value={voiceSearch}
                          onChange={e => setVoiceSearch(e.target.value)}
                          placeholder="Name, state, emotion, keyword..."
                          style={{
                            width: '100%', padding: '7px 12px 7px 30px',
                            background: T.inputBg,
                            border: `1px solid ${T.inputBorder}`,
                            borderRadius: 20, fontSize: 11,
                            color: T.inputColor, outline: 'none',
                            fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
                          }}
                          onFocus={e => e.target.style.borderColor = '#40916c'}
                          onBlur={e => e.target.style.borderColor = T.inputBorder}
                        />
                        {voiceSearch && (
                          <button onClick={() => setVoiceSearch('')} style={{
                            position: 'absolute', right: 10, top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none', border: 'none',
                            color: T.textMuted, cursor: 'pointer', fontSize: 13, padding: 0,
                          }}>✕</button>
                        )}
                      </div>
                      {voiceSearch && (
                        <div style={{
                          fontSize: 10, color: T.textSecondary,
                          marginTop: 8, letterSpacing: 0.3,
                        }}>
                          {filteredVoices.length === 0
                            ? 'No voices found'
                            : `${filteredVoices.length} voice${filteredVoices.length !== 1 ? 's' : ''} found`}
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      {!voiceSearch && (
                        <div style={{
                          padding: '32px 16px', textAlign: 'center',
                          color: T.textMuted, fontSize: 12, lineHeight: 1.7,
                        }}>
                          Search by voice number,<br/>state, emotion, or keyword
                        </div>
                      )}

                      {filteredVoices.map(r => {
                        const isSelected = selectedDot?.sessionId === r.sessionId
                        return (
                          <button
                            key={r.sessionId}
                            onClick={() => handleDotClick(r)}
                            style={{
                              width: '100%', textAlign: 'left',
                              padding: '10px 14px',
                              background: isSelected ? `${r.emotionColor}18` : 'transparent',
                              border: 'none',
                              borderLeft: `3px solid ${isSelected ? r.emotionColor : 'transparent'}`,
                              cursor: 'pointer', transition: 'all 0.15s',
                              display: 'flex', alignItems: 'center', gap: 10,
                            }}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = darkMode ? 'rgba(64,145,108,0.08)' : 'rgba(64,145,108,0.05)' }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                          >
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              border: `1.5px solid ${r.emotionColor}99`,
                              overflow: 'hidden',
                              background: darkMode ? '#0d2018' : '#e8f5e9',
                              flexShrink: 0,
                            }}>
                              <img src={getMemojiUrl(r)} width={32} height={32}
                                style={{ display: 'block', objectFit: 'cover' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontFamily: 'Syne, sans-serif', fontWeight: 700,
                                fontSize: 12, color: T.textPrimary,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                Voice #{String(r.voiceNumber).padStart(3,'0')}
                              </div>
                              <div style={{
                                fontSize: 10, color: T.textSecondary, marginTop: 1,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                📍 {r.city}
                              </div>
                            </div>
                            <div style={{
                              background: r.emotionColor,
                              borderRadius: 20, padding: '2px 7px',
                              fontSize: 8, color: '#fff',
                              textTransform: 'uppercase', letterSpacing: 0.8,
                              fontWeight: 700, flexShrink: 0,
                            }}>{r.emotion.split(' ')[0]}</div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

              </div>
            )}

            {/* GLOBE — full width */}
            <div style={{ position: 'absolute', inset: 0 }}>
              <Globe
                respondents={safeRespondents}
                activeEmotion={activeEmotion}
                activeState={activeState}
                onDotClick={handleDotClick}
                selectedQuestionId={selectedQuestionId}
                heatmap={heatmapData}
                darkMode={darkMode}
                          audioDots={audioFilter && audioManifest ? audioManifest.cities.filter(c => c.audioFile && c.lat != null).map(c => ({ ...c, isAudio: true, emotionColor: '#f59e0b' })) : []}
          onAudioDotClick={(dot) => {
            if (audioRef.current) { audioRef.current.pause() }
            if (audioActiveCity && audioActiveCity.city === dot.city && audioPlaying) { setAudioPlaying(false); return }
            const base = '/audio/map-data/v1/';
            const aud = new Audio(base + dot.audioFile)
            audioRef.current = aud
            aud.play().then(() => setAudioPlaying(true)).catch(console.error)
            aud.onended = () => setAudioPlaying(false)
            setAudioActiveCity(dot)
          }}
              />

        {/* Audio Player Card */}
        {audioActiveCity && (
          <div style={{
            position: 'absolute',
            bottom: 48,
            left: '50%',
            transform: 'translateX(-50%)',
            background: darkMode ? 'rgba(13,32,24,0.95)' : 'rgba(255,255,255,0.96)',
            border: '1.5px solid #f59e0b',
            borderRadius: 16,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 4px 24px rgba(245,158,11,0.18)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 200,
            minWidth: 240,
            maxWidth: 340,
            pointerEvents: 'auto',
          }}>
            {/* Waveform / play indicator */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24, flexShrink: 0 }}>
              {[0.4,0.7,1,0.6,0.85,0.5,0.9].map((h, i) => (
                <div key={i} style={{
                  width: 3,
                  height: audioPlaying ? h * 22 : 4,
                  background: '#f59e0b',
                  borderRadius: 2,
                  transition: audioPlaying ? 'height 0.3s ease' : 'height 0.15s ease',
                  animation: audioPlaying ? 'none' : undefined,
                  opacity: audioPlaying ? 1 : 0.4,
                }} />
              ))}
            </div>
            {/* City info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f59e0b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {audioActiveCity.city}, {audioActiveCity.state}
              </div>
              <div style={{ fontSize: 11, color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)', marginTop: 2 }}>
                {audioPlaying ? 'Playing...' : 'Paused'}
              </div>
            </div>
            {/* Stop / close button */}
            <button
              onClick={() => {
                if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current = null; }
                setAudioPlaying(false);
                setAudioActiveCity(null);
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)',
                fontSize: 18, lineHeight: 1, padding: 4, borderRadius: 6,
                flexShrink: 0,
              }}
              title="Close"
            >
              &#x2715;
            </button>
          </div>
        )}

              

              {!selectedDot && !presentationMode && (
                <div style={{
                  position: 'absolute', bottom: 16, right: 16,
                  fontSize: 11, color: T.textMuted,
                  pointerEvents: 'none', textAlign: 'right', lineHeight: 2,
                  background: darkMode ? 'rgba(13,32,24,0.85)' : 'rgba(245,240,232,0.85)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '8px 16px', borderRadius: 12,
                  border: `1px solid ${T.sidebarBorder}`,
                  letterSpacing: 0.2,
                }}>
                  Drag to rotate · Scroll to zoom<br/>
                  Click a dot to read a voice
                </div>
              )}

              {/* HOME BUTTON */}
              {!presentationMode && (
                <button
                  onClick={() => setShowIntro(true)}
                  style={{
                    position: 'absolute', top: 68, right: 16,
                    background: darkMode ? 'rgba(13,32,24,0.9)' : 'rgba(245,240,232,0.9)',
                    border: `1px solid ${T.sidebarBorder}`,
                    borderRadius: 20, padding: '7px 16px',
                    color: T.textSecondary, fontSize: 12,
                    fontFamily: 'Syne, sans-serif', fontWeight: 600,
                    cursor: 'pointer', zIndex: 40,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#2d6a4f'; e.currentTarget.style.color = '#f8f4f0' }}
                  onMouseLeave={e => { e.currentTarget.style.background = darkMode ? 'rgba(13,32,24,0.9)' : 'rgba(245,240,232,0.9)'; e.currentTarget.style.color = T.textSecondary }}
                >🏠 Home</button>
              )}

              {/* STATE FILTER */}
              {!presentationMode && (() => {
                const US_STATES = [
                  'Alabama','Alaska','Arizona','Arkansas','California','Colorado',
                  'Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho',
                  'Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana',
                  'Maine','Maryland','Massachusetts','Michigan','Minnesota',
                  'Mississippi','Missouri','Montana','Nebraska','Nevada',
                  'New Hampshire','New Jersey','New Mexico','New York',
                  'North Carolina','North Dakota','Ohio','Oklahoma','Oregon',
                  'Pennsylvania','Rhode Island','South Carolina','South Dakota',
                  'Tennessee','Texas','Utah','Vermont','Virginia','Washington',
                  'West Virginia','Wisconsin','Wyoming','District of Columbia'
                ]

                const stateCounts = {}
                safeRespondents.forEach(r => {
                  if (r.isUnknown) return
                  // city field contains the state name in this dataset
                  const cityVal = r.city || ''
                  const matched = US_STATES.find(s =>
                    cityVal.toLowerCase().includes(s.toLowerCase())
                  )
                  if (matched) {
                    stateCounts[matched] = (stateCounts[matched] || 0) + 1
                  }
                })

                const states = Object.entries(stateCounts)
                  .sort((a, b) => b[1] - a[1])

                if (!states.length) return null

                return (
                  <div style={{
                    position: 'absolute', top: 68, left: 276,
                    zIndex: 40, display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <select
                      value={activeState || ''}
                      onChange={e => setActiveState(e.target.value || null)}
                      style={{
                        background: darkMode ? 'rgba(13,32,24,0.95)' : 'rgba(255,252,245,0.95)',
                        border: `1.5px solid ${activeState ? '#2d6a4f' : T.sidebarBorder}`,
                        borderRadius: 20, padding: '7px 32px 7px 14px',
                        color: activeState ? '#2d6a4f' : T.textSecondary,
                        fontSize: 12, cursor: 'pointer',
                        fontFamily: 'Syne, sans-serif', fontWeight: activeState ? 700 : 500,
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        outline: 'none',
                        boxShadow: activeState
                          ? '0 4px 16px rgba(45,106,79,0.3)'
                          : '0 2px 12px rgba(0,0,0,0.08)',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%232d6a4f' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        minWidth: 180,
                      }}
                    >
                      <option value=''>📍 Filter by State</option>
                      {states.map(([state, count]) => (
                        <option key={state} value={state}>
                          {state} — {count} voice{count !== 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>

                    {activeState && (
                      <button
                        onClick={() => setActiveState(null)}
                        style={{
                          background: '#2d6a4f', border: 'none',
                          borderRadius: 20, padding: '7px 14px',
                          color: '#f8f4f0', fontSize: 11,
                          fontWeight: 600, cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(45,106,79,0.35)',
                        }}
                      >✕ Clear</button>
                    )}

                    {activeState && (
                      <div style={{
                        background: '#2d6a4f22',
                        border: '1px solid #2d6a4f55',
                        borderRadius: 20, padding: '7px 14px',
                        fontSize: 11, color: '#2d6a4f', fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {stateCounts[activeState] || 0} voices in {activeState}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── STATS TOGGLE BUTTON ── */}
              {!presentationMode && (
                <button
                  onClick={() => setShowStats(s => !s)}
                  style={{
                    position: 'absolute', bottom: 24,
                    left: 'calc(50% + 130px)',
                    transform: 'translateX(-50%)',
                    background: showStats ? '#2d6a4f' : (darkMode ? 'rgba(13,32,24,0.9)' : 'rgba(255,252,245,0.95)'),
                    border: `1.5px solid ${showStats ? '#40916c' : T.navBorder}`,
                    borderRadius: 24, padding: '10px 22px',
                    color: showStats ? '#f8f4f0' : T.textSecondary,
                    fontSize: 13, cursor: 'pointer', zIndex: 40,
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    fontFamily: 'Syne, sans-serif', fontWeight: 600,
                    letterSpacing: 0.3, transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: showStats
                      ? '0 4px 20px rgba(45,106,79,0.45)'
                      : '0 4px 20px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  📊 {showStats ? 'Hide Stats' : 'Emotion Stats'}
                </button>
              )}

              {/* ── STATS OVERLAY PANEL ── */}
              {showStats && !presentationMode && (() => {
                const pool = activeEmotion
                  ? safeRespondents.filter(r => r.emotion === activeEmotion)
                  : safeRespondents
                const total = pool.length || 1
                const counts = {}
                orderedEmotions.forEach(([label]) => { counts[label] = 0 })
                pool.forEach(r => { if (counts[r.emotion] !== undefined) counts[r.emotion]++ })
                const max = Math.max(...Object.values(counts), 1)

                let cumulative = 0
                const radius = 54
                const circ = 2 * Math.PI * radius
                const segments = orderedEmotions.map(([label, color]) => {
                  const pct = counts[label] / total
                  const dash = pct * circ
                  const gap = circ - dash
                  const offset = circ - cumulative * circ
                  cumulative += pct
                  return { label, color, pct, dash, gap, offset, count: counts[label] }
                })
                const top = segments.reduce((a, b) => a.count > b.count ? a : b)

                return (
                  <div style={{
                    position: 'absolute', bottom: 72,
                    left: 'calc(50% + 130px)',
                    transform: 'translateX(-50%)',
                    width: 340, zIndex: 40,
                    background: darkMode ? 'rgba(13,32,24,0.96)' : 'rgba(255,252,245,0.96)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: `1px solid ${T.sidebarBorder}`,
                    borderRadius: 20, overflow: 'hidden',
                    boxShadow: darkMode
                      ? '0 20px 60px rgba(0,0,0,0.5)'
                      : '0 20px 60px rgba(0,0,0,0.12)',
                  }}>
                    {/* Header bar */}
                    <div style={{
                      background: '#2d6a4f',
                      padding: '14px 18px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{
                        fontFamily: 'Syne, sans-serif', fontWeight: 800,
                        fontSize: 12, color: '#f8f4f0', letterSpacing: 2,
                        textTransform: 'uppercase',
                      }}>Emotion Breakdown</div>
                      {activeEmotion && (
                        <span style={{
                          fontSize: 9, color: '#74c69d',
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: 20, padding: '2px 8px',
                        }}>filtered</span>
                      )}
                    </div>

                    <div style={{ padding: '16px 18px' }}>
                      {/* Donut + legend */}
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                        {/* Donut */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <svg width={124} height={124} style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx={62} cy={62} r={radius}
                              fill="none"
                              stroke={darkMode ? 'rgba(116,198,157,0.1)' : 'rgba(45,106,79,0.08)'}
                              strokeWidth={16}/>
                            {segments.map(({ label, color, dash, gap, offset }) => (
                              <circle key={label} cx={62} cy={62} r={radius}
                                fill="none" stroke={color} strokeWidth={16}
                                strokeDasharray={`${dash} ${gap}`}
                                strokeDashoffset={offset}
                                style={{ transition: 'all 0.6s ease' }}
                              />
                            ))}
                          </svg>
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{
                              fontFamily: 'Syne, sans-serif', fontWeight: 800,
                              fontSize: 24, color: T.textPrimary, lineHeight: 1,
                            }}>{total}</div>
                            <div style={{
                              fontSize: 8, color: T.textMuted,
                              letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 3,
                            }}>voices</div>
                          </div>
                        </div>

                        {/* Legend */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {segments.map(({ label, color, count }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div style={{
                                width: 9, height: 9, borderRadius: '50%',
                                background: color, flexShrink: 0,
                                boxShadow: `0 0 6px ${color}88`,
                              }}/>
                              <div style={{ flex: 1, fontSize: 10, color: T.textSecondary }}>
                                {label.replace(' / ', '/')}
                              </div>
                              <div style={{
                                fontSize: 11, color, fontWeight: 700, minWidth: 24, textAlign: 'right',
                              }}>{count}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bars */}
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: 7,
                        paddingTop: 14,
                        borderTop: `1px solid ${T.sidebarBorder}`,
                      }}>
                        {segments.map(({ label, color, count, pct }) => (
                          <div key={label}>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between',
                              fontSize: 9, marginBottom: 4,
                            }}>
                              <span style={{ color: T.textSecondary, fontWeight: 600 }}>
                                {label.split(' ')[0]}
                              </span>
                              <span style={{ color, fontWeight: 700 }}>
                                {Math.round(pct * 100)}%
                              </span>
                            </div>
                            <div style={{
                              height: 6, borderRadius: 3, overflow: 'hidden',
                              background: darkMode ? 'rgba(116,198,157,0.08)' : 'rgba(45,106,79,0.08)',
                            }}>
                              <div style={{
                                height: '100%', borderRadius: 3,
                                background: color,
                                width: `${(count / max) * 100}%`,
                                transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
                                boxShadow: `0 0 8px ${color}66`,
                              }}/>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Most common */}
                      <div style={{
                        marginTop: 14, paddingTop: 12,
                        borderTop: `1px solid ${T.sidebarBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span style={{ fontSize: 9, color: T.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
                          Most Common
                        </span>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: `${top.color}18`,
                          border: `1px solid ${top.color}55`,
                          borderRadius: 20, padding: '4px 12px 4px 8px',
                        }}>
                          <div style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: top.color, boxShadow: `0 0 6px ${top.color}`,
                          }}/>
                          <span style={{ fontSize: 11, color: top.color, fontWeight: 700 }}>
                            {top.label}
                          </span>
                          <span style={{ fontSize: 11, color: T.textMuted }}>
                            · {Math.round(top.pct * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* PRESENTATION MODE */}
              {presentationMode && (
                <>
                  <button
                    onClick={() => setPresentationMode(false)}
                    style={{
                      position: 'absolute', top: 20, right: 20,
                      background: 'rgba(45,106,79,0.9)',
                      border: '1px solid #40916c',
                      borderRadius: 20, padding: '8px 18px',
                      color: '#f8f4f0', fontSize: 12,
                      fontFamily: 'Syne, sans-serif', fontWeight: 600,
                      cursor: 'pointer', zIndex: 50,
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 4px 16px rgba(45,106,79,0.5)',
                    }}
                  >✕ Exit Presentation</button>

                  {!selectedDot && (
                    <div style={{
                      position: 'absolute', bottom: 28, left: '50%',
                      transform: 'translateX(-50%)',
                      pointerEvents: 'none', textAlign: 'center', zIndex: 10, width: '100%',
                    }}>
                      <div style={{
                        fontFamily: 'Syne, sans-serif', fontWeight: 800,
                        fontSize: 32, color: '#f8f4f0',
                        textShadow: '0 2px 24px rgba(0,0,0,0.9)',
                        letterSpacing: -0.5, marginBottom: 6,
                      }}>Elevate Black Voices</div>
                      <div style={{
                        fontSize: 13, color: 'rgba(248,244,240,0.6)',
                        textShadow: '0 1px 8px rgba(0,0,0,0.8)', marginBottom: 16,
                      }}>
                        {safeRespondents.length} voices across the United States · Howard University × Google
                      </div>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {orderedEmotions.map(([label, color]) => (
                          <div key={label} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'rgba(13,32,24,0.7)', backdropFilter: 'blur(8px)',
                            border: `1px solid ${color}55`,
                            borderRadius: 20, padding: '5px 12px 5px 8px',
                          }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: color, boxShadow: `0 0 6px ${color}`,
                            }}/>
                            <span style={{ fontSize: 12, color: '#f8f4f0' }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDot && ans && (
                    <div style={{
                      position: 'absolute', top: '50%', right: 40,
                      transform: 'translateY(-50%)',
                      width: 400, zIndex: 50,
                      background: 'rgba(0,8,24,0.88)',
                      backdropFilter: 'blur(28px)',
                      WebkitBackdropFilter: 'blur(28px)',
                      border: `1px solid ${dotColor}44`,
                      borderRadius: 20, padding: 26,
                      boxShadow: `0 0 60px ${dotColor}22, 0 20px 60px rgba(0,0,0,0.7)`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                        <MemojiAvatar respondent={selectedDot} size={52} emotionColor={dotColor}/>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontFamily: 'Syne, sans-serif', fontWeight: 700,
                            fontSize: 16, color: HU.white,
                          }}>{displayName}</div>
                          <div style={{ fontSize: 11, color: 'rgba(248,244,240,0.65)', marginTop: 3 }}>
                            📍 {selectedDot.city}{selectedDot.isUnknown ? '' : ', US'}
                          </div>
                          <div style={{
                            display: 'inline-block', marginTop: 5,
                            background: dotColor,
                            borderRadius: 20, padding: '2px 10px',
                            fontSize: 9, color: HU.white,
                            textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700,
                          }}>{selectedDot.emotion}</div>
                        </div>
                        <button onClick={closePopup} style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: 'rgba(248,244,240,0.65)', width: 30, height: 30,
                          borderRadius: '50%', cursor: 'pointer', fontSize: 14,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>✕</button>
                      </div>

                      <div style={{
                        fontSize: 9, color: 'rgba(116,198,157,0.65)',
                        letterSpacing: 1.5, textTransform: 'uppercase',
                        fontWeight: 600, marginBottom: 12,
                      }}>Question {currentQ + 1} of {selectedDot.answers.length}</div>

                      <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '4px 16px 16px 16px',
                        padding: '11px 15px', marginBottom: 12,
                        fontSize: 13, color: `${HU.white}77`,
                        lineHeight: 1.6, fontStyle: 'italic',
                      }}>{ans.question}</div>

                      {/* Answer bubble — color reflects this answer's detected emotion */}
                      <div style={{
                        background: ans.emotion.color,
                        borderRadius: '16px 16px 16px 4px',
                        padding: '15px 18px', fontSize: 14, lineHeight: 1.8, color: HU.white,
                        boxShadow: `0 8px 32px ${ans.emotion.color}55`,
                        marginBottom: 16,
                      }}>{cleaned}</div>

                      {ans.sentiment && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                          <span style={{ fontSize: 10, color: 'rgba(116,198,157,0.65)', whiteSpace: 'nowrap' }}>Sentiment</span>
                          <div style={{
                            flex: 1, height: 4, background: 'rgba(255,255,255,0.08)',
                            borderRadius: 2, overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${Math.min(100, Math.max(0, (parseFloat(ans.sentiment) + 1) / 2 * 100))}%`,
                              height: '100%', background: ans.emotion.color,
                              borderRadius: 2, transition: 'width 0.6s ease',
                            }}/>
                          </div>
                          <span style={{
                            fontSize: 10, color: ans.emotion.color,
                            fontWeight: 700, whiteSpace: 'nowrap',
                          }}>{sentimentLabel(ans.sentiment)}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <button
                          onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
                          disabled={currentQ === 0}
                          style={{
                            background: currentQ === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(64,145,108,0.3)',
                            border: `1px solid ${currentQ === 0 ? 'rgba(255,255,255,0.1)' : '#40916c'}`,
                            color: currentQ === 0 ? 'rgba(255,255,255,0.25)' : '#f8f4f0',
                            borderRadius: 20, padding: '8px 20px',
                            cursor: currentQ === 0 ? 'not-allowed' : 'pointer',
                            fontSize: 13, fontWeight: 600,
                            transition: 'all 0.2s',
                          }}
                        >← Prev</button>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          {selectedDot.answers.slice(0, 10).map((a, i) => (
                            <div key={i} onClick={() => setCurrentQ(i)} style={{
                              width: i === currentQ ? 18 : 6, height: 6, borderRadius: 3,
                              background: i === currentQ ? a.emotion.color : 'rgba(255,255,255,0.2)',
                              cursor: 'pointer', transition: 'all 0.2s',
                            }}/>
                          ))}
                          {selectedDot.answers.length > 10 && (
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                              +{selectedDot.answers.length - 10}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setCurrentQ(q => Math.min(selectedDot.answers.length - 1, q + 1))}
                          disabled={currentQ === selectedDot.answers.length - 1}
                          style={{
                            background: currentQ === selectedDot.answers.length - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(64,145,108,0.3)',
                            border: `1px solid ${currentQ === selectedDot.answers.length - 1 ? 'rgba(255,255,255,0.1)' : '#40916c'}`,
                            color: currentQ === selectedDot.answers.length - 1 ? 'rgba(255,255,255,0.25)' : '#f8f4f0',
                            borderRadius: 20, padding: '8px 20px',
                            cursor: currentQ === selectedDot.answers.length - 1 ? 'not-allowed' : 'pointer',
                            fontSize: 13, fontWeight: 600,
                            transition: 'all 0.2s',
                          }}
                        >Next →</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* GLASS RESPONSE PANEL — overlays from right */}
            {!presentationMode && (
              <div style={{
                position: 'absolute', top: 0, right: 0, bottom: 0,
                width: selectedDot ? PANEL_W : 0,
                overflow: 'hidden',
                background: T.panelBg,
                backdropFilter: T.glassBlur,
                WebkitBackdropFilter: T.glassBlur,
                borderLeft: `1px solid ${ansColor ? ansColor + '55' : T.sidebarBorder}`,
                display: 'flex', flexDirection: 'column', zIndex: 20,
                boxShadow: ansColor ? `-4px 0 40px ${ansColor}22` : '-4px 0 20px rgba(0,0,0,0.06)',
                transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)',
              }}>
                {selectedDot && (
                  <div style={{ width: PANEL_W, height: '100%', display: 'flex', flexDirection: 'column' }}>

                    {/* Header */}
                    <div style={{
                      padding: '18px 18px 14px',
                      borderBottom: `1px solid ${ansColor}33`,
                      background: `linear-gradient(135deg, ${ansColor}18, rgba(255,252,245,0.5))`,
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
                      transition: 'background 0.4s ease, border-color 0.4s ease',
                    }}>
                      <MemojiAvatar respondent={selectedDot} size={52} emotionColor={ansColor}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'Syne, sans-serif', fontWeight: 700,
                          fontSize: 15, color: '#1b4332',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{displayName}</div>
                        <div style={{ fontSize: 11, color: '#40916c', marginTop: 3 }}>
                          📍 {selectedDot.city}{selectedDot.isUnknown ? '' : ', United States'}
                        </div>
                        <div style={{
                          display: 'inline-block', marginTop: 6,
                          background: ansColor,
                          borderRadius: 20, padding: '2px 10px',
                          fontSize: 9, color: HU.white,
                          textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700,
                          boxShadow: `0 2px 10px ${ansColor}55`,
                          transition: 'background 0.4s ease, box-shadow 0.4s ease',
                        }}>{ansEmotionLabel}</div>
                      </div>
                      <button onClick={closePopup} style={{
                        background: 'rgba(45,106,79,0.12)',
                        border: '1px solid rgba(45,106,79,0.3)',
                        color: '#2d6a4f', width: 30, height: 30,
                        borderRadius: '50%', cursor: 'pointer', fontSize: 15,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        fontWeight: 700,
                      }}>✕</button>
                    </div>

                    {/* Q&A */}
                    <div style={{
                      flex: 1, overflowY: 'auto', padding: '18px',
                      display: 'flex', flexDirection: 'column', gap: 14,
                    }}>
                      {ans && (
                        <>
                          <div style={{
                            fontSize: 9, color: '#2d6a4f',
                            letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700,
                          }}>Question {currentQ + 1} of {selectedDot.answers.length}</div>

                          {/* Question bubble */}
                          <div style={{
                            background: 'rgba(45,106,79,0.08)',
                            border: '1px solid rgba(45,106,79,0.25)',
                            borderRadius: '6px 16px 16px 16px', padding: '12px 16px',
                            fontSize: 12, color: '#1b4332',
                            lineHeight: 1.7, fontStyle: 'italic',
                            letterSpacing: 0.1,
                          }}>{ans.question}</div>

                          {/* Answer bubble */}
                          <div style={{
                            background: ansColor || '#2d6a4f',
                            borderRadius: '16px 16px 16px 6px',
                            padding: '14px 18px', fontSize: 13, lineHeight: 1.85,
                            color: '#ffffff',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
                            position: 'relative',
                            transition: 'background 0.4s ease',
                            letterSpacing: 0.1,
                          }}>
                            {cleaned}
                            <div style={{
                              position: 'absolute', bottom: -9, left: 18,
                              width: 0, height: 0,
                              borderLeft: '9px solid transparent',
                              borderRight: '9px solid transparent',
                              borderTop: `9px solid ${ansColor || '#2d6a4f'}`,
                            }}/>
                          </div>

                          {ans.sentiment && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 10, color: '#40916c', whiteSpace: 'nowrap' }}>
                                Sentiment
                              </span>
                              <div style={{
                                flex: 1, height: 5, background: 'rgba(45,106,79,0.12)',
                                borderRadius: 3, overflow: 'hidden',
                              }}>
                                <div style={{
                                  width: `${Math.min(100, Math.max(0,
                                    (parseFloat(ans.sentiment) + 1) / 2 * 100
                                  ))}%`,
                                  height: '100%', background: ansColor || '#2d6a4f',
                                  borderRadius: 3, transition: 'width 0.6s ease, background 0.4s ease',
                                }}/>
                              </div>
                              <span style={{
                                fontSize: 10, color: ansColor || '#2d6a4f',
                                fontWeight: 700, whiteSpace: 'nowrap',
                                transition: 'color 0.4s ease',
                              }}>{sentimentLabel(ans.sentiment)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Nav footer */}
                    <div style={{
                      padding: '12px 18px',
                      borderTop: `1px solid ${T.sidebarBorder}`,
                      background: T.glassBg,
                      backdropFilter: T.glassBlur,
                      WebkitBackdropFilter: T.glassBlur,
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', flexShrink: 0, gap: 12,
                    }}>
                      <button
                        onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
                        disabled={currentQ === 0}
                        style={{
                          background: currentQ === 0 ? 'transparent' : '#2d6a4f',
                          border: `1.5px solid ${currentQ === 0 ? T.sidebarBorder : '#40916c'}`,
                          color: currentQ === 0 ? T.textMuted : '#f8f4f0',
                          borderRadius: 20, padding: '8px 20px',
                          cursor: currentQ === 0 ? 'not-allowed' : 'pointer',
                          fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                          boxShadow: currentQ === 0 ? 'none' : '0 4px 12px rgba(45,106,79,0.4)',
                        }}
                      >← Prev</button>

                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                        {selectedDot.answers.slice(0, 10).map((a, i) => (
                          <div key={i} onClick={() => setCurrentQ(i)} style={{
                            width: i === currentQ ? 20 : 6, height: 6, borderRadius: 3,
                            background: i === currentQ ? ansColor : T.sidebarBorder,
                            cursor: 'pointer', transition: 'all 0.25s',
                            boxShadow: i === currentQ ? `0 0 8px ${ansColor}` : 'none',
                          }}/>
                        ))}
                        {selectedDot.answers.length > 10 && (
                          <span style={{ fontSize: 10, color: T.textMuted }}>
                            +{selectedDot.answers.length - 10}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setCurrentQ(q => Math.min(selectedDot.answers.length - 1, q + 1))}
                        disabled={currentQ === selectedDot.answers.length - 1}
                        style={{
                          background: currentQ === selectedDot.answers.length - 1 ? 'transparent' : '#2d6a4f',
                          border: `1.5px solid ${currentQ === selectedDot.answers.length - 1 ? T.sidebarBorder : '#40916c'}`,
                          color: currentQ === selectedDot.answers.length - 1 ? T.textMuted : '#f8f4f0',
                          borderRadius: 20, padding: '8px 20px',
                          cursor: currentQ === selectedDot.answers.length - 1 ? 'not-allowed' : 'pointer',
                          fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                          boxShadow: currentQ === selectedDot.answers.length - 1 ? 'none' : '0 4px 12px rgba(45,106,79,0.4)',
                        }}
                      >Next →</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
    </>
      )}
    </div>
  )
}
