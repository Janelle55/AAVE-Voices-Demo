import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'

const SHEET_NAMES = ['p1 cleaned', 'p2 cleaned', 'p3 cleaned']

const STATE_COORDS = {
  'alabama': { lat: 32.806671, lng: -86.791130 },
  'alaska': { lat: 61.370716, lng: -152.404419 },
  'arizona': { lat: 33.729759, lng: -111.431221 },
  'arkansas': { lat: 34.969704, lng: -92.373123 },
  'california': { lat: 36.116203, lng: -119.681564 },
  'colorado': { lat: 39.059811, lng: -105.311104 },
  'connecticut': { lat: 41.597782, lng: -72.755371 },
  'delaware': { lat: 39.318523, lng: -75.507141 },
  'florida': { lat: 27.766279, lng: -81.686783 },
  'georgia': { lat: 33.040619, lng: -83.643074 },
  'hawaii': { lat: 21.094318, lng: -157.498337 },
  'idaho': { lat: 44.240459, lng: -114.478828 },
  'illinois': { lat: 40.349457, lng: -88.986137 },
  'indiana': { lat: 39.849426, lng: -86.258278 },
  'iowa': { lat: 42.011539, lng: -93.210526 },
  'kansas': { lat: 38.526600, lng: -96.726486 },
  'kentucky': { lat: 37.668140, lng: -84.670067 },
  'louisiana': { lat: 31.169960, lng: -91.867805 },
  'maine': { lat: 44.693947, lng: -69.381927 },
  'maryland': { lat: 39.063946, lng: -76.802101 },
  'massachusetts': { lat: 42.230171, lng: -71.530106 },
  'michigan': { lat: 43.326618, lng: -84.536095 },
  'minnesota': { lat: 45.694454, lng: -93.900192 },
  'mississippi': { lat: 32.741646, lng: -89.678696 },
  'missouri': { lat: 38.456085, lng: -92.288368 },
  'montana': { lat: 46.921925, lng: -110.454353 },
  'nebraska': { lat: 41.125370, lng: -98.268082 },
  'nevada': { lat: 38.313515, lng: -117.055374 },
  'new hampshire': { lat: 43.452492, lng: -71.563896 },
  'new jersey': { lat: 40.298904, lng: -74.521011 },
  'new mexico': { lat: 34.840515, lng: -106.248482 },
  'new york': { lat: 42.165726, lng: -74.948051 },
  'north carolina': { lat: 35.630066, lng: -79.806419 },
  'north dakota': { lat: 47.528912, lng: -99.784012 },
  'ohio': { lat: 40.388783, lng: -82.764915 },
  'oklahoma': { lat: 35.565342, lng: -96.928917 },
  'oregon': { lat: 44.572021, lng: -122.070938 },
  'pennsylvania': { lat: 40.590752, lng: -77.209755 },
  'rhode island': { lat: 41.680893, lng: -71.511780 },
  'south carolina': { lat: 33.856892, lng: -80.945007 },
  'south dakota': { lat: 44.299782, lng: -99.438828 },
  'tennessee': { lat: 35.747845, lng: -86.692345 },
  'texas': { lat: 31.054487, lng: -97.563461 },
  'utah': { lat: 40.150032, lng: -111.862434 },
  'vermont': { lat: 44.045876, lng: -72.710686 },
  'virginia': { lat: 37.769337, lng: -78.169968 },
  'washington': { lat: 47.400902, lng: -121.490494 },
  'west virginia': { lat: 38.491226, lng: -80.954453 },
  'wisconsin': { lat: 44.268543, lng: -89.616508 },
  'wyoming': { lat: 42.755966, lng: -107.302490 },
  'district of columbia': { lat: 38.897438, lng: -77.026817 },
  'washington dc': { lat: 38.897438, lng: -77.026817 },
  'washington, dc': { lat: 38.897438, lng: -77.026817 },
  'dc': { lat: 38.897438, lng: -77.026817 },
}

// Atlantic Ocean zones near the US for unknown respondents
const OCEAN_ZONES = [
  { lat: 36.0, lng: -57.0, sea: 'Atlantic Ocean' },
  { lat: 38.0, lng: -55.0, sea: 'Atlantic Ocean' },
  { lat: 34.0, lng: -59.0, sea: 'Atlantic Ocean' },
  { lat: 40.0, lng: -57.0, sea: 'Atlantic Ocean' },
  { lat: 32.0, lng: -57.0, sea: 'Atlantic Ocean' },
  { lat: 37.0, lng: -53.0, sea: 'Atlantic Ocean' },
  { lat: 35.0, lng: -55.0, sea: 'Atlantic Ocean' },
  { lat: 39.0, lng: -61.0, sea: 'Atlantic Ocean' },
  { lat: 33.0, lng: -53.0, sea: 'Atlantic Ocean' },
  { lat: 41.0, lng: -55.0, sea: 'Atlantic Ocean' },
  { lat: 31.0, lng: -59.0, sea: 'Atlantic Ocean' },
  { lat: 37.0, lng: -51.0, sea: 'Atlantic Ocean' },
]

