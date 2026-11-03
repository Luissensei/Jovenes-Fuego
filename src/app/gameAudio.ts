let audioContext: AudioContext | null = null;

/** Feedback sounds only play after a player action and remain intentionally quiet. */
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
      const start = now + index * 0.055;
      oscillator.type = kind === 'incorrect' ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(kind === 'success' ? 0.035 : 0.018, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.19);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.2);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  } catch {
    // The game remains usable when a browser blocks audio.
  }
}
