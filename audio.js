let audioContext = null;
let audioBuffers = {};
let hasAudioStarted = false;

// Map logical sound names to asset paths
const SOUND_ASSETS = {
  click: 'https://dl.dropboxusercontent.com/scl/fi/ht1bzqpt92qy0i0224lzz/click.mp3?rlkey=dydpgaqqsr18lc33pxw24od36&st=evjjzzt7',
  success: '/usr/share/sounds/success.mp3',
  error: 'https://dl.dropboxusercontent.com/scl/fi/z5223ergejeboa4axac37/error-2.mp3?rlkey=7fr00gcdcjbylknqk3gat3jbu&st=3xdzzwc7',
  buy: 'https://dl.dropboxusercontent.com/scl/fi/8bncyqgy8gjfw0pm00fxs/buy_1.mp3?rlkey=trk2nrf8nljhzd43gq3ybzk3c&st=mddu9aki',
  rank_up: 'https://dl.dropboxusercontent.com/scl/fi/fs2e8489l01sn6w7zoydu/RankUP.mp3?rlkey=r4k0b2iwtcbb3ur28rkjxet3x&st=atyzwcg2',
  timer_warning: 'https://dl.dropboxusercontent.com/scl/fi/lv9xtea6lkfw4cqolafmi/timer_warning-1.mp3?rlkey=mu7c4lwnnjr54sk0wkap2dtkz&st=63sqztmu',
  rush_hour: 'https://dl.dropboxusercontent.com/scl/fi/43zygjp9ip9z0p4f2eo3i/Big-Time-Rush-Oh-Oh-Sound-Effect.-Sound-Guy-youtube.mp3?rlkey=lciwqkr4wyxsxmfazhrwriody&st=7vbqk9p3',
  
  // Ingredient specific sounds
  mascarpone: '/mascarpone.mp3',
  couve: '/couve.mp3',
  carne_seca: '/carne_seca.mp3',
  repolho: '/repolho.mp3',
  polvo: '/polvo.mp3',
  farinha: '/farinha.mp3',
  molho_okono: '/molho_okono.mp3',
  acucar: '/acucar.mp3',
};

async function loadAudioBuffer(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

// 🚀 Inicializa o áudio, obrigatório em interação do usuário
export async function initializeAudio() {
  if (hasAudioStarted) return;
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  try {
    // Load all assets
    await Promise.all(
      Object.entries(SOUND_ASSETS).map(async ([name, url]) => {
        try {
          audioBuffers[name] = await loadAudioBuffer(url);
        } catch(e) {
          console.error(`Failed to load audio asset ${name} (${url})`, e);
        }
      })
    );
    
    // Ensure context is running if it was suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    hasAudioStarted = true;
    playSound('click', 0.8); // effect to confirm initialization
  } catch (e) {
    console.warn('Audio init failed', e);
    hasAudioStarted = false;
    return;
  }
}

// 🔊 Toca sons pelos nomes
export function playSound(name, volume = 1.0) {
  if (!hasAudioStarted || !audioContext) return;

  let buffer = audioBuffers[name];
  let finalVolume = volume;

  // If a specific sound is missing (e.g., an ingredient or a specific event sound not loaded), 
  // try to fall back to a generic sound (like 'click') for tactile feedback.
  if (!buffer) {
    if (name !== 'click' && audioBuffers['click']) {
      buffer = audioBuffers['click'];
      finalVolume = 0.4; // softer fallback click
    } else {
      // If it's a specific sound or click is truly missing, just skip
      if (name !== 'click') console.warn(`Sound "${name}" not found, skipping.`);
      return;
    }
  }

  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  
  source.buffer = buffer;

  // Make most sounds louder by default except background music (BG handled separately as BGmusic.mp3)
  // We increase non-click sounds to be louder while keeping click audible but not overpowering.
  // 'click' -> small boost, others -> larger boost. Background music (BGmusic.mp3) is not routed here.
  if (name === 'click') {
    finalVolume = finalVolume * 1.4;
  } else {
    finalVolume = finalVolume * 1.8;
  }
  gainNode.gain.value = finalVolume;
  
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  source.start(0);
}

// Pode ser chamado no primeiro clique/tap para garantir que o áudio comece
export function ensureAudioStarted() {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  initializeAudio().catch(() => {});
}

// NEW: ensure audio never plays while the document is not visible or during pagehide/unload
// Suspend audioContext when document.hidden (page backgrounded) and resume on visible.
// Also stop any short-lived sources by clearing buffers reference if suspended, and provide a global stopAllSounds().
function stopAllSounds() {
  try {
    // There's no direct list of active sources here; suspending the context prevents further output.
    if (audioContext && audioContext.state === 'running') {
      audioContext.suspend().catch(()=>{});
    }
  } catch (e) {
    console.warn('stopAllSounds failed', e);
  }
}
// Visibility handler: when hidden, suspend; when visible, do not automatically resume unless user interacts
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAllSounds();
  } else {
    // Do NOT automatically resume audio to avoid background-then-resume behavior.
    // We keep ensureAudioStarted/init flow to resume on user gesture.
    // Optionally, try to resume minimal context state (non-playing) to allow future user-initiated playback.
    if (audioContext && audioContext.state === 'suspended') {
      // keep suspended; call ensureAudioStarted() from user gesture to resume
    }
  }
}, { passive: true });

// pagehide and beforeunload ensure no sound persists when navigating away or putting app to background on mobile
window.addEventListener('pagehide', () => stopAllSounds(), { passive: true });
window.addEventListener('beforeunload', () => stopAllSounds(), { passive: true });
