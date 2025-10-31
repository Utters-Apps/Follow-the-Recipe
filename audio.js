import * as Tone from 'https://cdn.skypack.dev/tone@14.7.77';
let hasAudioStarted = false;

const audioSynths = {
  click: new Tone.MembraneSynth({ octaves:5, pitchDecay:0.1, volume:-12 }).toDestination(),
  success: new Tone.Synth({ oscillator:{type:'sine'}, envelope:{attack:0.01,decay:0.2,sustain:0.1,release:0.2}, volume:-10 }).toDestination(),
  error: new Tone.Synth({ oscillator:{type:'square'}, envelope:{attack:0.01,decay:0.3,sustain:0,release:0.1}, volume:-15 }).toDestination(),
  buy: new Tone.PolySynth(Tone.Synth, { volume:-15, envelope:{attack:0.01,decay:0.1,sustain:0.1,release:0.1} }).toDestination()
};

export async function initializeAudio() {
  if (hasAudioStarted) return;
  try {
    await Tone.start();
    hasAudioStarted = true;
    playSound('click');
  } catch (e) {
    console.warn('Audio init failed', e);
    // Gracefully mark audio as unavailable so callers can continue without throwing
    hasAudioStarted = false;
    // Avoid rethrowing to prevent unhandledRejection
    return;
  }
}

export function playSound(name) {
  const now = Tone.now();
  try {
    switch (name) {
      case 'click': audioSynths.click.triggerAttackRelease("C2","8n",now); break;
      case 'success': audioSynths.success.triggerAttackRelease("C5","8n",now); audioSynths.success.triggerAttackRelease("G5","8n",now+0.08); break;
      case 'error': audioSynths.error.triggerAttackRelease("F#2","8n",now); break;
      case 'buy': audioSynths.buy.triggerAttackRelease(["C4","E4","G4"],"16n",now); break;
    }
  } catch (e) { console.warn('playSound error', e); }
}

// allow UI to optionally force-enable audio upon first interaction
export function ensureAudioStarted() { initializeAudio().catch(()=>{}); }
