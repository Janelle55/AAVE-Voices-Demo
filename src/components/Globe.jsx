import { useEffect, useRef } from 'react'
import GlobeGL from 'globe.gl'

const MANIFEST_VERSION = 'v1'

const MEMOJI_FILES = [
  'avatar-1.png', 'avatar-2.png', 'avatar-3.png', 'avatar-4.png', 'avatar-5.png', 'avatar-6.png', 'avatar-7.png', 'avatar-8.png',
]

const UNKNOWN_LABEL_DATA = [
  { _isSeaLabel: true, lat: 36.0, lng: -58.0, name: '❓ Unknown Locations' }
]

function hashStr(str) {
  let hash = 0
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function getSpeakerIdentityKey(speaker) {
  return [
    speaker.sessionId || '',
    speaker.id || '',
    speaker.speakerLabel || '',
    speaker.voiceNumber != null ? String(speaker.voiceNumber) : '',
    speaker.city || '',
    speaker.state || speaker.region || speaker.stateCode || ''
  ].join('|')
}

function getMemojiUrl(respondent) {
  const identityKey = getSpeakerIdentityKey(respondent)
  const h = hashStr(identityKey || respondent.sessionId || respondent.id || respondent.city || 'speaker')
  return '/avatars/' + encodeURIComponent(MEMOJI_FILES[h % MEMOJI_FILES.length])
}

function cleanText(text) {
  return (text || '').replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim()
}

function voiceName(d) {
  if (d.voiceNumber) return 'Voice #' + String(d.voiceNumber).padStart(3, '0')
  if (d.speakerLabel) return d.speakerLabel
  if (d.id) return d.id
  return 'Speaker'
}

function createAvatarHTML(respondent, overrideTranscript) {
  const color = respondent.emotionColor || '#74c69d'
  const rawText = overrideTranscript || (respondent.answers && respondent.answers[0] && respondent.answers[0].transcript) || ''
  const preview = cleanText(rawText).slice(0, 80)
  const suffix = preview.length >= 80 ? '...' : ''
  const avatarUrl = getMemojiUrl(respondent)
  const name = voiceName(respondent)

  const wrapStyle = 'pointer-events:none;position:relative;width:0;height:0;'
  const stackStyle = [
    'position:absolute',
    'bottom:5px',
    'left:-95px',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'width:190px',
    'transform-origin:bottom center',
    'animation:avatarStand 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
  ].join(';')

  const bubbleStyle = [
    'position:relative',
    'width:100%',
    'box-sizing:border-box',
    'background:rgba(13,32,24,0.95)',
    'border:1px solid ' + color + '55',
    'border-radius:16px',
    'padding:12px 14px 10px',
    'box-shadow:0 8px 32px rgba(0,0,0,0.6)',
    'margin-bottom:0',
  ].join(';')

  const accentBarStyle = [
    'position:absolute',
    'top:0',
    'left:14px',
    'right:14px',
    'height:2px',
    'background:linear-gradient(90deg,' + color + ',' + color + '22)',
    'border-radius:0 0 4px 4px',
  ].join(';')

  const nameStyle = [
    'font-family:DM Sans,sans-serif',
    'font-size:9px',
    'font-weight:700',
    'color:' + color,
    'letter-spacing:1px',
    'text-transform:uppercase',
    'margin-bottom:6px',
  ].join(';')

  const textStyle = [
    'font-family:DM Sans,sans-serif',
    'font-size:11px',
    'line-height:1.6',
    'color:rgba(248,244,240,0.90)',
    'overflow:hidden',
    'max-height:52px',
  ].join(';')

  const outerArrowStyle = [
    'width:0',
    'height:0',
    'border-left:7px solid transparent',
    'border-right:7px solid transparent',
    'border-top:8px solid ' + color + '55',
  ].join(';')

  const innerArrowStyle = [
    'width:0',
    'height:0',
    'margin-top:-7px',
    'margin-bottom:4px',
    'border-left:5px solid transparent',
    'border-right:5px solid transparent',
    'border-top:6px solid rgba(13,32,24,0.95)',
  ].join(';')

  const memojiRingStyle = [
    'width:72px',
    'height:72px',
    'border-radius:50%',
    'border:2.5px solid ' + color,
    'box-shadow:0 0 20px ' + color + '88,0 0 40px ' + color + '33,0 4px 16px rgba(0,0,0,0.5)',
    'overflow:hidden',
    'background:#080c1c',
    'flex-shrink:0',
  ].join(';')

  const stemStyle = [
    'width:2px',
    'height:22px',
    'flex-shrink:0',
    'background:linear-gradient(to bottom,' + color + 'cc,transparent)',
    'border-radius:1px',
  ].join(';')

  const dotStyle = [
    'width:10px',
    'height:10px',
    'border-radius:50%',
    'flex-shrink:0',
    'background:' + color,
    'margin-top:-1px',
    'box-shadow:0 0 10px ' + color + ',0 0 20px ' + color + '66',
  ].join(';')

  return (
    '<div style="' + wrapStyle + '">' +
      '<div style="' + stackStyle + '">' +
        '<div style="' + bubbleStyle + '">' +
          '<div style="' + accentBarStyle + '"></div>' +
          '<div style="' + nameStyle + '">' + name + '</div>' +
          '<div style="' + textStyle + '">' + preview + suffix + '</div>' +
        '</div>' +
        '<div style="' + outerArrowStyle + '"></div>' +
        '<div style="' + innerArrowStyle + '"></div>' +
        '<div style="' + memojiRingStyle + '">' +
          '<img src="' + avatarUrl + '" width="72" height="72" style="display:block;object-fit:cover;border-radius:50%;" onerror="this.style.display=\'none\'"/>' +
        '</div>' +
        '<div style="' + stemStyle + '"></div>' +
        '<div style="' + dotStyle + '"></div>' +
      '</div>' +
    '</div>'
  )
}

function createSeaLabelHTML(name) {
  return (
    '<div style="pointer-events:none;display:flex;flex-direction:column;align-items:center;">' +
      '<div style="background:rgba(13,32,24,0.85);border:1.5px solid rgba(116,198,157,0.5);border-radius:20px;padding:6px 16px;font-family:DM Sans,sans-serif;font-size:12px;font-weight:600;color:#74c69d;white-space:nowrap;letter-spacing:0.5px;box-shadow:0 4px 16px rgba(0,0,0,0.3);">' +
        name +
      '</div>' +
    '</div>'
  )
}

function buildHtmlElement(d) {
  const el = document.createElement('div')
  el.style.cssText = 'pointer-events:none;'
  if (d._isSeaLabel) {
    el.innerHTML = createSeaLabelHTML(d.name)
  } else {
    el.innerHTML = createAvatarHTML(d, d._override || null)
  }
  return el
}

function toPublicAudioUrl(src) {
  if (!src) return ''
  const s = String(src).trim()

  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('/audio/')) return s

  const publicIndex = s.indexOf('/public/')
  if (publicIndex >= 0) return s.slice(publicIndex + '/public'.length)

  return '/audio/map-data/' + MANIFEST_VERSION + '/' + s.replace(/^\/+/, '')
}