const UNKNOWN_ZONE = { lat: 15.0, lng: -30.0 } // fallback for label only

const EMOTION_MAP = {
  'proud':            { color: '#F5C518', label: 'Proud' },
  'enthusiastic':     { color: '#00C48C', label: 'Enthusiastic' },
  'emphasis/excited': { color: '#7B61FF', label: 'Emphasis / Excited' },
  'neutral':          { color: '#A0AEC0', label: 'Neutral' },
  'deprecation':      { color: '#FF851B', label: 'Deprecation' },
  'upset/anger':      { color: '#E53E3E', label: 'Upset / Anger' },
}

const SENTIMENT_FALLBACK = {
  '1':    { color: '#F5C518', label: 'Proud' },
  '0.5':  { color: '#00C48C', label: 'Enthusiastic' },
  '0':    { color: '#A0AEC0', label: 'Neutral' },
  '-0.5': { color: '#E53E3E', label: 'Upset / Anger' },
}

const SKIN_TONES = ['#8D5524', '#C68642', '#6B3A2A', '#4A2912', '#A0522D']

function hashStr(str) {
  let hash = 0
  for (let i = 0; i < (str?.length || 0); i++) hash += str.charCodeAt(i)
  return hash
}

function getSkinTone(id) {
  return SKIN_TONES[hashStr(id) % SKIN_TONES.length]
}

function getGender(id) {
  return hashStr(id) % 2 === 0 ? 'female' : 'male'
}

function getEmotionInfo(emotionLabel, sentimentScore) {
  const key = (emotionLabel || '').toLowerCase().trim()
  if (EMOTION_MAP[key]) return EMOTION_MAP[key]
  const sKey = String(sentimentScore ?? '').trim()
  return SENTIMENT_FALLBACK[sKey] || { color: '#A0AEC0', label: 'Neutral' }
}

// Full state name → coords (already defined above in STATE_COORDS)
// State abbreviations → full state key for lookup
const STATE_ABBR = {
  'al':'alabama','ak':'alaska','az':'arizona','ar':'arkansas','ca':'california',
  'co':'colorado','ct':'connecticut','de':'delaware','fl':'florida','ga':'georgia',
  'hi':'hawaii','id':'idaho','il':'illinois','in':'indiana','ia':'iowa',
  'ks':'kansas','ky':'kentucky','la':'louisiana','me':'maine','md':'maryland',
  'ma':'massachusetts','mi':'michigan','mn':'minnesota','ms':'mississippi',
  'mo':'missouri','mt':'montana','ne':'nebraska','nv':'nevada','nh':'new hampshire',
  'nj':'new jersey','nm':'new mexico','ny':'new york','nc':'north carolina',
  'nd':'north dakota','oh':'ohio','ok':'oklahoma','or':'oregon','pa':'pennsylvania',
  'ri':'rhode island','sc':'south carolina','sd':'south dakota','tn':'tennessee',
  'tx':'texas','ut':'utah','vt':'vermont','va':'virginia','wa':'washington',
  'wv':'west virginia','wi':'wisconsin','wy':'wyoming','dc':'district of columbia',
}

function resolveState(part) {
  const key = part.toLowerCase().trim()
  // Try full name first
  if (STATE_COORDS[key]) return { stateName: part, coords: STATE_COORDS[key] }
  // Try abbreviation
  const fullKey = STATE_ABBR[key]
  if (fullKey && STATE_COORDS[fullKey]) {
    return { stateName: fullKey.replace(/\b\w/g, c => c.toUpperCase()), coords: STATE_COORDS[fullKey] }
  }
  return null
}

function parseLocation(location, unknownIndex = 0) {
  const oceanZone = OCEAN_ZONES[unknownIndex % OCEAN_ZONES.length]
  if (!location || location.trim() === '' || location.trim().toUpperCase() === 'UNKNOWN') {
    return { stateName: 'Unknown', coords: oceanZone, isUnknown: true }
  }
  const raw = location.trim()
  if (raw.toLowerCase().split(',').every(p => p.trim() === 'unknown' || p.trim() === '')) {
    return { stateName: 'Unknown', coords: oceanZone, isUnknown: true }
  }
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length === 0) {
    return { stateName: 'Unknown', coords: oceanZone, isUnknown: true }
  }

  const lastLower = parts[parts.length - 1].toLowerCase()
  const hasCountry = lastLower.includes('united states') || lastLower === 'us' || lastLower === 'usa'
  const stateParts = hasCountry ? parts.slice(0, -1) : parts

  for (let i = stateParts.length - 1; i >= 0; i--) {
    const resolved = resolveState(stateParts[i])
    if (resolved) {
      return { stateName: resolved.stateName, coords: resolved.coords, isUnknown: false }
    }
  }

  if (!hasCountry) {
    const resolved = resolveState(raw)
    if (resolved) return { stateName: resolved.stateName, coords: resolved.coords, isUnknown: false }
  }

  return { stateName: 'Unknown', coords: oceanZone, isUnknown: true }
}

