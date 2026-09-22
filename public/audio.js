// ============================================================================
// Nông Trại Vui Vẻ - Web Audio SFX Engine (Zero-dependency Procedural Audio)
// ============================================================================

(function () {
  let ctx = null;
  let muted = localStorage.getItem('ntvv_muted') === '1';

  function getAudioContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  // Ensure AudioContext unlocks on the first user click / touch
  function unlock() {
    getAudioContext();
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
  }
  window.addEventListener('click', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });

  const Audio = {
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      localStorage.setItem('ntvv_muted', muted ? '1' : '0');
      return muted;
    },
    setMute(val) {
      muted = !!val;
      localStorage.setItem('ntvv_muted', muted ? '1' : '0');
    },

    // Gentle tactile click for buttons & menus
    playTap() {
      if (muted) return;
      const ac = getAudioContext();
      if (!ac) return;
      try {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(160, ac.currentTime + 0.04);

        gain.gain.setValueAtTime(0.12, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.04);

        osc.connect(gain);
        gain.connect(ac.destination);

        osc.start(ac.currentTime);
        osc.stop(ac.currentTime + 0.04);
      } catch (e) {}
    },

    // Satisfying pop / pluck for harvesting crops
    playHarvest() {
      if (muted) return;
      const ac = getAudioContext();
      if (!ac) return;
      try {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(760, ac.currentTime + 0.08);

        gain.gain.setValueAtTime(0.2, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(ac.destination);

        osc.start(ac.currentTime);
        osc.stop(ac.currentTime + 0.12);
      } catch (e) {}
    },

    // Crisp high-pitch metallic bell/chime for gold & gems
    playCoin() {
      if (muted) return;
      const ac = getAudioContext();
      if (!ac) return;
      try {
        const t = ac.currentTime;
        [987.77, 1318.51].forEach((freq, i) => { // B5, E6
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + i * 0.06);

          gain.gain.setValueAtTime(0.15, t + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.22);

          osc.connect(gain);
          gain.connect(ac.destination);

          osc.start(t + i * 0.06);
          osc.stop(t + i * 0.06 + 0.22);
        });
      } catch (e) {}
    },

    // Soft bubbly water droplet for watering crops
    playWater() {
      if (muted) return;
      const ac = getAudioContext();
      if (!ac) return;
      try {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(950, ac.currentTime + 0.04);
        osc.frequency.exponentialRampToValueAtTime(350, ac.currentTime + 0.14);

        gain.gain.setValueAtTime(0.18, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.14);

        osc.connect(gain);
        gain.connect(ac.destination);

        osc.start(ac.currentTime);
        osc.stop(ac.currentTime + 0.14);
      } catch (e) {}
    },

    // Triumphant harmonic arpeggio for level up & milestone rewards
    playLevelUp() {
      if (muted) return;
      const ac = getAudioContext();
      if (!ac) return;
      try {
        const t = ac.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + idx * 0.1);

          gain.gain.setValueAtTime(0.2, t + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + (idx === notes.length - 1 ? 0.45 : 0.2));

          osc.connect(gain);
          gain.connect(ac.destination);

          osc.start(t + idx * 0.1);
          osc.stop(t + idx * 0.1 + (idx === notes.length - 1 ? 0.45 : 0.2));
        });
      } catch (e) {}
    },

    // Cheerful chime for order complete, quest finish
    playSuccess() {
      if (muted) return;
      const ac = getAudioContext();
      if (!ac) return;
      try {
        const t = ac.currentTime;
        [587.33, 880.00].forEach((freq, i) => { // D5, A5
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + i * 0.08);

          gain.gain.setValueAtTime(0.16, t + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.25);

          osc.connect(gain);
          gain.connect(ac.destination);

          osc.start(t + i * 0.08);
          osc.stop(t + i * 0.08 + 0.25);
        });
      } catch (e) {}
    }
  };

  window.NTVVAudio = Audio;
})();