function getAudioSrc(dot) {
  return toPublicAudioUrl(
    dot.audioSrc ||
    dot.audioFile ||
    dot.src ||
    dot.file ||
    dot.filename ||
    dot.url ||
    dot.audioUrl ||
    ''
  )
}

function normalizeAudioDot(dot, index) {
  if (!dot) return null

  const lat = Number(
    dot.lat != null ? dot.lat :
    dot.latitude != null ? dot.latitude :
    dot.coordinates && dot.coordinates.lat != null ? dot.coordinates.lat :
    NaN
  )

  const lng = Number(
    dot.lng != null ? dot.lng :
    dot.longitude != null ? dot.longitude :
    dot.coordinates && dot.coordinates.lng != null ? dot.coordinates.lng :
    NaN
  )

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  const speakerLabel =
    dot.speakerLabel ||
    dot.speaker ||
    dot.voiceLabel ||
    (dot.voiceNumber ? 'Speaker ' + String(dot.voiceNumber).padStart(3, '0') : null) ||
    dot.name ||
    'Speaker'

  const normalized = Object.assign({}, dot, {
    id: dot.id || dot.sessionId || dot.city || ('audio-' + index),
    sessionId: dot.sessionId || dot.id || dot.city || ('audio-' + index),
    lat: lat,
    lng: lng,
    audioSrc: getAudioSrc(dot),
    emotion: dot.emotion || dot.label || 'Audio',
    emotionColor: dot.emotionColor || dot.color || '#f59e0b',
    city: dot.city || dot.locationName || dot.name || 'Audio',
    state: dot.state || dot.region || dot.stateCode || '',
    speakerLabel: speakerLabel,
    speakerState: dot.state || dot.region || dot.stateCode || '',
    _cluster: false,
    _count: 1,
    isAudioDot: true,
  })

  normalized.bitmojiUrl = dot.bitmojiUrl || dot.avatarUrl || getMemojiUrl(normalized)
  return normalized
}

function clusterPoints(points, altitude) {
  const cellDeg = altitude > 2.5 ? 4 : altitude > 1.5 ? 2.5 : altitude > 1.0 ? 1.2 : 0
  if (cellDeg === 0) return points.map(function(p) {
    return Object.assign({}, p, { _cluster: false, _count: 1 })
  })

  const grid = {}
  points.forEach(function(p) {
    const row = Math.floor(p.lat / cellDeg)
    const col = Math.floor(p.lng / cellDeg)
    const key = row + '_' + col
    if (!grid[key]) grid[key] = []
    grid[key].push(p)
  })

  return Object.values(grid).map(function(group) {
    if (group.length === 1) return Object.assign({}, group[0], { _cluster: false, _count: 1 })

    const emotionCounts = {}
    group.forEach(function(p) {
      emotionCounts[p.emotion] = (emotionCounts[p.emotion] || 0) + 1
    })

    const dominant = Object.entries(emotionCounts).reduce(function(a, b) {
      return b[1] > a[1] ? b : a
    })

    const avgLat = group.reduce(function(s, p) { return s + p.lat }, 0) / group.length
    const avgLng = group.reduce(function(s, p) { return s + p.lng }, 0) / group.length

    return {
      lat: avgLat,
      lng: avgLng,
      emotion: dominant[0],
      emotionColor: group.find(function(p) { return p.emotion === dominant[0] }).emotionColor,
      _cluster: true,
      _count: group.length,
      _members: group,
    }
  })
}