function getSpread(stateKey, counters, isUnknown) {
  if (!counters[stateKey]) counters[stateKey] = 0
  const n = counters[stateKey]++
  if (n === 0) return { lat: 0, lng: 0 }
  const angle = n * 2.399963
  // Unknown: tight concentric rings of 6 dots, 0.06° apart — stays within ~0.5° of anchor
  // Known states: normal phyllotaxis spread
  const radius = isUnknown
    ? 0.06 * (1 + Math.floor(n / 6))
    : 0.28 * Math.sqrt(n)
  return {
    lat: radius * Math.cos(angle),
    lng: radius * Math.sin(angle),
  }
}

function cleanTranscript(text) {
  return (text || '')
    .replace(/\{BR\}/gi, ' ')
    .replace(/\{[^}]+\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getDisplayId(row, sessionId) {
  const id1 = String(row['ID-1'] || '').trim()
  if (id1 && id1 !== 'UNKNOWN') return id1
  const pid = String(row['ParticipantID'] || '').trim()
  if (pid && pid !== 'UNKNOWN') return pid
  return sessionId.slice(0, 8)
}

export function useRespondents(filePath) {
  const [respondents, setRespondents] = useState([])
  const [emotions, setEmotions] = useState({})
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!filePath) return

    fetch(filePath)
      .then(res => {
        if (!res.ok) throw new Error(`Could not load file: ${res.statusText}`)
        return res.arrayBuffer()
      })
      .then(buffer => {
        const workbook = XLSX.read(buffer, { type: 'array' })

        let allRows = []
        for (const sheetName of SHEET_NAMES) {
          const sheet = workbook.Sheets[sheetName]
          if (!sheet) {
            console.warn(`Sheet "${sheetName}" not found — skipping.`)
            continue
          }
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
          console.log(`"${sheetName}": ${rows.length} rows`)
          allRows = allRows.concat(rows)
        }

        const validRows = allRows.filter(row =>
          String(row['SessionID'] || '').trim().length > 0
        )

        const grouped = {}
        for (const row of validRows) {
          const sid = String(row['SessionID']).trim()
          if (!grouped[sid]) grouped[sid] = []
          grouped[sid].push(row)
        }

        const built = []
        const emotionSet = {}
        const questionMap = {}
        const stateCounters = {}
        let voiceNumber = 0
        let unknownCounter = 0

        for (const [sessionId, rows] of Object.entries(grouped)) {
          const firstRow = rows[0]
          const location = String(firstRow['Location'] || '').trim()
          const { stateName, coords, isUnknown } = parseLocation(location, unknownCounter)
          if (isUnknown) unknownCounter++
          if (isUnknown && location && location.trim() !== '' && location.trim().toUpperCase() !== 'UNKNOWN') {
            console.warn(`[Location fallback → Unknown] "${location}"`)
          }
          const spreadKey = isUnknown ? '__unknown__' : stateName.toLowerCase()
          const spread = getSpread(spreadKey, stateCounters, isUnknown)
          const displayId = getDisplayId(firstRow, sessionId)

          const emotionRow = rows.find(r =>
            String(r['EMOTION LABEL'] || '').trim().length > 0
          ) || firstRow
          const emotionInfo = getEmotionInfo(
            emotionRow['EMOTION LABEL'],
            emotionRow['SENTIMENT SCORE']
          )
          emotionSet[emotionInfo.label] = emotionInfo.color

          const answers = rows
            .map(row => {
              const question = String(row['QuestionText'] || '').trim()
              const transcript = cleanTranscript(
                String(row['AAE Transcript'] || row['AAVE phonetic transcript'] || '').trim()
              )
              const questionId = String(row['QuestionID'] || '').trim()
              const emotion = getEmotionInfo(row['EMOTION LABEL'], row['SENTIMENT SCORE'])
              const sentiment = String(row['SENTIMENT SCORE'] || '').trim()

              if (question && questionId && !questionMap[questionId]) {
                questionMap[questionId] = question
              }

              return { questionId, question, transcript, emotion, sentiment }
            })
            .filter(a => a.question && a.transcript)

          if (answers.length === 0) continue

          voiceNumber++

          built.push({
            id: displayId,
            sessionId,
            voiceNumber,
            baseLat: coords.lat,
            baseLng: coords.lng,
            spreadLat: spread.lat,
            spreadLng: spread.lng,
            lat: coords.lat + spread.lat,
            lng: coords.lng + spread.lng,
            city: isUnknown ? 'Unknown Location' : stateName,
            state: isUnknown ? 'Unknown' : 'United States',
            isUnknown,
            emotion: emotionInfo.label,
            emotionColor: emotionInfo.color,
            gender: getGender(sessionId),
            skinTone: getSkinTone(sessionId),
            answers,
          })
        }

        const questionList = Object.entries(questionMap).map(([id, text]) => ({ id, text }))

        console.log(`Built: ${built.length} respondents | ${questionList.length} questions`)

        setEmotions(emotionSet)
        setRespondents(built)
        setQuestions(questionList)
        setLoading(false)
      })
      .catch(err => {
        console.error('Data loading error:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [filePath])

  return { respondents, emotions, questions, loading, error }
}
