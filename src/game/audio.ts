interface SpatialEmitter {
  panner: PannerNode;
  gain: GainNode;
  x: number;
  z: number;
  kind: "market" | "sizzle" | "radio" | "mechanic" | "loom";
  phaseOffset: number;
  lastBurstAt: number;
}

export class TamaleAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private outdoorBus: GainNode | null = null;
  private indoorBedGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private crowdFilter: BiquadFilterNode | null = null;
  private spatialEmitters: SpatialEmitter[] = [];
  private activeVoiceEl: HTMLAudioElement | null = null;
  private enabled = true;
  private volume = 0.5;
  private indoorMode = false;
  private lastStepTime = 0;
  private lastBirdTime = 0;
  private lastMarketAccentTime = 0;
  private lastCricketTime = 0;
  private lastHornTime = 0;
  private lastPassByTime = 0;
  private lastRadioNoteTime = 0;
  private radioStep = 0;

  public init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.enabled ? this.volume : 0;
    this.masterGain.connect(this.ctx.destination);

    // Master acoustic filter transitions smoothly when stepping indoors vs outdoors
    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = "lowpass";
    this.masterFilter.frequency.value = this.indoorMode ? 760 : 18000;
    this.masterFilter.Q.value = 0.7;
    this.masterFilter.connect(this.masterGain);

    this.outdoorBus = this.ctx.createGain();
    this.outdoorBus.gain.value = this.indoorMode ? 0.36 : 1.0;
    this.outdoorBus.connect(this.masterFilter);

    // Shared broadband noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Subtle indoor room tone / distant fan air when inside a shop/landmark
    const indoorSource = this.ctx.createBufferSource();
    indoorSource.buffer = noiseBuffer;
    indoorSource.loop = true;
    const indoorFilter = this.ctx.createBiquadFilter();
    indoorFilter.type = "lowpass";
    indoorFilter.frequency.value = 240;
    this.indoorBedGain = this.ctx.createGain();
    this.indoorBedGain.gain.value = this.indoorMode ? 0.04 : 0;
    indoorSource.connect(indoorFilter);
    indoorFilter.connect(this.indoorBedGain);
    this.indoorBedGain.connect(this.masterGain);
    indoorSource.start();

    // Savannah wind noise bed
    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 380;
    this.windFilter.Q.value = 1.4;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.04;

    windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.outdoorBus);
    windSource.start();

    // General nearby street chatter murmur bed
    const crowdBuffer = this.createSyllabicMurmurBuffer(3, 9.5, 23.0);
    const crowdSource = this.ctx.createBufferSource();
    crowdSource.buffer = crowdBuffer;
    crowdSource.loop = true;

    this.crowdFilter = this.ctx.createBiquadFilter();
    this.crowdFilter.type = "bandpass";
    this.crowdFilter.frequency.value = 620;
    this.crowdFilter.Q.value = 0.9;

    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.value = 0;

    crowdSource.connect(this.crowdFilter);
    this.crowdFilter.connect(this.crowdGain);
    this.crowdGain.connect(this.outdoorBus);
    crowdSource.start();

    // Rain bed (quiet unless weather === 'rain')
    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = "highpass";
    rainFilter.frequency.value = 1400;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;

    rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.outdoorBus);
    rainSource.start();

    // Player Pragya / Motorcycle procedural 2-stroke hum
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 55;

    const engFilter = this.ctx.createBiquadFilter();
    engFilter.type = "lowpass";
    engFilter.frequency.value = 210;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc.connect(engFilter);
    engFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterFilter);
    this.engineOsc.start();

    // Positional 3D Soundscape Emitters anchored across Tamale
    this.initSpatialEmitters(noiseBuffer);
  }

  private createSyllabicMurmurBuffer(seconds: number, modA: number, modB: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const out = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      const t = i / ctx.sampleRate;
      const env = 0.5 + 0.32 * Math.sin(t * modA) + 0.18 * Math.sin(t * modB);
      last = last * 0.72 + white * 0.28;
      out[i] = last * env;
    }
    return buf;
  }

  private createSpatialPanner(x: number, y: number, z: number, refDist = 7, maxDist = 58): PannerNode {
    const ctx = this.ctx!;
    const panner = ctx.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = refDist;
    panner.maxDistance = maxDist;
    panner.rolloffFactor = 1.2;
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;
    panner.connect(this.outdoorBus!);
    return panner;
  }

  private initSpatialEmitters(noiseBuffer: AudioBuffer) {
    if (!this.ctx || !this.outdoorBus) return;

    // 1. Overlapping Market Bustle Zones (staggered cadence & vocal formant bands)
    const marketZones: Array<{ x: number; z: number; freq: number; modA: number; modB: number }> = [
      { x: -44, z: -30, freq: 650, modA: 11.2, modB: 26.4 }, // Tamale Central Market
      { x: -132, z: 28, freq: 580, modA: 8.7, modB: 19.3 }, // Aboabo Market
      { x: -84, z: 100, freq: 720, modA: 10.4, modB: 22.1 }, // Lamashegu Market
      { x: 158, z: 34, freq: 610, modA: 7.9, modB: 17.6 }, // Kukuo Market
    ];
    for (let i = 0; i < marketZones.length; i++) {
      const mz = marketZones[i];
      const src = this.ctx.createBufferSource();
      src.buffer = this.createSyllabicMurmurBuffer(3.2 + i * 0.4, mz.modA, mz.modB);
      src.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = mz.freq;
      filter.Q.value = 1.05;

      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      const panner = this.createSpatialPanner(mz.x, 1.6, mz.z, 8, 56);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      src.start();

      this.spatialEmitters.push({
        panner,
        gain,
        x: mz.x,
        z: mz.z,
        kind: "market",
        phaseOffset: i * 1.3,
        lastBurstAt: 0,
      });
    }

    // 2. Roadside Food Vendors (Charcoal sizzle & frying kɔɔsɛ / chichinga / waakye pots)
    const foodSpots: Array<[number, number]> = [
      [-36, -16], // Central Market food corner
      [34, -12], // Daa Waakye & TZ Spot
      [-120, 12], // Aboabo Chichinga Grill
      [-84, 108], // Lamashegu Breakfast / Kɔɔsɛ stall
    ];
    for (let i = 0; i < foodSpots.length; i++) {
      const [fx, fz] = foodSpots[i];
      const src = this.ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;

      const hp = this.ctx.createBiquadFilter();
      hp.type = "bandpass";
      hp.frequency.value = 3400 + i * 240;
      hp.Q.value = 1.1;

      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      const panner = this.createSpatialPanner(fx, 1.1, fz, 4.5, 28);

      src.connect(hp);
      hp.connect(gain);
      gain.connect(panner);
      src.start();

      this.spatialEmitters.push({
        panner,
        gain,
        x: fx,
        z: fz,
        kind: "sizzle",
        phaseOffset: i * 0.9,
        lastBurstAt: 0,
      });
    }

    // 3. Shop Radio Music Boxes (Alhassan Fabrics, Savannah Telecom, Central Market Perimeter, Lamashegu Parts)
    const radioSpots: Array<[number, number]> = [
      [24, 13],
      [-20, 13],
      [-44, -22],
      [-84, 141],
    ];
    for (let i = 0; i < radioSpots.length; i++) {
      const [rx, rz] = radioSpots[i];
      const gain = this.ctx.createGain();
      gain.gain.value = 1.0;
      const panner = this.createSpatialPanner(rx, 1.6, rz, 5, 34);
      gain.connect(panner);

      this.spatialEmitters.push({
        panner,
        gain,
        x: rx,
        z: rz,
        kind: "radio",
        phaseOffset: i * 1.7,
        lastBurstAt: 0,
      });
    }

    // 4. Artisans & Mechanics (Lamashegu Mechanics & Cultural Weavers Guild)
    const mechanicPanner = this.createSpatialPanner(-134, 1.2, 104, 6, 40);
    const mechanicGain = this.ctx.createGain();
    mechanicGain.gain.value = 1.0;
    mechanicGain.connect(mechanicPanner);
    this.spatialEmitters.push({
      panner: mechanicPanner,
      gain: mechanicGain,
      x: -134,
      z: 104,
      kind: "mechanic",
      phaseOffset: 0.4,
      lastBurstAt: 0,
    });

    const loomPanner = this.createSpatialPanner(-82, 1.2, 22, 5.5, 34);
    const loomGain = this.ctx.createGain();
    loomGain.gain.value = 1.0;
    loomGain.connect(loomPanner);
    this.spatialEmitters.push({
      panner: loomPanner,
      gain: loomGain,
      x: -82,
      z: 22,
      kind: "loom",
      phaseOffset: 1.1,
      lastBurstAt: 0,
    });
  }

  public setIndoorMode(indoor: boolean) {
    this.indoorMode = indoor;
    if (!this.ctx || !this.masterFilter || !this.outdoorBus || !this.indoorBedGain) return;
    const now = this.ctx.currentTime;
    this.masterFilter.frequency.setTargetAtTime(indoor ? 760 : 18000, now, 0.14);
    this.outdoorBus.gain.setTargetAtTime(indoor ? 0.36 : 1.0, now, 0.14);
    this.indoorBedGain.gain.setTargetAtTime(indoor ? 0.04 : 0, now, 0.14);
  }

  public updateListener(x: number, y: number, z: number, yaw: number) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const listener = this.ctx.listener;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    if (listener.positionX) {
      const now = this.ctx.currentTime;
      listener.positionX.setTargetAtTime(x, now, 0.04);
      listener.positionY.setTargetAtTime(y + 1.5, now, 0.04);
      listener.positionZ.setTargetAtTime(z, now, 0.04);
      listener.forwardX.setTargetAtTime(fx, now, 0.04);
      listener.forwardY.setTargetAtTime(0, now, 0.04);
      listener.forwardZ.setTargetAtTime(fz, now, 0.04);
      listener.upX.setTargetAtTime(0, now, 0.04);
      listener.upY.setTargetAtTime(1, now, 0.04);
      listener.upZ.setTargetAtTime(0, now, 0.04);
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopVoiceClip();
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(enabled ? this.volume : 0, this.ctx.currentTime, 0.08);
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && this.enabled) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.08);
    }
    if (this.activeVoiceEl) {
      this.activeVoiceEl.volume = Math.min(1, this.volume * 1.3);
    }
  }

  public stopVoiceClip() {
    if (this.activeVoiceEl) {
      this.activeVoiceEl.pause();
      this.activeVoiceEl.src = "";
      this.activeVoiceEl = null;
    }
  }

  public isVoicePlaying(): boolean {
    return Boolean(this.activeVoiceEl && !this.activeVoiceEl.paused && !this.activeVoiceEl.ended);
  }

  public playVoiceBase64(base64Audio: string, mimeType = "audio/wav", volumeScale = 1.0): Promise<void> {
    if (!this.enabled) return Promise.resolve();
    this.stopVoiceClip();
    return new Promise((resolve) => {
      const audio = new Audio(`data:${mimeType};base64,${base64Audio}`);
      audio.volume = Math.max(0, Math.min(1, this.volume * 1.4 * volumeScale));
      this.activeVoiceEl = audio;
      const done = () => {
        if (this.activeVoiceEl === audio) {
          this.activeVoiceEl = null;
        }
        resolve();
      };
      audio.onended = done;
      audio.onerror = done;
      void audio.play().catch(done);
    });
  }

  public updateAmbience(
    time: number,
    weather: "clear" | "harmattan" | "rain",
    isDriving: boolean,
    speed: number,
    isDaytime: boolean,
    crowdIntensity = 0,
    playerX = 0,
    playerZ = 0,
    hour = 12,
    isResidential = false
  ) {
    if (!this.ctx || !this.enabled || this.ctx.state !== "running") return;

    const now = this.ctx.currentTime;
    const isPeakMarket = hour >= 7.5 && hour <= 17.5;
    const isMealTime = (hour >= 6 && hour <= 10.5) || (hour >= 11.5 && hour <= 15) || (hour >= 17 && hour <= 21.5);
    const isNightHours = hour < 5.6 || hour >= 18.6;

    if (this.windGain && this.windFilter) {
      const targetWind = weather === "harmattan" ? 0.095 : isResidential ? 0.042 : 0.03;
      this.windGain.gain.setTargetAtTime(targetWind, now, 0.3);
      this.windFilter.frequency.setTargetAtTime(weather === "harmattan" ? 520 : 340, now, 0.3);
    }

    if (this.crowdGain && this.crowdFilter) {
      const clamped = Math.max(0, Math.min(1, crowdIntensity));
      const targetCrowd = clamped * (isDaytime ? 0.14 : 0.055);
      this.crowdGain.gain.setTargetAtTime(targetCrowd, now, 0.35);
      this.crowdFilter.frequency.setTargetAtTime(520 + Math.sin(time * 0.9) * 110, now, 0.25);
    }

    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(weather === "rain" ? 0.14 : 0, now, 0.4);
    }

    if (this.engineGain && this.engineOsc) {
      if (isDriving) {
        const rpmFreq = 52 + Math.min(95, Math.abs(speed) * 4.2);
        this.engineOsc.frequency.setTargetAtTime(rpmFreq, now, 0.08);
        this.engineGain.gain.setTargetAtTime(0.06, now, 0.08);
      } else {
        this.engineGain.gain.setTargetAtTime(0, now, 0.1);
      }
    }

    // Update 3D spatial emitters based on time of day & proximity
    for (const em of this.spatialEmitters) {
      const dist = Math.hypot(em.x - playerX, em.z - playerZ);
      if (em.kind === "market") {
        const activity = isPeakMarket ? 0.22 : isDaytime ? 0.13 : 0.03;
        const rainDamp = weather === "rain" ? 0.55 : 1.0;
        const pulse = 0.85 + 0.15 * Math.sin(time * 1.4 + em.phaseOffset);
        em.gain.gain.setTargetAtTime(dist < 62 ? activity * rainDamp * pulse : 0, now, 0.3);
      } else if (em.kind === "sizzle") {
        const active = isMealTime && weather !== "rain" ? 0.065 : 0;
        const flicker = 0.8 + 0.2 * Math.sin(time * 3.1 + em.phaseOffset);
        em.gain.gain.setTargetAtTime(dist < 30 ? active * flicker : 0, now, 0.25);
        if (active > 0 && dist < 18 && time - em.lastBurstAt > 3.8 + em.phaseOffset) {
          em.lastBurstAt = time;
          this.playPotClink(em.panner);
        }
      } else if (em.kind === "radio") {
        // Play subtle West African pentatonic shop radio groove when close to open shops
        if (!isNightHours && dist < 34 && time - this.lastRadioNoteTime > 0.34) {
          this.lastRadioNoteTime = time;
          this.playShopRadioNote(em.gain);
        }
      } else if (em.kind === "mechanic") {
        if (isDaytime && hour >= 7.5 && hour <= 17.8 && dist < 36 && time - em.lastBurstAt > 2.6) {
          em.lastBurstAt = time;
          if (Math.random() < 0.72) {
            this.playMechanicClank(em.gain);
          }
        }
      } else if (em.kind === "loom") {
        if (isDaytime && hour >= 7.5 && hour <= 17.5 && dist < 30 && time - em.lastBurstAt > 1.4) {
          em.lastBurstAt = time;
          this.playLoomShuttle(em.gain);
        }
      }
    }

    // Subtle market bell / calabash tap accents near busy markets
    if (crowdIntensity > 0.35 && isDaytime && time - this.lastMarketAccentTime > 4.6) {
      this.lastMarketAccentTime = time;
      if (Math.random() < 0.65) {
        this.playMarketBell(crowdIntensity);
      }
    }

    // Gentle savannah birdsong in daytime clear/harmattan weather (stronger in residential/trees)
    if (isDaytime && weather !== "rain" && time - this.lastBirdTime > (isResidential ? 4.8 : 6.8)) {
      this.lastBirdTime = time;
      if (Math.random() < 0.58) {
        this.playBirdChirp();
      }
    }

    // Evening & nighttime crickets in Tamale residential areas & compounds
    if ((isNightHours || isResidential) && weather !== "rain" && time - this.lastCricketTime > 2.4) {
      this.lastCricketTime = time;
      const strength = isNightHours ? (isResidential ? 1.0 : 0.55) : 0.28;
      if (Math.random() < 0.7) {
        this.playCricketChirp(strength);
      }
    }
  }

  private playPotClink(dest: AudioNode) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    const f = 1450 + Math.random() * 520;
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 0.7, now + 0.08);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playShopRadioNote(dest: AudioNode) {
    if (!this.ctx) return;
    const scale = [293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 440.0, 392.0];
    const step = this.radioStep++ % 8;
    if (step === 3 || step === 7) {
      if (Math.random() < 0.4) return;
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = step % 4 === 0 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(scale[(step + Math.floor(this.radioStep / 8)) % scale.length], now);

    // Small shop radio speaker coloration
    filter.type = "bandpass";
    filter.frequency.value = 1150;
    filter.Q.value = 1.2;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  private playMechanicClank(dest: AudioNode) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    const base = 780 + Math.random() * 440;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 0.45, now + 0.11);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  private playLoomShuttle(dest: AudioNode) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.05);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  private playCricketChirp(strength: number) {
    if (!this.ctx || !this.outdoorBus) return;
    const now = this.ctx.currentTime;
    for (let p = 0; p < 3; p++) {
      const start = now + p * 0.065;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(4200 + Math.random() * 350, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.014 * strength, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.048);
      osc.connect(gain);
      gain.connect(this.outdoorBus);
      osc.start(start);
      osc.stop(start + 0.055);
    }
  }

  public playTrafficHorn(kind: "moto" | "pragya" | "taxi" | "car", x: number, z: number) {
    if (!this.ctx || !this.outdoorBus || !this.enabled || this.ctx.state !== "running") return;
    const nowMs = performance.now();
    if (nowMs - this.lastHornTime < 2200) return;
    this.lastHornTime = nowMs;

    const now = this.ctx.currentTime;
    const panner = this.createSpatialPanner(x, 1.0, z, 6, 48);
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    filter.type = "bandpass";
    filter.frequency.value = kind === "moto" || kind === "pragya" ? 950 : 620;
    filter.Q.value = 1.4;

    if (kind === "moto" || kind === "pragya") {
      // Crisp double-beep Pragya / motorcycle horn
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(640, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.055, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.09);
      gain.gain.setValueAtTime(0.001, now + 0.13);
      gain.gain.linearRampToValueAtTime(0.055, now + 0.145);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      osc.start(now);
      osc.stop(now + 0.26);
    } else {
      // Short friendly taxi / saloon horn
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(415, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.065, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      osc.start(now);
      osc.stop(now + 0.24);
    }

    osc.onended = () => {
      panner.disconnect();
    };
  }

  public playVehiclePassBy(x: number, z: number, speed: number, isMoto: boolean) {
    if (!this.ctx || !this.outdoorBus || !this.enabled || this.ctx.state !== "running") return;
    const nowMs = performance.now();
    if (nowMs - this.lastPassByTime < 1600) return;
    this.lastPassByTime = nowMs;

    const now = this.ctx.currentTime;
    const panner = this.createSpatialPanner(x, 0.8, z, 5, 32);
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    const startFreq = isMoto ? 85 + speed * 3.5 : 58 + speed * 2.2;
    osc.frequency.setValueAtTime(startFreq * 1.12, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.78, now + 0.42);

    filter.type = "lowpass";
    filter.frequency.value = isMoto ? 340 : 220;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + 0.44);
    osc.onended = () => {
      panner.disconnect();
    };
  }

  private playMarketBell(intensity: number) {
    if (!this.ctx || !this.outdoorBus) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    const baseFreq = Math.random() > 0.5 ? 1180 : 920;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.setValueAtTime(baseFreq * 1.12, now + 0.07);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.022 * intensity, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.outdoorBus);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playFootstep(running: boolean) {
    if (!this.ctx || !this.masterGain || !this.enabled || this.ctx.state !== "running") return;
    const now = performance.now();
    const interval = running ? 280 : 420;
    if (now - this.lastStepTime < interval) return;
    this.lastStepTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(115 + Math.random() * 20, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(running ? 0.07 : 0.045, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.075);
  }

  public playChime(type: "interact" | "coin" | "success" = "interact") {
    if (!this.ctx || !this.masterGain || !this.enabled || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === "coin") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(880, now + 0.07);
    } else if (type === "success") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.09);
      osc.frequency.setValueAtTime(659.25, now + 0.18);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
    }

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  private playBirdChirp() {
    if (!this.ctx || !this.outdoorBus) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    const base = 1850 + Math.random() * 600;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.25, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(base * 0.9, now + 0.14);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.025, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.outdoorBus);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public dispose() {
    this.stopVoiceClip();
    this.spatialEmitters = [];
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
