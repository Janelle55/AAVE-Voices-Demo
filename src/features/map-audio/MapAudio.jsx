import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const MANIFEST_VERSION = 'v1';

export default function MapAudio({ onClose }) {
  const [manifest, setManifest] = useState(null);
  const [activeCity, setActiveCity] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [audioFilter, setAudioFilter] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    fetch('/audio/map-data/' + MANIFEST_VERSION + '/manifest.json')
      .then(r => r.json()).then(setManifest).catch(console.error);
  }, []);

  const handleCityClick = (city) => {
    setActiveCity(city);
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = (manifest?.audioBasePath || '') + '/' + city.audioFile;
      if (audioFilter && city.audioFile) {
        audioRef.current.play().then(() => setPlaying(true)).catch(console.error);
      }
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(console.error); }
  };

  const displayed = manifest ? (audioFilter ? manifest.cities.filter(c => c.audioFile) : manifest.cities) : [];
  const audioCount = manifest ? manifest.cities.filter(c => c.audioFile).length : 0;

  const hdrBtn = (onClick, active, children) => (
    <button onClick={onClick} style={{
      background: active ? 'rgba(245,158,11,0.18)' : 'rgba(45,106,79,0.1)',
      border: active ? '1px solid rgba(245,158,11,0.65)' : '1px solid rgba(116,198,157,0.3)',
      color: active ? '#fbbf24' : '#74c69d',
      borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
      fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', transition: 'all 0.2s'
    }}>{children}</button>
  );

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,16,0.97)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(45,106,79,0.3)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: '#f0ede6', fontWeight: 700 }}>AAVE Voices — City Map</h2>
          <span style={{ fontSize: 11, color: 'rgba(45,106,79,0.8)', letterSpacing: 1 }}>{audioFilter ? audioCount + ' AUDIO CITIES' : (manifest ? manifest.version + ' · ' + manifest.cities.length + ' cities' : 'Loading...')}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hdrBtn(() => { setAudioFilter(f => !f); setActiveCity(null); setPlaying(false); if (audioRef.current) audioRef.current.pause(); }, audioFilter, '♫ Audio' + (audioFilter ? ' ✓' : ''))}
          {hdrBtn(onClose, false, '✕ Close')}
        </div>
      </div>

      {/* Map */}
      <div style={{ width: '100%', maxWidth: 960, padding: '80px 20px 20px', boxSizing: 'border-box' }}>
        {audioFilter && <p style={{ margin: '0 0 8px', fontSize: 11, color: '#fbbf24', textAlign: 'center', letterSpacing: '0.06em' }}>AUDIO MODE — {audioCount} cities with recordings · tap to play</p>}
        {!manifest ? <p style={{ color: '#f0ede6', textAlign: 'center' }}>Loading map data...</p> : (
          <svg viewBox="0 0 960 600" style={{ width: '100%', maxHeight: '55vh' }}>
            {displayed.map(city => (
              <g key={city.id} onClick={() => handleCityClick(city)} style={{ cursor: 'pointer' }}>
                <circle cx={city.cx} cy={city.cy}
                  r={activeCity?.id === city.id ? 14 : (audioFilter ? 11 : 9)}
                  fill={activeCity?.id === city.id ? (audioFilter ? '#f59e0b' : '#40916c') : (audioFilter ? 'rgba(245,158,11,0.6)' : 'rgba(45,106,79,0.7)')}
                  stroke={activeCity?.id === city.id ? (audioFilter ? '#fbbf24' : '#74c69d') : (audioFilter ? 'rgba(251,191,36,0.45)' : 'rgba(116,198,157,0.4)')}
                  strokeWidth={audioFilter ? 2.5 : 2}
                  style={{ transition: 'all 0.2s' }}
                />
                {audioFilter && <text x={city.cx} y={city.cy + 0.5} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 6, fill: activeCity?.id === city.id ? '#1a0800' : '#fff8e0', fontWeight: 800, pointerEvents: 'none', userSelect: 'none' }}>♫</text>}
                <title>{city.city}, {city.state}</title>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Player */}
      {activeCity && (
        <div style={{ position: 'absolute', bottom: 24, background: audioFilter ? 'rgba(64,32,0,0.95)' : 'rgba(13,32,24,0.95)', border: audioFilter ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(45,106,79,0.4)', borderRadius: 16, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, backdropFilter: 'blur(20px)' }}>
          <div>
            <div style={{ fontWeight: 700, color: audioFilter ? '#fbbf24' : '#f0ede6', fontSize: 15 }}>{activeCity.city}, {activeCity.state}</div>
            <div style={{ fontSize: 11, color: audioFilter ? 'rgba(251,191,36,0.7)' : 'rgba(116,198,157,0.7)', marginTop: 2 }}>{activeCity.audioFile}</div>
          </div>
          <button onClick={togglePlay} style={{ background: playing ? (audioFilter ? 'rgba(245,158,11,0.2)' : 'rgba(64,145,108,0.3)') : (audioFilter ? 'rgba(245,158,11,0.3)' : '#2d6a4f'), border: audioFilter ? '1px solid rgba(245,158,11,0.6)' : '1px solid #40916c', color: audioFilter ? '#fbbf24' : '#f0ede6', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}>
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
        </div>
      )}

      <audio ref={audioRef} onEnded={() => setPlaying(false)} />
    </div>
  , document.body
  );
}