export default function Globe({
  respondents,
  audioDots = [],
  activeEmotion,
  activeState,
  onDotClick,
  selectedQuestionId,
  heatmap,
  darkMode
}) {
  const containerRef = useRef(null)
  const globeRef = useRef(null)
  const onDotClickRef = useRef(onDotClick)
  const selectedQuestionIdRef = useRef(selectedQuestionId)
  const selectedSessionIdRef = useRef(null)
  const respondentsRef = useRef(respondents)
  const activeEmotionRef = useRef(activeEmotion)
  const activeStateRef = useRef(activeState)
  const heatmapRef = useRef(heatmap)
  const audioDotsRef = useRef(audioDots)

  const audioPlayerRef = useRef(null)
  const audioControlBarRef = useRef(null)
  const audioPlayPauseBtnRef = useRef(null)
  const audioAutoBtnRef = useRef(null)
  const audioSpeakerNameRef = useRef(null)
  const audioSpeakerStateRef = useRef(null)
  const audioSpeakerAvatarRef = useRef(null)
  const audioWaveCanvasRef = useRef(null)

  const currentAudioIndexRef = useRef(-1)
  const autoPlayEnabledRef = useRef(true)
  const focusModeEnabledRef = useRef(true)
  const activeAudioSessionIdRef = useRef(null)
  const audioPulseTickRef = useRef(0)
  const audioControlVisibleRef = useRef(false)
  const audioControlLockedRef = useRef(false)
  const lastMousePosRef = useRef({ x: 120, y: 120 })

  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const waveformDataRef = useRef(null)
  const waveformAnimFrameRef = useRef(null)

  useEffect(() => { onDotClickRef.current = onDotClick }, [onDotClick])
  useEffect(() => { selectedQuestionIdRef.current = selectedQuestionId }, [selectedQuestionId])
  useEffect(() => { respondentsRef.current = respondents }, [respondents])
  useEffect(() => { activeEmotionRef.current = activeEmotion }, [activeEmotion])
  useEffect(() => { activeStateRef.current = activeState }, [activeState])
  useEffect(() => { audioDotsRef.current = audioDots }, [audioDots])

  function getCurrentAltitude() {
    const pov = globeRef.current ? globeRef.current.pointOfView() : null
    return pov ? pov.altitude : 1.8
  }

  function getSafeAudioDots() {
    return (audioDotsRef.current || []).map(normalizeAudioDot).filter(Boolean)
  }

  function getCurrentAudioDot() {
    const dots = getSafeAudioDots()
    if (!dots.length) return null
    if (currentAudioIndexRef.current < 0 || currentAudioIndexRef.current >= dots.length) return null
    return dots[currentAudioIndexRef.current]
  }

  function focusGlobeOnAudioDot(dot, durationMs) {
    if (!globeRef.current || !dot) return
    globeRef.current.pointOfView(
      {
        lat: dot.lat,
        lng: dot.lng,
        altitude: 0.72
      },
      durationMs || 1400
    )
  }

  function maybeFocusCurrentAudioDot(durationMs) {
    if (!autoPlayEnabledRef.current) return
    if (!focusModeEnabledRef.current) return
    const dot = getCurrentAudioDot()
    if (!dot) return
    focusGlobeOnAudioDot(dot, durationMs || 1400)
  }

  function getAnimatedAudioDots() {
    const dots = getSafeAudioDots()
    const player = audioPlayerRef.current
    const isPlaying = !!(player && !player.paused && !player.ended)
    const pulse = 0.85 + 0.35 * Math.abs(Math.sin(audioPulseTickRef.current))

    return dots.map(function(dot, index) {
      const isActive = isPlaying && activeAudioSessionIdRef.current && dot.sessionId === activeAudioSessionIdRef.current
      return Object.assign({}, dot, {
        _isSpeaking: isActive,
        _audioPulse: isActive ? pulse : 1,
        _audioIndex: index,
      })
    })
  }

  function updateSpeakerUI() {
    const dot = getCurrentAudioDot()

    if (audioSpeakerNameRef.current) {
      audioSpeakerNameRef.current.textContent = dot ? (dot.speakerLabel || 'Speaker') : 'Speaker'
    }

    if (audioSpeakerStateRef.current) {
      const stateText = dot
        ? ((dot.city || 'Unknown') + (dot.speakerState ? ', ' + dot.speakerState : ''))
        : ''
      audioSpeakerStateRef.current.textContent = stateText
    }

    if (audioSpeakerAvatarRef.current) {
      if (dot && dot.bitmojiUrl) {
        audioSpeakerAvatarRef.current.src = dot.bitmojiUrl
        audioSpeakerAvatarRef.current.style.display = 'block'
      } else {
        audioSpeakerAvatarRef.current.style.display = 'none'
      }
    }
  }

  function updateAudioControlsUI() {
    if (!audioControlBarRef.current) return

    const hasAudioMode = getSafeAudioDots().length > 0
    audioControlBarRef.current.style.display = hasAudioMode && audioControlVisibleRef.current ? 'flex' : 'none'

    if (audioPlayPauseBtnRef.current) {
      const player = audioPlayerRef.current
      const isPlaying = !!(player && !player.paused && !player.ended)
      audioPlayPauseBtnRef.current.textContent = isPlaying ? 'Pause' : 'Play'
    }

    if (audioAutoBtnRef.current) {
      const enabled = !!autoPlayEnabledRef.current
      audioAutoBtnRef.current.textContent = enabled ? 'Auto On' : 'Auto Off'
      audioAutoBtnRef.current.setAttribute('aria-pressed', enabled ? 'true' : 'false')
      audioAutoBtnRef.current.style.background = enabled ? 'rgba(245,158,11,0.16)' : 'rgba(255,255,255,0.05)'
      audioAutoBtnRef.current.style.borderColor = enabled ? 'rgba(245,158,11,0.45)' : 'rgba(245,158,11,0.24)'
      audioAutoBtnRef.current.style.color = enabled ? '#fde68a' : '#fff8e0'
    }

    updateSpeakerUI()
  }

  function showAudioControlsAt(clientX, clientY) {
    if (!audioControlBarRef.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const offsetX = 18
    const offsetY = 18
    const maxLeft = Math.max(16, rect.width - 340)
    const maxTop = Math.max(16, rect.height - 180)

    const left = Math.min(Math.max(16, clientX - rect.left + offsetX), maxLeft)
    const top = Math.min(Math.max(16, clientY - rect.top + offsetY), maxTop)

    audioControlBarRef.current.style.left = left + 'px'
    audioControlBarRef.current.style.top = top + 'px'
    audioControlVisibleRef.current = true
    updateAudioControlsUI()
  }

  function fadeAudioControlsDim() {
    if (!audioControlBarRef.current) return
    audioControlBarRef.current.style.opacity = '0.18'
  }

  function fadeAudioControlsFull() {
    if (!audioControlBarRef.current) return
    audioControlBarRef.current.style.opacity = '1'
  }

  function refreshAudioVisuals() {
    if (!globeRef.current) return
    if (!getSafeAudioDots().length) return
    renderCurrentPoints()
    updateAudioControlsUI()
  }

  function ensureAudioAnalyser(player) {
    if (typeof window === 'undefined') return
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx()
    }

    if (!sourceNodeRef.current) {
      sourceNodeRef.current = audioContextRef.current.createMediaElementSource(player)
    }

    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      analyserRef.current.smoothingTimeConstant = 0.8
    }

    sourceNodeRef.current.disconnect()
    analyserRef.current.disconnect()

    sourceNodeRef.current.connect(analyserRef.current)
    analyserRef.current.connect(audioContextRef.current.destination)

    waveformDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
  }

  function drawIdleWave() {
    const canvas = audioWaveCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const midY = height / 2

    ctx.clearRect(0, 0, width, height)

    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(245,158,11,0.18)'
    ctx.beginPath()
    ctx.moveTo(6, midY)
    ctx.lineTo(width - 6, midY)
    ctx.stroke()

    for (let i = 0; i < 18; i++) {
      const x = 10 + (i * (width - 20) / 17)
      ctx.beginPath()
      ctx.fillStyle = i % 3 === 0 ? 'rgba(253,230,138,0.38)' : 'rgba(255,248,224,0.20)'
      ctx.arc(x, midY, 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function startWaveformLoop() {
    stopWaveformLoop()

    function draw() {
      const canvas = audioWaveCanvasRef.current
      const analyser = analyserRef.current
      const player = audioPlayerRef.current
      const dataArray = waveformDataRef.current

      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const width = canvas.width
      const height = canvas.height
      const midY = height / 2

      ctx.clearRect(0, 0, width, height)

      if (!player || player.paused || player.ended || !analyser || !dataArray) {
        drawIdleWave()
        waveformAnimFrameRef.current = requestAnimationFrame(draw)
        return
      }

      analyser.getByteTimeDomainData(dataArray)

      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(245,158,11,0.95)'
      ctx.beginPath()

      const usable = Math.min(dataArray.length, 48)
      for (let i = 0; i < usable; i++) {
        const x = 10 + (i / (usable - 1)) * (width - 20)
        const v = dataArray[i] / 128.0
        const y = midY + (v - 1) * (height * 0.34)

        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      for (let i = 0; i < usable; i++) {
        const x = 10 + (i / (usable - 1)) * (width - 20)
        const v = dataArray[i] / 128.0
        const y = midY + (v - 1) * (height * 0.34)
        const emphasis = Math.abs(v - 1)
        const r = 1.6 + emphasis * 2.1

        ctx.beginPath()
        ctx.fillStyle = i % 2 === 0 ? 'rgba(253,230,138,0.98)' : 'rgba(255,248,224,0.88)'
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'
      ctx.beginPath()
      ctx.moveTo(8, midY)
      ctx.lineTo(width - 8, midY)
      ctx.stroke()

      waveformAnimFrameRef.current = requestAnimationFrame(draw)
    }

    waveformAnimFrameRef.current = requestAnimationFrame(draw)
  }

  function stopWaveformLoop() {
    if (waveformAnimFrameRef.current) {
      cancelAnimationFrame(waveformAnimFrameRef.current)
      waveformAnimFrameRef.current = null
    }
  }

  function ensureAudioPlayer() {
    if (audioPlayerRef.current) return audioPlayerRef.current

    const player = new Audio()
    player.preload = 'auto'
    player.crossOrigin = 'anonymous'

    player.addEventListener('play', function() {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(function() {})
      }
      updateAudioControlsUI()
      refreshAudioVisuals()
    })

    player.addEventListener('pause', function() {
      updateAudioControlsUI()
      refreshAudioVisuals()
    })

    player.addEventListener('timeupdate', function() {
      audioPulseTickRef.current = player.currentTime * 5.5
      refreshAudioVisuals()
    })

    player.addEventListener('ended', function() {
      activeAudioSessionIdRef.current = null
      updateAudioControlsUI()
      refreshAudioVisuals()
      if (!autoPlayEnabledRef.current) return
      playNextAudio(true, true)
    })

    audioPlayerRef.current = player
    ensureAudioAnalyser(player)
    startWaveformLoop()
    return player
  }

  function playAudioDotByIndex(index, shouldAutoplay, fromAutoAdvance) {
    const dots = getAnimatedAudioDots()
    if (!dots.length) return
    if (index < 0 || index >= dots.length) return

    const point = dots[index]
    const src = point.audioSrc || ''
    if (!src) {
      console.warn('No audio source found for audio dot:', point)
      return
    }

    const player = ensureAudioPlayer()
    ensureAudioAnalyser(player)

    currentAudioIndexRef.current = index
    activeAudioSessionIdRef.current = point.sessionId
    audioPulseTickRef.current = 0

    updateSpeakerUI()

    if (fromAutoAdvance && autoPlayEnabledRef.current && focusModeEnabledRef.current) {
      focusGlobeOnAudioDot(point, 1500)
    }

    player.pause()
    player.src = src
    player.currentTime = 0
    player.load()

    if (shouldAutoplay) {
      player.play().then(function() {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(function() {})
        }
        updateAudioControlsUI()
        refreshAudioVisuals()
      }).catch(function(err) {
        console.error('Audio playback failed for src:', src, err)
        updateAudioControlsUI()
        refreshAudioVisuals()
      })
    } else {
      updateAudioControlsUI()
      refreshAudioVisuals()
    }
  }

  function playNextAudio(shouldAutoplay, fromAutoAdvance) {
    const dots = getAnimatedAudioDots()
    if (!dots.length) return

    const nextIndex = currentAudioIndexRef.current >= 0
      ? (currentAudioIndexRef.current + 1) % dots.length
      : 0

    playAudioDotByIndex(nextIndex, shouldAutoplay, !!fromAutoAdvance)
  }

  function playPrevAudio(shouldAutoplay) {
    const dots = getAnimatedAudioDots()
    if (!dots.length) return

    const prevIndex = currentAudioIndexRef.current > 0
      ? currentAudioIndexRef.current - 1
      : dots.length - 1

    playAudioDotByIndex(prevIndex, shouldAutoplay, false)
  }

  function toggleAutoPlay() {
    autoPlayEnabledRef.current = !autoPlayEnabledRef.current
    updateAudioControlsUI()

    if (autoPlayEnabledRef.current && focusModeEnabledRef.current) {
      maybeFocusCurrentAudioDot(1000)
    }
  }

  function togglePlayPause() {
    const dots = getAnimatedAudioDots()
    if (!dots.length) return

    const player = ensureAudioPlayer()

    if (!player.src) {
      playAudioDotByIndex(currentAudioIndexRef.current >= 0 ? currentAudioIndexRef.current : 0, true, false)
      return
    }

    if (player.paused || player.ended) {
      player.play().then(function() {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(function() {})
        }
        updateAudioControlsUI()
        refreshAudioVisuals()
      }).catch(function(err) {
        console.error('Audio playback resume failed:', err)
        updateAudioControlsUI()
        refreshAudioVisuals()
      })
    } else {
      player.pause()
      updateAudioControlsUI()
      refreshAudioVisuals()
    }
  }

  function getFilteredRespondents(altitude) {
    let filtered = (respondentsRef.current || []).slice()

    if (activeEmotionRef.current) {
      filtered = filtered.filter(function(r) {
        return r.emotion === activeEmotionRef.current
      })
    }

    if (activeStateRef.current) {
      filtered = filtered.filter(function(r) {
        return !r.isUnknown && (r.city || '').toLowerCase().includes(activeStateRef.current.toLowerCase())
      })
    }

    if (selectedQuestionIdRef.current) {
      filtered = filtered.filter(function(r) {
        return r.answers.some(function(a) { return a.questionId === selectedQuestionIdRef.current })
      })
    }

    if (selectedSessionIdRef.current) {
      filtered = filtered.filter(function(r) {
        return r.sessionId !== selectedSessionIdRef.current
      })
    }

    return clusterPoints(filtered, altitude)
  }

  function renderCurrentPoints() {
    if (!globeRef.current) return

    const safeAudioDots = getAnimatedAudioDots()
    if (safeAudioDots.length > 0) {
      globeRef.current.pointsData(safeAudioDots)
      globeRef.current
        .htmlElement(function(d) { return buildHtmlElement(d) })
        .htmlElementsData(UNKNOWN_LABEL_DATA)
      updateAudioControlsUI()
      return
    }

    const altitude = getCurrentAltitude()
    globeRef.current.pointsData(getFilteredRespondents(altitude))
    updateAudioControlsUI()
  }

  useEffect(() => {
    if (!globeRef.current) return
    if (darkMode) {
      globeRef.current
        .backgroundColor('#0d2018')
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
        .atmosphereColor('#74c69d')
        .atmosphereAltitude(0.15)
    } else {
      globeRef.current
        .backgroundColor('#f5f0e8')
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-day.jpg')
        .atmosphereColor('#74c69d')
        .atmosphereAltitude(0.18)
    }
  }, [darkMode])

  useEffect(() => {
    heatmapRef.current = heatmap
    if (!globeRef.current) return

    if (heatmap) {
      const dominantEmotion = heatmap.dominantEmotion || {}
      const counts = heatmap.counts || {}
      const max = heatmap.max || 1

      globeRef.current
        .polygonCapColor(function(feat) {
          const key = (feat.properties.name || '').toLowerCase()
          const info = dominantEmotion[key]
          if (!info) return 'rgba(160,174,192,0.06)'
          const t = Math.min((info.total / max), 1)
          const alpha = 0.35 + t * 0.55
          const hex = info.color.replace('#', '')
          const r = parseInt(hex.slice(0, 2), 16)
          const g = parseInt(hex.slice(2, 4), 16)
          const b = parseInt(hex.slice(4, 6), 16)
          return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
        })
        .polygonStrokeColor(function(feat) {
          const key = (feat.properties.name || '').toLowerCase()
          const info = dominantEmotion[key]
          if (!info) return 'rgba(255,255,255,0.1)'
          return info.color + 'cc'
        })
        .polygonAltitude(function(feat) {
          const key = (feat.properties.name || '').toLowerCase()
          const count = counts[key] || 0
          return 0.005 + (count / max) * 0.08
        })
        .polygonLabel(function(feat) {
          const d = feat.properties
          const key = (d.name || '').toLowerCase()
          const info = dominantEmotion[key]
          if (!info) return ''
          return (
            '<div style="background:rgba(13,32,24,0.95);border:1.5px solid ' + info.color + '66;border-radius:10px;padding:8px 14px;font-family:DM Sans,sans-serif;font-size:12px;color:#f8f4f0;pointer-events:none;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.4);">' +
              '<div style="font-weight:700;color:white;margin-bottom:4px;">' + d.name + '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">' +
                '<div style="width:8px;height:8px;border-radius:50%;background:' + info.color + ';box-shadow:0 0 6px ' + info.color + ';"></div>' +
                '<span style="color:' + info.color + ';font-weight:700;">' + info.label + '</span>' +
                '<span style="color:rgba(248,244,240,0.55);">(' + info.pct + '%)</span>' +
              '</div>' +
              '<div style="color:rgba(248,244,240,0.5);font-size:10px;">' + info.total + ' voice' + (info.total !== 1 ? 's' : '') + ' total</div>' +
            '</div>'
          )
        })
    } else {
      globeRef.current
        .polygonCapColor(function() { return 'rgba(64,145,108,0.05)' })
        .polygonAltitude(0.001)
        .polygonLabel(function(feat) {
          const pov = globeRef.current.pointOfView()
          const stateName = feat.properties.name || ''
          const coords = feat.geometry.coordinates
          var lats = [], lngs = []

          function extractCoords(arr, depth) {
            if (depth === 0) {
              lngs.push(arr[0])
              lats.push(arr[1])
            } else {
              arr.forEach(function(c) { extractCoords(c, depth - 1) })
            }
          }

          var depth = feat.geometry.type === 'Polygon' ? 1 : 2
          extractCoords(coords, depth)

          var avgLat = lats.reduce(function(a, b) { return a + b }, 0) / lats.length
          var avgLng = lngs.reduce(function(a, b) { return a + b }, 0) / lngs.length
          var dLat = Math.abs(avgLat - pov.lat)
          var dLng = Math.abs(avgLng - pov.lng)

          if (Math.sqrt(dLat * dLat + dLng * dLng) > 50) return ''
          return '<div style="background:rgba(13,32,24,0.92);border:1px solid rgba(116,198,157,0.3);border-radius:7px;padding:4px 12px;font-family:DM Sans,sans-serif;font-size:12px;color:#74c69d;pointer-events:none;">' + stateName + '</div>'
        })
    }
  }, [heatmap])

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = [
      '@keyframes avatarStand { from { transform:scaleY(0.2) scaleX(0.6);opacity:0; } to { transform:scaleY(1) scaleX(1);opacity:1; } }',
      '@keyframes speakerGlow { 0% { box-shadow:0 0 0 rgba(245,158,11,0.0),0 0 0 rgba(253,230,138,0.0); } 50% { box-shadow:0 0 22px rgba(245,158,11,0.28),0 0 44px rgba(253,230,138,0.18); } 100% { box-shadow:0 0 0 rgba(245,158,11,0.0),0 0 0 rgba(253,230,138,0.0); } }',
      '@keyframes speakerBadgePulse { 0% { transform:scale(1); opacity:0.72; } 50% { transform:scale(1.06); opacity:1; } 100% { transform:scale(1); opacity:0.72; } }'
    ].join('\n')
    document.head.appendChild(style)

    const globe = GlobeGL()(containerRef.current)

    globe
      .width(window.innerWidth)
      .height(window.innerHeight)
      .backgroundColor('#f5f0e8')
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-day.jpg')
      .atmosphereColor('#74c69d')
      .atmosphereAltitude(0.18)
      .pointsData([])
      .pointLat(function(d) { return d.lat })
      .pointLng(function(d) { return d.lng })
      .pointRadius(function(d) {
        if (d._cluster) return 0.25 + Math.min(Math.sqrt(d._count) * 0.12, 0.8)
        if (d.isAudioDot && d._isSpeaking) return 0.68 * (d._audioPulse || 1)
        return d.isAudioDot ? 0.42 : 0.35
      })
      .pointResolution(8)
      .pointAltitude(function(d) {
        if (d.isAudioDot && d._isSpeaking) return 0.014
        return 0.001
      })
      .pointColor(function(d) {
        if (d.isAudioDot && d._isSpeaking) return '#fde68a'
        return d.emotionColor || '#74c69d'
      })
      .pointLabel(function(d) {
        const c = d._isSpeaking ? '#fde68a' : (d.emotionColor || '#fff')

        if (d._cluster) {
          return (
            '<div style="background:rgba(13,32,24,0.95);border:1.5px solid ' + c + ';border-radius:10px;padding:8px 13px;font-family:DM Sans,sans-serif;font-size:12px;color:#f8f4f0;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.3);">' +
            '<b style="color:' + c + ';">' + d._count + ' voices</b><br/>' +
            '<span style="color:rgba(248,244,240,0.6);font-size:10px;">Scroll to zoom in</span>' +
            '</div>'
          )
        }

        if (d.isAudioDot) {
          return (
            '<div style="background:rgba(64,32,0,0.95);border:1.5px solid ' + c + ';border-radius:10px;padding:8px 13px;font-family:DM Sans,sans-serif;font-size:12px;color:#fff8e0;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.3);">' +
            '<b>' + (d._isSpeaking ? '▶ Speaking: ' : '♫ ') + (d.speakerLabel || 'Speaker') + '</b><br/>' +
            '<span style="font-size:10px;color:rgba(255,248,224,0.72)">' + (d.city || 'Unknown') + (d.speakerState ? ', ' + d.speakerState : '') + '</span>' +
            '</div>'
          )
        }

        const vName = d.voiceNumber ? 'Voice #' + String(d.voiceNumber).padStart(3, '0') : (d.id || '')
        const loc = d.isUnknown ? 'Unknown Location' : (d.city || '')
        const em = d.emotion || ''

        return (
          '<div style="background:rgba(13,32,24,0.95);border:1.5px solid ' + c + ';border-radius:10px;padding:8px 13px;font-family:DM Sans,sans-serif;font-size:12px;color:#f8f4f0;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.3);">' +
          '<b>' + vName + '</b><br/>' +
          '<span style="color:rgba(248,244,240,0.6);font-size:10px;">📍 ' + loc + '</span><br/>' +
          '<span style="background:' + c + ';border-radius:8px;padding:2px 8px;font-size:9px;font-weight:700;">' + em + '</span>' +
          '</div>'
        )
      })
      .onPointClick(function(point, event) {
        if (point._cluster) {
          const pov = globe.pointOfView()
          globe.pointOfView(
            { lat: point.lat, lng: point.lng, altitude: Math.max(pov.altitude * 0.5, 0.5) },
            600
          )
          return
        }

        if (point.isAudioDot) {
          const dots = getAnimatedAudioDots()
          const idx = dots.findIndex(function(d) {
            return d.sessionId === point.sessionId && d.lat === point.lat && d.lng === point.lng
          })

          const mouseX = event && typeof event.clientX === 'number' ? event.clientX : lastMousePosRef.current.x
          const mouseY = event && typeof event.clientY === 'number' ? event.clientY : lastMousePosRef.current.y

          showAudioControlsAt(mouseX, mouseY)
          playAudioDotByIndex(idx >= 0 ? idx : 0, true, false)
          return
        }

        onDotClickRef.current(point)
      })
      .htmlElementsData(UNKNOWN_LABEL_DATA)
      .htmlLat(function(d) { return d.lat })
      .htmlLng(function(d) { return d.lng })
      .htmlAltitude(0.015)
      .htmlElement(function(d) { return buildHtmlElement(d) })

    const controlBar = document.createElement('div')
    controlBar.style.cssText = [
      'position:absolute',
      'left:0',
      'top:0',
      'display:none',
      'flex-direction:column',
      'gap:10px',
      'width:320px',
      'padding:12px',
      'border-radius:18px',
      'background:rgba(13,32,24,0.52)',
      'border:1px solid rgba(245,158,11,0.18)',
      'box-shadow:0 14px 36px rgba(0,0,0,0.28)',
      'z-index:30',
      'backdrop-filter:blur(10px)',
      'pointer-events:auto',
      'font-family:DM Sans,sans-serif',
      'opacity:0.18',
      'transition:opacity 180ms ease, transform 180ms ease, background 180ms ease',
      'transform:translate3d(0,0,0)',
      'overflow:hidden',
    ].join(';')

    controlBar.addEventListener('mouseenter', function() {
      audioControlLockedRef.current = true
      fadeAudioControlsFull()
    })

    controlBar.addEventListener('mouseleave', function() {
      audioControlLockedRef.current = false
      fadeAudioControlsDim()
    })

    const header = document.createElement('div')
    header.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:12px',
      'width:100%',
      'padding:2px 0 0',
    ].join(';')

    const avatarWrap = document.createElement('div')
    avatarWrap.style.cssText = [
      'position:relative',
      'width:52px',
      'height:52px',
      'border-radius:999px',
      'border:2px solid rgba(245,158,11,0.72)',
      'overflow:hidden',
      'flex-shrink:0',
      'background:#0b1210',
      'animation:speakerGlow 2.2s ease-in-out infinite',
    ].join(';')

    const avatarImg = document.createElement('img')
    avatarImg.alt = 'Speaker Bitmoji'
    avatarImg.width = 52
    avatarImg.height = 52
    avatarImg.style.cssText = [
      'display:block',
      'width:100%',
      'height:100%',
      'object-fit:cover',
      'border-radius:999px',
    ].join(';')
    avatarWrap.appendChild(avatarImg)

    const meta = document.createElement('div')
    meta.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'min-width:0',
      'gap:4px',
      'flex:1',
    ].join(';')

    const speakerBadge = document.createElement('div')
    speakerBadge.textContent = 'Speaker'
    speakerBadge.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'align-self:flex-start',
      'padding:3px 8px',
      'border-radius:999px',
      'background:rgba(245,158,11,0.14)',
      'border:1px solid rgba(245,158,11,0.20)',
      'color:#fde68a',
      'font-size:10px',
      'font-weight:700',
      'letter-spacing:0.12em',
      'text-transform:uppercase',
      'animation:speakerBadgePulse 1.8s ease-in-out infinite',
    ].join(';')

    const speakerName = document.createElement('div')
    speakerName.textContent = 'Speaker'
    speakerName.style.cssText = [
      'color:#fff8e0',
      'font-size:15px',
      'font-weight:700',
      'line-height:1.2',
      'white-space:nowrap',
      'overflow:hidden',
      'text-overflow:ellipsis',
    ].join(';')

    const speakerState = document.createElement('div')
    speakerState.textContent = ''
    speakerState.style.cssText = [
      'color:rgba(255,248,224,0.70)',
      'font-size:11px',
      'line-height:1.3',
      'white-space:nowrap',
      'overflow:hidden',
      'text-overflow:ellipsis',
    ].join(';')

    meta.appendChild(speakerBadge)
    meta.appendChild(speakerName)
    meta.appendChild(speakerState)

    header.appendChild(avatarWrap)
    header.appendChild(meta)

    const waveWrap = document.createElement('div')
    waveWrap.style.cssText = [
      'position:relative',
      'width:100%',
      'height:56px',
      'border-radius:14px',
      'background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',
      'border:1px solid rgba(255,255,255,0.06)',
      'overflow:hidden',
    ].join(';')

    const waveCanvas = document.createElement('canvas')
    waveCanvas.width = 292
    waveCanvas.height = 56
    waveCanvas.style.cssText = [
      'display:block',
      'width:100%',
      'height:56px',
    ].join(';')
    waveWrap.appendChild(waveCanvas)

    const controlsRow = document.createElement('div')
    controlsRow.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:8px',
      'flex-wrap:wrap',
    ].join(';')

    const makeBtn = function(label, primary) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = label
      btn.style.cssText = [
        'pointer-events:auto',
        'appearance:none',
        primary ? 'border:none' : 'border:1px solid rgba(245,158,11,0.24)',
        'border-radius:999px',
        'padding:7px 12px',
        primary ? 'background:#f59e0b' : 'background:rgba(255,255,255,0.05)',
        primary ? 'color:#0d2018' : 'color:#fff8e0',
        'font-size:11px',
        'font-weight:700',
        'cursor:pointer',
      ].join(';')
      return btn
    }

    const backBtn = makeBtn('Back', false)
    backBtn.addEventListener('click', function() {
      playPrevAudio(true)
      fadeAudioControlsFull()
    })

    const playPauseBtn = makeBtn('Play', true)
    playPauseBtn.addEventListener('click', function() {
      togglePlayPause()
      fadeAudioControlsFull()
    })

    const nextBtn = makeBtn('Next', false)
    nextBtn.addEventListener('click', function() {
      playNextAudio(true, false)
      fadeAudioControlsFull()
    })

    const autoBtn = makeBtn('Auto On', false)
    autoBtn.setAttribute('aria-pressed', 'true')
    autoBtn.style.minWidth = '74px'
    autoBtn.addEventListener('click', function() {
      toggleAutoPlay()
      fadeAudioControlsFull()
    })

    controlsRow.appendChild(backBtn)
    controlsRow.appendChild(playPauseBtn)
    controlsRow.appendChild(nextBtn)
    controlsRow.appendChild(autoBtn)

    controlBar.appendChild(header)
    controlBar.appendChild(waveWrap)
    controlBar.appendChild(controlsRow)
    containerRef.current.appendChild(controlBar)

    audioControlBarRef.current = controlBar
    audioPlayPauseBtnRef.current = playPauseBtn
    audioAutoBtnRef.current = autoBtn
    audioSpeakerNameRef.current = speakerName
    audioSpeakerStateRef.current = speakerState
    audioSpeakerAvatarRef.current = avatarImg
    audioWaveCanvasRef.current = waveCanvas

    drawIdleWave()
    startWaveformLoop()

    containerRef.current.addEventListener('mousemove', function(e) {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }

      if (!audioControlBarRef.current || !audioControlVisibleRef.current) return
      if (audioControlLockedRef.current) return

      const rect = audioControlBarRef.current.getBoundingClientRect()
      const dx = e.clientX - (rect.left + rect.width / 2)
      const dy = e.clientY - (rect.top + rect.height / 2)
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 95) {
        fadeAudioControlsFull()
      } else {
        fadeAudioControlsDim()
      }
    })

    fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
      .then(function(r) { return r.json() })
      .then(function(states) {
        globe
          .polygonsData(states.features)
          .polygonCapColor(function() { return 'rgba(64,145,108,0.05)' })
          .polygonSideColor(function() { return 'rgba(0,0,0,0)' })
          .polygonStrokeColor(function() { return 'rgba(116,198,157,0.2)' })
          .polygonAltitude(0.001)
          .polygonLabel(function() { return '' })

        const STATE_CENTERS = [
          {name:'AL',lat:32.8,lng:-86.8},{name:'AK',lat:61.4,lng:-152.4},
          {name:'AZ',lat:33.7,lng:-111.4},{name:'AR',lat:35.0,lng:-92.4},
          {name:'CA',lat:36.1,lng:-119.7},{name:'CO',lat:39.1,lng:-105.3},
          {name:'CT',lat:41.6,lng:-72.8},{name:'DE',lat:39.3,lng:-75.5},
          {name:'FL',lat:27.8,lng:-81.7},{name:'GA',lat:33.0,lng:-83.6},
          {name:'HI',lat:21.1,lng:-157.5},{name:'ID',lat:44.2,lng:-114.5},
          {name:'IL',lat:40.3,lng:-89.0},{name:'IN',lat:39.8,lng:-86.3},
          {name:'IA',lat:42.0,lng:-93.2},{name:'KS',lat:38.5,lng:-96.7},
          {name:'KY',lat:37.7,lng:-84.7},{name:'LA',lat:31.2,lng:-91.9},
          {name:'ME',lat:44.7,lng:-69.4},{name:'MD',lat:39.1,lng:-76.8},
          {name:'MA',lat:42.2,lng:-71.5},{name:'MI',lat:43.3,lng:-84.5},
          {name:'MN',lat:45.7,lng:-93.9},{name:'MS',lat:32.7,lng:-89.7},
          {name:'MO',lat:38.5,lng:-92.3},{name:'MT',lat:46.9,lng:-110.5},
          {name:'NE',lat:41.1,lng:-98.3},{name:'NV',lat:38.3,lng:-117.1},
          {name:'NH',lat:43.5,lng:-71.6},{name:'NJ',lat:40.3,lng:-74.5},
          {name:'NM',lat:34.8,lng:-106.2},{name:'NY',lat:42.2,lng:-74.9},
          {name:'NC',lat:35.6,lng:-79.8},{name:'ND',lat:47.5,lng:-99.8},
          {name:'OH',lat:40.4,lng:-82.8},{name:'OK',lat:35.6,lng:-96.9},
          {name:'OR',lat:44.6,lng:-122.1},{name:'PA',lat:40.6,lng:-77.2},
          {name:'RI',lat:41.7,lng:-71.5},{name:'SC',lat:33.9,lng:-80.9},
          {name:'SD',lat:44.3,lng:-99.4},{name:'TN',lat:35.7,lng:-86.7},
          {name:'TX',lat:31.1,lng:-97.6},{name:'UT',lat:40.2,lng:-111.9},
          {name:'VT',lat:44.0,lng:-72.7},{name:'VA',lat:37.8,lng:-78.2},
          {name:'WA',lat:47.4,lng:-121.5},{name:'WV',lat:38.5,lng:-81.0},
          {name:'WI',lat:44.3,lng:-89.6},{name:'WY',lat:42.8,lng:-107.3},
          {name:'DC',lat:38.9,lng:-77.0},
        ]

        globe
          .labelsData(STATE_CENTERS)
          .labelLat(function(d) { return d.lat })
          .labelLng(function(d) { return d.lng })
          .labelAltitude(0.002)
          .labelText(function(d) { return d.name })
          .labelSize(0.6)
          .labelDotRadius(0)
          .labelColor(function() { return 'rgba(187,247,208,0.65)' })
          .labelResolution(2)
      })

    globe.pointOfView({ lat: 39.5, lng: -98.35, altitude: 1.8 }, 1200)
    globeRef.current = globe
    renderCurrentPoints()

    let lastAlt = 1.8
    function recheckCluster() {
      const pov = globe.pointOfView()
      if (!pov) {
        requestAnimationFrame(recheckCluster)
        return
      }

      const altDiff = Math.abs(pov.altitude - lastAlt)
      if (altDiff > 0.15) {
        lastAlt = pov.altitude
        if (!selectedSessionIdRef.current || getSafeAudioDots().length > 0) {
          renderCurrentPoints()
        }
      }

      requestAnimationFrame(recheckCluster)
    }
    recheckCluster()

    function handleResize() {
      if (globeRef.current) {
        globeRef.current.width(window.innerWidth).height(window.innerHeight)
      }
    }
    window.addEventListener('resize', handleResize)

    function handler(e) {
      if (!globeRef.current) return

      const dot = e.detail
      if (dot) {
        if (dot.isAudioDot) return

        const qId = selectedQuestionIdRef.current
        const override = qId ? (dot.answers || []).reduce(function(found, a) {
          return a.questionId === qId ? a.transcript : found
        }, null) : null

        const enriched = Object.assign({}, dot, { _override: override })
        const isNew = dot.sessionId !== selectedSessionIdRef.current

        if (isNew) {
          selectedSessionIdRef.current = dot.sessionId
          const pts = getFilteredRespondents(getCurrentAltitude())
          globeRef.current.pointsData(pts.filter(function(r) { return r.sessionId !== dot.sessionId }))
          const pov = globeRef.current.pointOfView()
          globeRef.current.pointOfView(
            { lat: dot.lat, lng: dot.lng, altitude: Math.min(Math.max(pov.altitude, 1.1), 1.6) },
            700
          )
        }

        globeRef.current
          .htmlElement(function(d) { return buildHtmlElement(d) })
          .htmlElementsData(UNKNOWN_LABEL_DATA.concat([enriched]))
      } else {
        selectedSessionIdRef.current = null
        renderCurrentPoints()
        globeRef.current
          .htmlElement(function(d) { return buildHtmlElement(d) })
          .htmlElementsData(UNKNOWN_LABEL_DATA)
      }
    }
    window.addEventListener('aave-dot-selected', handler)

    return function() {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('aave-dot-selected', handler)

      stopWaveformLoop()

      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.disconnect() } catch (e) {}
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect() } catch (e) {}
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close() } catch (e) {}
      }

      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        audioPlayerRef.current.src = ''
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }

      if (style.parentNode) {
        style.parentNode.removeChild(style)
      }
    }
  }, [])

  useEffect(() => {
    renderCurrentPoints()

    if (!globeRef.current) return
    if (getSafeAudioDots().length > 0) return

    if (activeState) {
      let filtered = (respondents || []).slice()

      if (activeEmotion) {
        filtered = filtered.filter(function(r) { return r.emotion === activeEmotion })
      }

      filtered = filtered.filter(function(r) {
        return !r.isUnknown && (r.city || '').toLowerCase().includes(activeState.toLowerCase())
      })

      if (selectedQuestionId) {
        filtered = filtered.filter(function(r) {
          return r.answers.some(function(a) { return a.questionId === selectedQuestionId })
        })
      }

      const stateRespondents = filtered.filter(function(r) { return !r.isUnknown })
      if (stateRespondents.length > 0) {
        const avgLat = stateRespondents.reduce(function(s, r) { return s + r.lat }, 0) / stateRespondents.length
        const avgLng = stateRespondents.reduce(function(s, r) { return s + r.lng }, 0) / stateRespondents.length
        globeRef.current.pointOfView({ lat: avgLat, lng: avgLng, altitude: 0.8 }, 800)
      }
    }
  }, [respondents, activeEmotion, activeState, selectedQuestionId, audioDots])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
    />
  )
}