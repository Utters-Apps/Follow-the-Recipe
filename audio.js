import * as Tone from 'https://cdn.skypack.dev/tone@14.7.77';

let hasAudioStarted = false;

// 🎹 Configuração dos sintetizadores
const audioSynths = {
  click: new Tone.MembraneSynth({
    octaves: 5,
    pitchDecay: 0.1,
    volume: -12
  }).toDestination(),

  success: new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 },
    volume: -10
  }).toDestination(),

  error: new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 },
    volume: -15
  }).toDestination(),

  buy: new Tone.PolySynth(Tone.Synth, {
    maxPolyphony: 4,
    volume: -15,
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 }
  }).toDestination()
};

// 🚀 Inicializa o áudio, obrigatório em interação do usuário
export async function initializeAudio() {
  if (hasAudioStarted) return;
  try {
    await Tone.start();
    hasAudioStarted = true;
    playSound('click'); // efeito de teste
  } catch (e) {
    console.warn('Audio init failed', e);
    hasAudioStarted = false;
    return;
  }
}

// 🔊 Toca sons pelos nomes
export function playSound(name) {
  const now = Tone.now();
  if (!hasAudioStarted) return;

  try {
    switch (name) {
      case 'click':
        audioSynths.click.triggerAttackRelease("C2", "8n", now);
        break;

      case 'success':
        audioSynths.success.triggerAttackRelease("C5", "8n", now);
        audioSynths.success.triggerAttackRelease("G5", "8n", now + 0.08);
        break;

      case 'error':
        audioSynths.error.triggerAttackRelease("F#2", "8n", now);
        break;

      case 'buy':
        audioSynths.buy.triggerAttackRelease(["C4", "E4", "G4"], "16n", now);
        break;

      default:
        console.warn(`Sound "${name}" not found`);
    }
  } catch (e) {
    console.warn('playSound error', e);
  }
}

// Pode ser chamado no primeiro clique/tap para garantir que o áudio comece
export function ensureAudioStarted() {
  initializeAudio().catch(() => {});
}
