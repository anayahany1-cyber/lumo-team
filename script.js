/**
 * LUMOCASE - Arsip Forensik & Genetika Sejarah
 * Interactive Engine, Audio Synthesizer, & State Controller
 */

(function () {
  'use strict';

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const state = {
    detectiveName: 'Detektif Medis',
    currentScreen: 'screen-cover',
    currentStage: 1,
    audioEnabled: false,
    sfxEnabled: true,
    dialogueIndex: 0,
    isTyping: false,
    typewriterTimer: null,
    notes: {
      1: '',
      2: '',
      3: '',
      4: '',
      5: ''
    }
  };

  // Load persisted state if exists
  try {
    const savedName = localStorage.getItem('lumocase_detective_name');
    if (savedName) state.detectiveName = savedName;

    const savedNotes = localStorage.getItem('lumocase_notes');
    if (savedNotes) {
      state.notes = Object.assign(state.notes, JSON.parse(savedNotes));
    }
  } catch (e) {
    console.warn('Storage unavailable:', e);
  }

  // ==========================================
  // AUDIO SYNTHESIZER (WEB AUDIO API)
  // Noir Ambient Jazz & Procedural Sound Effects
  // ==========================================
  let audioCtx = null;
  let bgmGainNode = null;
  let isBgmRunning = false;
  let bgmIntervalId = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        bgmGainNode = audioCtx.createGain();
        bgmGainNode.gain.setValueAtTime(0.18, audioCtx.currentTime);
        bgmGainNode.connect(audioCtx.destination);
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Procedural Sound Effects (SFX)
  const soundFX = {
    click: function () {
      if (!state.sfxEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.04);
      } catch (e) {}
    },

    typeKey: function () {
      if (!state.sfxEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + Math.random() * 400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.03);
      } catch (e) {}
    },

    saveStamp: function () {
      if (!state.sfxEnabled || !audioCtx) return;
      try {
        // Deep thud
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch (e) {}
    },

    gavelBang: function () {
      if (!state.sfxEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(90, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

        // Filter for wooden hollow resonance
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(240, audioCtx.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } catch (e) {}
    },

    awardFanfare: function () {
      if (!state.sfxEnabled || !audioCtx) return;
      try {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C E G C E G
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.6);
          }, idx * 120);
        });
      } catch (e) {}
    }
  };

  // Procedural Noir Jazz Ambient Music Generator
  // Generates warm moody 1920s detective minor chords (Dm9, Gm7, A7alt, Bbmaj7)
  const noirChords = [
    [146.83, 220.00, 261.63, 311.13, 349.23], // Dm9
    [196.00, 233.08, 293.66, 349.23],         // Gm7
    [110.00, 164.81, 220.00, 277.18, 329.63], // A7b9
    [116.54, 174.61, 233.08, 293.66, 349.23]  // Bbmaj7
  ];
  let chordIndex = 0;

  function playNoirChord() {
    if (!audioCtx || !state.audioEnabled || !isBgmRunning) return;
    try {
      const chord = noirChords[chordIndex % noirChords.length];
      chordIndex++;

      chord.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine'; // Deep bass on root
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        const startTime = audioCtx.currentTime + (i * 0.05);
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.04, startTime + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 4.8);

        osc.connect(gain);
        gain.connect(bgmGainNode);
        osc.start(startTime);
        osc.stop(startTime + 5.0);
      });
    } catch (e) {}
  }

  function startBgm() {
    initAudioContext();
    if (!audioCtx) return;
    isBgmRunning = true;
    playNoirChord();
    if (bgmIntervalId) clearInterval(bgmIntervalId);
    bgmIntervalId = setInterval(() => {
      if (state.audioEnabled && isBgmRunning) {
        playNoirChord();
      }
    }, 4500);
  }

  function stopBgm() {
    isBgmRunning = false;
    if (bgmIntervalId) {
      clearInterval(bgmIntervalId);
      bgmIntervalId = null;
    }
  }

  // ==========================================
  // DIALOGUE SCRIPT (PROMPT REQUIREMENTS)
  // ==========================================
  const dialogues = [
    {
      text: "Halo, selamat datang di Lumocase!",
      tip: "Saya adalah rekan penyelidik Anda. Mari kita selidiki arsip bersejarah ini bersama!"
    },
    {
      text: "Kamu diajak untuk memecahkan kasus berikut!",
      tip: "Gunakan ketajaman analisis forensik dan hukum genetika pewarisan sifat."
    },
    {
      text: "Pada suatu malam yang dingin di tahun 1920, polisi Berlin menyelamatkan seorang wanita muda yang mencoba melompat dari jembatan ke Sungai Spree. Wanita tersebut tidak membawa identitas, trauma berat, dan menolak bicara. Ia kemudian dibawa ke Rumah Sakit Jiwa Dalldorf di Berlin.",
      tip: "Catat tahun 1920 dan lokasi penemuan di Sungai Spree Berlin."
    },
    {
      text: "Dua tahun kemudian, wanita yang menggunakan nama Anna Anderson tersebut membuat pengakuan mengejutkan kepada publik Jerman: ia mengklaim dirinya adalah Putri Anastasia, anak kandung Tsar Nicholas II dari Rusia yang dirumorkan berhasil selamat dari eksekusi mati tahun 1918. Jika klaimnya benar, ia berhak atas jutaan Rubel milik kekaisaran Rusia yang disimpan di bank-bank Eropa.",
      tip: "Klaim Putri Anastasia melibatkan hak waris kekayaan raksasa kekaisaran Rusia!"
    },
    {
      text: "Anda adalah Tim Detektif Medis Kepolisian Berlin yang ditugaskan oleh pengadilan Jerman untuk membuktikan kebenaran klaim ini menggunakan ilmu pewarisan sifat.",
      tip: "Sekarang, mari masuki ruang penyelidikan bukti-bukti forensik!"
    }
  ];

  // Helper hints per stage for floating mascot
  const stageHints = {
    1: "Pada Tahap 1, perhatikan: ayah IAIO dan ibu IBIO dapat menghasilkan anak golongan O (IOIO). Jadi ini belum membuktikan kebohongan Anna!",
    2: "Pada Tahap 2, ini kuncinya! Tsar Nicholas II normal (XHY). Anak perempuannya PASTI dapat XH normal dari ayah, mustahil sakit hemofilia (XhXh)!",
    3: "Pada Tahap 3, persilangan dihibrid heterozigot HhAa x HhAa menghasilkan peluang H_aa sebesar 3/16 (18,75%), persis profil Anna Anderson!",
    4: "Pada Tahap 4, ingat aturan maternal! mtDNA diturunkan 100% murni dari ibu. Anna cocok dengan Schanzkowska dan 0% cocok dengan Romanov!",
    5: "Pada Tahap 5, perhatikan catatan 4 geraham permanen yang mustahil berubah oleh pertumbuhan. Fakta dental membungkam pengacara Anna!",
    6: "Selamat datang di ruang sidang! Bacakan tuntutan forensik resmi dan dengarkan putusan hakim!"
  };

  // ==========================================
  // UI & NAVIGATION CONTROLLER
  // ==========================================
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3200);
  }

  function switchScreen(screenId) {
    document.querySelectorAll('.screen-view').forEach(s => {
      s.classList.remove('active-screen');
    });
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active-screen');
      state.currentScreen = screenId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    soundFX.click();
  }

  function updateDetectiveNameUI() {
    const name = state.detectiveName || 'Detektif Medis';
    const headerName = document.getElementById('header-user-name');
    const reviewName = document.getElementById('review-user-name');
    const certName = document.getElementById('cert-user-name');
    const inputName = document.getElementById('detective-name-input');

    if (headerName) headerName.textContent = name;
    if (reviewName) reviewName.textContent = name;
    if (certName) certName.textContent = name.toUpperCase();
    if (inputName) inputName.value = name;
  }

  // Cover Screen to Loading Sequence to Beranda
  function handleCoverStart() {
    initAudioContext();
    soundFX.click();
    const actionBox = document.getElementById('cover-actions');
    const loadingBox = document.getElementById('cover-loading-container');
    const bar = document.getElementById('loading-bar');
    const statusText = document.getElementById('loading-status-text');

    actionBox.classList.add('hidden');
    loadingBox.classList.remove('hidden');

    const steps = [
      { pct: '25%', text: 'Membuka lemari arsip Dalldorf 1920...' },
      { pct: '55%', text: 'Menyiapkan mikroskop dan spesimen darah...' },
      { pct: '85%', text: 'Mengumpulkan berkas silsilah dinasti Romanov...' },
      { pct: '100%', text: 'Penyelidikan Forensik Siap!' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        bar.style.width = steps[currentStep].pct;
        statusText.textContent = steps[currentStep].text;
        soundFX.typeKey();
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          switchScreen('screen-beranda');
          showToast(`Selamat datang di Kriminalpolizei Berlin, ${state.detectiveName}!`);
        }, 500);
      }
    }, 550);
  }

  // Typewriter Dialogue Effect
  function showDialogue(index) {
    if (index < 0 || index >= dialogues.length) return;
    state.dialogueIndex = index;
    const data = dialogues[index];

    const dialogueText = document.getElementById('dialogue-text');
    const counter = document.getElementById('dialogue-counter');
    const btnPrev = document.getElementById('btn-dialogue-prev');
    const btnNext = document.getElementById('btn-dialogue-next');
    const btnStartStages = document.getElementById('btn-start-stages');

    counter.textContent = `Langkah ${index + 1} dari ${dialogues.length}`;

    btnPrev.disabled = (index === 0);
    btnPrev.classList.toggle('disabled', index === 0);

    if (index === dialogues.length - 1) {
      btnNext.classList.add('hidden');
      btnStartStages.classList.remove('hidden');
    } else {
      btnNext.classList.remove('hidden');
      btnStartStages.classList.add('hidden');
    }

    // Typewriter effect
    if (state.typewriterTimer) clearInterval(state.typewriterTimer);
    dialogueText.textContent = '';
    state.isTyping = true;
    let charIndex = 0;
    const fullText = data.text;

    state.typewriterTimer = setInterval(() => {
      if (charIndex < fullText.length) {
        dialogueText.textContent += fullText.charAt(charIndex);
        if (charIndex % 3 === 0) soundFX.typeKey();
        charIndex++;
      } else {
        clearInterval(state.typewriterTimer);
        state.isTyping = false;
      }
    }, 22);

    // Update floating helper preview
    updateFloatingHelperTip(data.tip);
  }

  function completeTypingInstantly() {
    if (state.isTyping && state.typewriterTimer) {
      clearInterval(state.typewriterTimer);
      state.isTyping = false;
      const dialogueText = document.getElementById('dialogue-text');
      dialogueText.textContent = dialogues[state.dialogueIndex].text;
    }
  }

  // Stage Switcher
  function goToStage(stageNum) {
    const num = parseInt(stageNum, 10);
    if (isNaN(num) || num < 1 || num > 6) return;

    state.currentStage = num;

    // Update tab bar
    document.querySelectorAll('.stage-nav-btn').forEach(btn => {
      const btnStage = parseInt(btn.getAttribute('data-stage'), 10);
      btn.classList.toggle('active', btnStage === num);
    });

    // Update panels
    for (let i = 1; i <= 6; i++) {
      const panel = document.getElementById(`stage-panel-${i}`);
      if (panel) {
        panel.classList.toggle('hidden', i !== num);
        panel.classList.toggle('active', i === num);
      }
    }

    // If entering stage 6 (courtroom), refresh reviewed notes
    if (num === 6) {
      renderCourtReviewNotes();
    }

    // Update helper hint
    if (stageHints[num]) {
      updateFloatingHelperTip(stageHints[num]);
    }

    const statStage = document.getElementById('stat-stage');
    if (statStage) statStage.textContent = `Tahap ${num}`;

    soundFX.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Save notes from user inputs (Keep as requested, no right/wrong judgment)
  function saveStageNotes(stageNum) {
    const textarea = document.getElementById(`input-stage-${stageNum}`);
    if (textarea) {
      const content = textarea.value.trim();
      state.notes[stageNum] = content;
      try {
        localStorage.setItem('lumocase_notes', JSON.stringify(state.notes));
      } catch (e) {}

      soundFX.saveStamp();
      showToast(`✓ Catatan Tahap ${stageNum} berhasil disimpan ke Berkas!`);
      
      const statusSpan = document.getElementById(`status-stage-${stageNum}`);
      if (statusSpan) {
        statusSpan.textContent = '✓ Catatan tersimpan di berkas resmi';
        statusSpan.style.color = '#34d399';
      }
    }
  }

  // Populate Review Notes in Stage 6
  function renderCourtReviewNotes() {
    for (let i = 1; i <= 5; i++) {
      const noteEl = document.getElementById(`review-note-${i}`);
      if (noteEl) {
        const text = state.notes[i] && state.notes[i].trim().length > 0
          ? state.notes[i]
          : '— (Detektif melanjutkan tahap ini tanpa meninggalkan catatan tertulis) —';
        noteEl.textContent = text;
      }
    }
  }

  // Floating helper bubble controller
  function updateFloatingHelperTip(tipText) {
    const bubble = document.getElementById('helper-bubble');
    const bubbleText = document.getElementById('helper-bubble-text');
    if (bubbleText) bubbleText.textContent = tipText;
    if (bubble) bubble.classList.remove('hidden');
  }

  // Courtroom Sequence & Gavel Strikes
  function handleReadClosingStatement() {
    soundFX.click();
    const actionBox = document.getElementById('court-read-action');
    const statementCard = document.getElementById('closing-statement-container');
    const gavelIcon = document.getElementById('gavel-icon');
    const gavelWords = document.getElementById('gavel-words');
    const decree = document.getElementById('judge-decree');
    const btnAward = document.getElementById('btn-claim-award');

    actionBox.classList.add('hidden');
    statementCard.classList.remove('hidden');
    statementCard.scrollIntoView({ behavior: 'smooth' });

    // Trigger sequential Gavel Bang animation & sound
    setTimeout(() => {
      if (gavelIcon) gavelIcon.classList.add('gavel-striking');

      const knocks = gavelWords ? gavelWords.querySelectorAll('.knock-word') : [];
      knocks.forEach((kw, idx) => {
        setTimeout(() => {
          kw.classList.add('visible');
          soundFX.gavelBang();
        }, (idx + 1) * 550);
      });

      setTimeout(() => {
        if (decree) decree.classList.add('visible');
        if (btnAward) btnAward.classList.remove('hidden');
        showToast('⚖️ Putusan Pengadilan: Gugatan Anna Anderson Ditolak!');
      }, 2400);
    }, 1200);
  }

  // Claim Award & Show Certificate
  function handleClaimAward() {
    soundFX.awardFanfare();
    const certWrap = document.getElementById('award-certificate-container');
    if (certWrap) {
      certWrap.classList.remove('hidden');
      certWrap.scrollIntoView({ behavior: 'smooth' });
    }
    showToast('🏆 Selamat! Anda meraih gelar MASTER OF DETECTIVE!');
  }

  // ==========================================
  // EVENT LISTENERS INITIALIZATION
  // ==========================================
  function initEvents() {
    // Audio toggles
    const btnMusic = document.getElementById('btn-toggle-music');
    const musicIcon = document.getElementById('music-icon');
    const musicLabel = document.getElementById('music-label');
    const audioWave = document.getElementById('audio-wave');

    if (btnMusic) {
      btnMusic.addEventListener('click', () => {
        initAudioContext();
        state.audioEnabled = !state.audioEnabled;
        btnMusic.classList.toggle('active', state.audioEnabled);
        if (state.audioEnabled) {
          startBgm();
          musicLabel.textContent = 'Musik: HIDUP';
          musicIcon.textContent = '🎶';
          audioWave.classList.remove('hidden');
          showToast('🎵 Musik latar jazz noir 1920 aktif');
        } else {
          stopBgm();
          musicLabel.textContent = 'Musik: MATI';
          musicIcon.textContent = '🎵';
          audioWave.classList.add('hidden');
          showToast('Musik latar dinonaktifkan');
        }
      });
    }

    const btnSfx = document.getElementById('btn-toggle-sfx');
    const sfxLabel = document.getElementById('sfx-label');
    if (btnSfx) {
      btnSfx.addEventListener('click', () => {
        initAudioContext();
        state.sfxEnabled = !state.sfxEnabled;
        btnSfx.classList.toggle('active', state.sfxEnabled);
        sfxLabel.textContent = state.sfxEnabled ? 'SFX: AKTIF' : 'SFX: MATI';
        showToast(state.sfxEnabled ? '🔊 Efek suara aktif' : 'Efek suara dimatikan');
        soundFX.click();
      });
    }

    // Cover Start Button
    const btnStart = document.getElementById('btn-start-investigation');
    if (btnStart) {
      btnStart.addEventListener('click', handleCoverStart);
    }

    // Profile Save Button
    const btnSaveProfile = document.getElementById('btn-save-profile');
    const inputName = document.getElementById('detective-name-input');
    if (btnSaveProfile && inputName) {
      btnSaveProfile.addEventListener('click', () => {
        const val = inputName.value.trim();
        if (val) {
          state.detectiveName = val;
          try {
            localStorage.setItem('lumocase_detective_name', val);
          } catch (e) {}
          updateDetectiveNameUI();
          soundFX.saveStamp();
          showToast(`Lencana diperbarui: ${val}`);
        }
      });
    }

    // Play button in Dashboard & Open Case 1
    const btnPlayNow = document.getElementById('btn-play-now');
    const btnOpenCase1 = document.getElementById('btn-open-case-1');
    const startCaseFlow = () => {
      initAudioContext();
      soundFX.click();
      switchScreen('screen-briefing');
      showDialogue(0);
    };

    if (btnPlayNow) btnPlayNow.addEventListener('click', startCaseFlow);
    if (btnOpenCase1) btnOpenCase1.addEventListener('click', startCaseFlow);

    // Locked Case 2 Click
    const btnLockedCase = document.getElementById('btn-locked-case-2');
    const cardCase2 = document.getElementById('card-case-2');
    const lockedModal = document.getElementById('locked-case-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');

    const triggerLockedModal = () => {
      soundFX.click();
      if (lockedModal) lockedModal.classList.remove('hidden');
    };

    if (btnLockedCase) btnLockedCase.addEventListener('click', triggerLockedModal);
    if (cardCase2) cardCase2.addEventListener('click', triggerLockedModal);
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => {
        soundFX.click();
        if (lockedModal) lockedModal.classList.add('hidden');
      });
    }

    // Back to Beranda Button
    const btnBackBeranda = document.getElementById('btn-back-to-beranda');
    if (btnBackBeranda) {
      btnBackBeranda.addEventListener('click', () => {
        switchScreen('screen-beranda');
      });
    }

    // Dialogue Navigation
    const btnDiagNext = document.getElementById('btn-dialogue-next');
    const btnDiagPrev = document.getElementById('btn-dialogue-prev');
    const btnDiagSkip = document.getElementById('btn-dialogue-skip');
    const btnStartStages = document.getElementById('btn-start-stages');

    if (btnDiagNext) {
      btnDiagNext.addEventListener('click', () => {
        if (state.isTyping) {
          completeTypingInstantly();
        } else {
          showDialogue(state.dialogueIndex + 1);
        }
      });
    }

    if (btnDiagPrev) {
      btnDiagPrev.addEventListener('click', () => {
        showDialogue(state.dialogueIndex - 1);
      });
    }

    if (btnDiagSkip) {
      btnDiagSkip.addEventListener('click', () => {
        soundFX.click();
        switchScreen('screen-investigation');
        goToStage(1);
      });
    }

    if (btnStartStages) {
      btnStartStages.addEventListener('click', () => {
        soundFX.click();
        switchScreen('screen-investigation');
        goToStage(1);
      });
    }

    // Stage Tab Navigation
    document.querySelectorAll('.stage-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const stageNum = btn.getAttribute('data-stage');
        goToStage(stageNum);
      });
    });

    // Save notes button on each stage (Tahap 1 to 5)
    for (let i = 1; i <= 5; i++) {
      const btnSave = document.getElementById(`btn-save-stage-${i}`);
      if (btnSave) {
        btnSave.addEventListener('click', () => {
          saveStageNotes(i);
          const nextStage = btnSave.getAttribute('data-next-stage');
          if (nextStage) {
            goToStage(nextStage);
          }
        });
      }

      // Populate textareas with existing state notes
      const textarea = document.getElementById(`input-stage-${i}`);
      if (textarea && state.notes[i]) {
        textarea.value = state.notes[i];
      }
    }

    // Courtroom Closing Statement & Gavel
    const btnReadCourt = document.getElementById('btn-read-closing-statement');
    if (btnReadCourt) {
      btnReadCourt.addEventListener('click', handleReadClosingStatement);
    }

    // Claim Award Button
    const btnAward = document.getElementById('btn-claim-award');
    if (btnAward) {
      btnAward.addEventListener('click', handleClaimAward);
    }

    // Certificate Print & Restart
    const btnPrint = document.getElementById('btn-print-certificate');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }

    const btnRestart = document.getElementById('btn-restart-investigation');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        soundFX.click();
        switchScreen('screen-beranda');
      });
    }

    const btnReviewCase = document.getElementById('btn-review-case');
    if (btnReviewCase) {
      btnReviewCase.addEventListener('click', () => {
        soundFX.click();
        goToStage(1);
      });
    }

    // Floating helper widget
    const btnHelperMascot = document.getElementById('btn-helper-mascot');
    const helperBubble = document.getElementById('helper-bubble');
    const btnCloseHelper = document.getElementById('btn-close-helper');

    if (btnHelperMascot && helperBubble) {
      btnHelperMascot.addEventListener('click', () => {
        soundFX.click();
        helperBubble.classList.toggle('hidden');
      });
    }

    if (btnCloseHelper && helperBubble) {
      btnCloseHelper.addEventListener('click', () => {
        helperBubble.classList.add('hidden');
      });
    }

    // Initial UI Setup
    updateDetectiveNameUI();
  }

  // DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEvents);
  } else {
    initEvents();
  }

})();
