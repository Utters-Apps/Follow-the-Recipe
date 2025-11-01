let audioContext = null;
let audioBuffers = {};
let hasAudioStarted = false;

// Map logical sound names to asset paths
const SOUND_ASSETS = {
  click: '/usr/share/sounds/click.mp3',
  success: '/usr/share/sounds/success.mp3',
  error: '/usr/share/sounds/error.mp3',
  buy: '/usr/share/sounds/buy.mp3',
  rank_up: '/usr/share/sounds/rank_up.mp3',
  timer_warning: '/usr/share/sounds/timer_warning.mp3',
  rush_hour: '/usr/share/sounds/rush_hour.mp3',
  
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
