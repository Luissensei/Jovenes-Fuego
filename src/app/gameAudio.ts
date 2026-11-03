let audioContext: AudioContext | null = null;

/** Short, quiet feedback tones; only plays after a real player interaction. */
export function playGameTone(kind: 'success' | 'incorrect' | 'tap' = 'tap') {
  try {
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return;
    audioContext ??= new window.AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();

    const context = audioContext;
    const now = context.currentTime;
    const frequencies = kind === 'success'
      ? [587.33, 783.99]
      : kind === 'incorrect'
        ? [220, 164.81]
        : [440];
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === 'incorrect' ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.055);
      gain.gain.setValueAtTime(0.0001, now + index * 0.055);
      gain.gain.exponentialRampToValueAtTime(kind === 'success' ? 0.035 : 0.018, now + index * 0.055 + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.055 + 0.19);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * 0.055);
      oscillator.stop(now + index * 0.055 + 0.2);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  } catch {
    // El juego sigue funcionando aunque el navegador bloquee el audio.
  }
}
