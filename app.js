/**
 * SeeChart — Live Stage Sheet & Chord Viewer
 * Single-Page Application (Vanilla JavaScript)
 * Author: Antigravity
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. MUSIC THEORY & CHORD ENGINE
     ========================================================================== */

  const CHROMATIC_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const CHROMATIC_FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  // Map equivalent note names to index (0-11)
  const NOTE_TO_INDEX = {
    'C': 0, 'B#': 0,
    'C#': 1, 'Db': 1,
    'D': 2,
    'D#': 3, 'Eb': 3,
    'E': 4, 'Fb': 4,
    'F': 5, 'E#': 5,
    'F#': 6, 'Gb': 6,
    'G': 7,
    'G#': 8, 'Ab': 8,
    'A': 9,
    'A#': 10, 'Bb': 10,
    'B': 11, 'Cb': 11
  };

  // Regular expression to match chords
  // e.g., C, Am, F#m7, Bbsus4, C/E, G#dim7, Fmaj7, Dadd9, Asus2, Gm/Bb
  const CHORD_REGEX = /^[A-G](?:#|b)?(?:m|min|maj|M|dim|aug|sus|add)?[0-9]*(?:#5|b5|#9|b9|#11|b13)?(?:sus[24])?(?:add[29])?(?:\/[A-G](?:#|b)?)?$/;
  const CHORD_TOKEN_REGEX = /\b[A-G](?:#|b)?(?:m|min|maj|M|dim|aug|sus|add)?[0-9]*(?:#5|b5|#9|b9|#11|b13)?(?:sus[24])?(?:add[29])?(?:\/[A-G](?:#|b)?)?\b/g;

  // Single chord parser regex to break into root, suffix, bass
  const SINGLE_CHORD_DECOMPOSE = /^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/;

  /**
   * Transpose a single chord by semitoneOffset
   * @param {string} chord
   * @param {number} semitoneOffset
   * @param {string} accidentalPreference '#' or 'b'
   * @returns {string} transposed chord
   */
  function transposeChord(chord, semitoneOffset, accidentalPreference = '#') {
    if (!chord) return chord;
    const match = chord.match(SINGLE_CHORD_DECOMPOSE);
    if (!match) return chord;

    const [, root, suffix, bass] = match;
    const scale = accidentalPreference === 'b' ? CHROMATIC_FLATS : CHROMATIC_SHARPS;

    // Transpose root
    let newRoot = root;
    if (NOTE_TO_INDEX[root] !== undefined) {
      let idx = (NOTE_TO_INDEX[root] + semitoneOffset) % 12;
      if (idx < 0) idx += 12;
      newRoot = scale[idx];
    }

    // Transpose bass if slash chord (e.g. C/E -> C#/F)
    let newBass = '';
    if (bass) {
      if (NOTE_TO_INDEX[bass] !== undefined) {
        let bIdx = (NOTE_TO_INDEX[bass] + semitoneOffset) % 12;
        if (bIdx < 0) bIdx += 12;
        newBass = '/' + scale[bIdx];
      } else {
        newBass = '/' + bass;
      }
    }

    return `${newRoot}${suffix || ''}${newBass}`;
  }

  /**
   * Calculate notes in a chord for keyboard/piano voicing visualizer
   */
  function getChordNotesAndFormula(chord) {
    const match = chord.match(SINGLE_CHORD_DECOMPOSE);
    if (!match) return { notes: [chord], formula: 'Custom' };

    const [, root, suffix] = match;
    const rootIdx = NOTE_TO_INDEX[root] !== undefined ? NOTE_TO_INDEX[root] : 0;
    const cleanSuffix = (suffix || '').toLowerCase();

    let intervals = [0, 4, 7]; // Major triad default
    let formulaName = 'Major (1 - 3 - 5)';

    if (cleanSuffix === 'm' || cleanSuffix === 'min') {
      intervals = [0, 3, 7];
      formulaName = 'Minor (1 - b3 - 5)';
    } else if (cleanSuffix === '7') {
      intervals = [0, 4, 7, 10];
      formulaName = 'Dominant 7th (1 - 3 - 5 - b7)';
    } else if (cleanSuffix === 'maj7' || cleanSuffix === 'm7' && suffix.startsWith('M')) {
      intervals = [0, 4, 7, 11];
      formulaName = 'Major 7th (1 - 3 - 5 - 7)';
    } else if (cleanSuffix === 'm7') {
      intervals = [0, 3, 7, 10];
      formulaName = 'Minor 7th (1 - b3 - 5 - b7)';
    } else if (cleanSuffix === 'sus4') {
      intervals = [0, 5, 7];
      formulaName = 'Suspended 4th (1 - 4 - 5)';
    } else if (cleanSuffix === 'sus2') {
      intervals = [0, 2, 7];
      formulaName = 'Suspended 2nd (1 - 2 - 5)';
    } else if (cleanSuffix === 'dim' || cleanSuffix === 'dim7') {
      intervals = [0, 3, 6, 9];
      formulaName = 'Diminished 7th (1 - b3 - b5 - bb7)';
    } else if (cleanSuffix === 'aug') {
      intervals = [0, 4, 8];
      formulaName = 'Augmented (1 - 3 - #5)';
    } else if (cleanSuffix === 'add9') {
      intervals = [0, 4, 7, 14];
      formulaName = 'Add 9 (1 - 3 - 5 - 9)';
    }

    const notes = intervals.map(semitones => {
      const noteIdx = (rootIdx + semitones) % 12;
      return CHROMATIC_SHARPS[noteIdx];
    });

    return { notes, formula: formulaName, intervals, rootIdx };
  }

  /**
   * Guitar Chord Voicings Database [E, A, D, G, B, e]
   * -1 = muted (X), 0 = open (O), 1-12 = fret number
   */
  const GUITAR_CHORD_DB = {
    // Standard Major Chords
    'C': { frets: [-1, 3, 2, 0, 1, 0], baseFret: 1 },
    'C#': { frets: [-1, 4, 6, 6, 6, 4], baseFret: 4 },
    'Db': { frets: [-1, 4, 6, 6, 6, 4], baseFret: 4 },
    'D': { frets: [-1, -1, 0, 2, 3, 2], baseFret: 1 },
    'D#': { frets: [-1, 6, 8, 8, 8, 6], baseFret: 6 },
    'Eb': { frets: [-1, 6, 8, 8, 8, 6], baseFret: 6 },
    'E': { frets: [0, 2, 2, 1, 0, 0], baseFret: 1 },
    'F': { frets: [1, 3, 3, 2, 1, 1], baseFret: 1 },
    'F#': { frets: [2, 4, 4, 3, 2, 2], baseFret: 2 },
    'Gb': { frets: [2, 4, 4, 3, 2, 2], baseFret: 2 },
    'G': { frets: [3, 2, 0, 0, 0, 3], baseFret: 1 },
    'G#': { frets: [4, 6, 6, 5, 4, 4], baseFret: 4 },
    'Ab': { frets: [4, 6, 6, 5, 4, 4], baseFret: 4 },
    'A': { frets: [-1, 0, 2, 2, 2, 0], baseFret: 1 },
    'A#': { frets: [-1, 1, 3, 3, 3, 1], baseFret: 1 },
    'Bb': { frets: [-1, 1, 3, 3, 3, 1], baseFret: 1 },
    'B': { frets: [-1, 2, 4, 4, 4, 2], baseFret: 2 },

    // Minor Chords
    'Cm': { frets: [-1, 3, 5, 5, 4, 3], baseFret: 3 },
    'C#m': { frets: [-1, 4, 6, 6, 5, 4], baseFret: 4 },
    'Dbm': { frets: [-1, 4, 6, 6, 5, 4], baseFret: 4 },
    'Dm': { frets: [-1, -1, 0, 2, 3, 1], baseFret: 1 },
    'D#m': { frets: [-1, 6, 8, 8, 7, 6], baseFret: 6 },
    'Ebm': { frets: [-1, 6, 8, 8, 7, 6], baseFret: 6 },
    'Em': { frets: [0, 2, 2, 0, 0, 0], baseFret: 1 },
    'Fm': { frets: [1, 3, 3, 1, 1, 1], baseFret: 1 },
    'F#m': { frets: [2, 4, 4, 2, 2, 2], baseFret: 2 },
    'Gbm': { frets: [2, 4, 4, 2, 2, 2], baseFret: 2 },
    'Gm': { frets: [3, 5, 5, 3, 3, 3], baseFret: 3 },
    'G#m': { frets: [4, 6, 6, 4, 4, 4], baseFret: 4 },
    'Abm': { frets: [4, 6, 6, 4, 4, 4], baseFret: 4 },
    'Am': { frets: [-1, 0, 2, 2, 1, 0], baseFret: 1 },
    'A#m': { frets: [-1, 1, 3, 3, 2, 1], baseFret: 1 },
    'Bbm': { frets: [-1, 1, 3, 3, 2, 1], baseFret: 1 },
    'Bm': { frets: [-1, 2, 4, 4, 3, 2], baseFret: 2 },

    // 7th & Dominant
    'C7': { frets: [-1, 3, 2, 3, 1, 0], baseFret: 1 },
    'D7': { frets: [-1, -1, 0, 2, 1, 2], baseFret: 1 },
    'E7': { frets: [0, 2, 0, 1, 0, 0], baseFret: 1 },
    'F7': { frets: [1, 3, 1, 2, 1, 1], baseFret: 1 },
    'G7': { frets: [3, 2, 0, 0, 0, 1], baseFret: 1 },
    'A7': { frets: [-1, 0, 2, 0, 2, 0], baseFret: 1 },
    'B7': { frets: [-1, 2, 1, 2, 0, 2], baseFret: 1 },

    // Minor 7ths
    'Am7': { frets: [-1, 0, 2, 0, 1, 0], baseFret: 1 },
    'Bm7': { frets: [-1, 2, 0, 2, 0, 2], baseFret: 1 },
    'Dm7': { frets: [-1, -1, 0, 2, 1, 1], baseFret: 1 },
    'Em7': { frets: [0, 2, 0, 0, 0, 0], baseFret: 1 },
    'F#m7': { frets: [2, 4, 2, 2, 2, 2], baseFret: 2 },

    // Maj 7ths & Add & Sus
    'Cmaj7': { frets: [-1, 3, 2, 0, 0, 0], baseFret: 1 },
    'Fmaj7': { frets: [-1, -1, 3, 2, 1, 0], baseFret: 1 },
    'Gmaj7': { frets: [3, 2, 0, 0, 0, 2], baseFret: 1 },
    'Cadd9': { frets: [-1, 3, 2, 0, 3, 0], baseFret: 1 },
    'Dsus4': { frets: [-1, -1, 0, 2, 3, 3], baseFret: 1 },
    'Asus4': { frets: [-1, 0, 2, 2, 3, 0], baseFret: 1 },
    'Esus4': { frets: [0, 2, 2, 2, 0, 0], baseFret: 1 }
  };

  /**
   * Resolve guitar chord voicing data or calculate barre fallback
   */
  function getGuitarChordData(chordName) {
    if (GUITAR_CHORD_DB[chordName]) {
      return GUITAR_CHORD_DB[chordName];
    }

    const match = chordName.match(SINGLE_CHORD_DECOMPOSE);
    if (!match) return { frets: [0, 2, 2, 0, 0, 0], baseFret: 1 };

    const [, root, suffix] = match;
    const cleanSuffix = (suffix || '').toLowerCase();
    const rootIdx = NOTE_TO_INDEX[root] !== undefined ? NOTE_TO_INDEX[root] : 0;

    // Calculate Barre shape from E-string (root on 6th string: E=0, F=1, F#=2, G=3, G#=4, A=5, A#=6, B=7, C=8, C#=9, D=10, D#=11)
    let fretPos = (rootIdx - 4);
    if (fretPos <= 0) fretPos += 12;

    const isMinor = cleanSuffix.includes('m') && !cleanSuffix.includes('maj');
    const is7 = cleanSuffix.includes('7');

    if (isMinor) {
      return {
        frets: [fretPos, fretPos + 2, fretPos + 2, fretPos, fretPos, fretPos],
        baseFret: fretPos
      };
    } else {
      return {
        frets: [fretPos, fretPos + 2, fretPos + 2, fretPos + 1, fretPos, fretPos],
        baseFret: fretPos
      };
    }
  }

  /**
   * Generate crisp SVG for guitar chord diagram
   */
  function generateGuitarChordSVG(chordName) {
    const chordData = getGuitarChordData(chordName);
    const frets = chordData.frets;
    const baseFret = chordData.baseFret || 1;

    // SVG Layout parameters
    const svgWidth = 180;
    const svgHeight = 210;
    const startX = 35;
    const stringSpacing = 22; // 6 strings: x = 35, 57, 79, 101, 123, 145
    const startY = 48;
    const fretSpacing = 32;   // 4 fret spaces: y = 48, 80, 112, 144, 176

    let svg = `<svg class="guitar-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;

    // Nut / Top bar
    if (baseFret === 1) {
      svg += `<line x1="${startX - 2}" y1="${startY}" x2="${startX + stringSpacing * 5 + 2}" y2="${startY}" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round"/>`;
    } else {
      svg += `<line x1="${startX}" y1="${startY}" x2="${startX + stringSpacing * 5}" y2="${startY}" stroke="#475569" stroke-width="2"/>`;
      svg += `<text x="${startX - 18}" y="${startY + 24}" fill="var(--chord-color)" font-family="var(--font-sheet)" font-size="12" font-weight="800">fr ${baseFret}</text>`;
    }

    // Horizontal Fret Lines (4 fret spaces = 5 horizontal lines)
    for (let f = 1; f <= 4; f++) {
      const y = startY + f * fretSpacing;
      svg += `<line x1="${startX}" y1="${y}" x2="${startX + stringSpacing * 5}" y2="${y}" stroke="#334155" stroke-width="1.5"/>`;
    }

    // Vertical String Lines (6 strings)
    for (let s = 0; s < 6; s++) {
      const x = startX + s * stringSpacing;
      svg += `<line x1="${x}" y1="${startY}" x2="${x}" y2="${startY + 4 * fretSpacing}" stroke="#64748b" stroke-width="1.5"/>`;
    }

    // String Markers & Finger Dots
    for (let s = 0; s < 6; s++) {
      const fret = frets[s];
      const x = startX + s * stringSpacing;

      if (fret === -1) {
        // Muted string (X)
        svg += `<text x="${x}" y="${startY - 12}" fill="#ef4444" font-family="var(--font-sheet)" font-size="13" font-weight="800" text-anchor="middle">✕</text>`;
      } else if (fret === 0) {
        // Open string (O)
        svg += `<circle cx="${x}" cy="${startY - 15}" r="4" fill="none" stroke="#22d3ee" stroke-width="2"/>`;
      } else {
        // Fretted Note Circle
        // Calculate relative fret offset from baseFret
        const relFret = fret - baseFret + 1;
        if (relFret >= 1 && relFret <= 4) {
          const cy = startY + (relFret - 0.5) * fretSpacing;
          svg += `<circle cx="${x}" cy="${cy}" r="7.5" fill="var(--chord-color)" filter="drop-shadow(0 0 5px var(--chord-glow))"/>`;
        }
      }
    }

    svg += `</svg>`;
    return svg;
  }


  /* ==========================================================================
     2. RAW CHORD TEXT PARSER (Chordtela & Ultimate Guitar Compatible)
     ========================================================================== */

  const SECTION_HEADER_REGEX = /^\s*(?:\[([^\]]+)\]|([A-Za-z0-9\s]{2,18}):)\s*$/;
  const COMMON_SECTION_WORDS = [
    'intro', 'verse', 'chorus', 'reff', 'refrain', 'bridge', 'interlude',
    'solo', 'guitar solo', 'outro', 'coda', 'pre-chorus', 'ending', 'bait',
    'musik', 'tab', 'melody', 'hook'
  ];

  /**
   * Determine whether a line is a chord line or lyric line
   * @param {string} line
   * @returns {boolean}
   */
  function isChordLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // Check if line looks like guitar tab (e.g. e|---0---|)
    if (/^[eBGDAE]\|/i.test(trimmed) || trimmed.includes('|--') || trimmed.includes('--|')) {
      return false;
    }

    // Split line into word tokens
    const tokens = trimmed.split(/\s+/);
    if (tokens.length === 0) return false;

    let validChordsCount = 0;
    for (const token of tokens) {
      // Strip brackets if written like [C] or (C)
      const cleanToken = token.replace(/^[\[\(]/, '').replace(/[\]\)]$/, '');
      if (CHORD_REGEX.test(cleanToken)) {
        validChordsCount++;
      }
    }

    // If at least 65% of tokens are valid chords, or if it has only 1-2 tokens that are pure chords
    const ratio = validChordsCount / tokens.length;
    if (ratio >= 0.6) return true;
    if (tokens.length <= 2 && validChordsCount >= 1 && tokens.every(t => t.length <= 6)) return true;

    return false;
  }

  /**
   * Parse a raw chord line into positions and chord tokens
   * preserving exact whitespace columns
   */
  function parseChordTokensWithPositions(line) {
    const tokens = [];
    const regex = /\S+/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      tokens.push({
        text: match[0],
        index: match.index,
        length: match[0].length,
        isChord: CHORD_REGEX.test(match[0])
      });
    }

    return tokens;
  }

  /**
   * Transpose a parsed chord line while preserving column alignment
   */
  function transposeChordLineWithAlignment(line, semitoneOffset, accidentalPref) {
    if (semitoneOffset === 0) return line;

    const tokens = parseChordTokensWithPositions(line);
    if (tokens.length === 0) return line;

    let result = '';
    let lastOriginalIndex = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      // Append whitespace before this token
      const spaceCount = Math.max(0, token.index - lastOriginalIndex);
      result += ' '.repeat(spaceCount);

      const transposedText = token.isChord
        ? transposeChord(token.text, semitoneOffset, accidentalPref)
        : token.text;

      result += transposedText;
      lastOriginalIndex = token.index + token.length;

      // Adjust space before the next token to avoid column drift
      if (i < tokens.length - 1) {
        const nextToken = tokens[i + 1];
        const originalSpacing = nextToken.index - (token.index + token.length);
        const lenDiff = transposedText.length - token.length;
        const adjustedSpacing = Math.max(1, originalSpacing - lenDiff);

        result += ' '.repeat(adjustedSpacing);
        lastOriginalIndex = nextToken.index;
      }
    }

    return result;
  }

  /**
   * Full document parser
   * Returns array of structured line objects
   */
  function parseSongContent(rawText) {
    const lines = rawText.split(/\r?\n/);
    const parsedLines = [];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Empty Line
      if (!trimmed) {
        parsedLines.push({ type: 'empty', raw: '' });
        i++;
        continue;
      }

      // 2. Section Header e.g. [Intro], [Chorus], Verse 1:
      const sectionMatch = trimmed.match(SECTION_HEADER_REGEX);
      if (sectionMatch) {
        const title = sectionMatch[1] || sectionMatch[2];
        parsedLines.push({ type: 'section', title: title.trim(), raw: line });
        i++;
        continue;
      }

      // Check section without brackets if alone (e.g. "Intro :" or "Chorus")
      const lowerTrimmed = trimmed.toLowerCase().replace(/[:\s]+$/, '');
      if (COMMON_SECTION_WORDS.includes(lowerTrimmed)) {
        parsedLines.push({ type: 'section', title: trimmed.replace(/[:]+$/, '').trim(), raw: line });
        i++;
        continue;
      }

      // 3. Guitar Tab Line (e.g. e|---0---2---|)
      if (/^[eBGDAE]\|/i.test(trimmed) || (trimmed.includes('|--') && trimmed.includes('--|'))) {
        parsedLines.push({ type: 'tab', text: line, raw: line });
        i++;
        continue;
      }

      // 4. Comment / Direction line (e.g., // Capo di fret 2, (Overtone))
      if (trimmed.startsWith('//') || trimmed.startsWith('#') || (trimmed.startsWith('(') && trimmed.endsWith(')'))) {
        parsedLines.push({ type: 'comment', text: trimmed, raw: line });
        i++;
        continue;
      }

      // 5. Chord Line vs Lyric Line
      if (isChordLine(line)) {
        const chordLine = line;
        // Look ahead to check if the next line is lyrics
        const nextLine = (i + 1 < lines.length) ? lines[i + 1] : null;

        if (nextLine !== null && nextLine.trim() && !isChordLine(nextLine) && !nextLine.trim().match(SECTION_HEADER_REGEX)) {
          // It's a Chord + Lyric Pair!
          parsedLines.push({
            type: 'pair',
            chords: chordLine,
            lyrics: nextLine,
            rawChords: chordLine,
            rawLyrics: nextLine
          });
          i += 2;
        } else {
          // Standalone chord line (e.g. In an Intro or Instrumental where there are no lyrics)
          parsedLines.push({
            type: 'chords_only',
            chords: chordLine,
            rawChords: chordLine
          });
          i++;
        }
        continue;
      }

      // 6. Standalone Lyric line
      parsedLines.push({
        type: 'lyrics_only',
        lyrics: line,
        rawLyrics: line
      });
      i++;
    }

    return parsedLines;
  }

  /**
   * Helper to auto-clean ads and garbage from Chordtela / Ultimate Guitar text
   */
  function cleanRawChords(raw) {
    let text = raw;
    // Remove Chordtela ad patterns
    text = text.replace(/Chord Kunci Gitar Terkait:[\s\S]*$/gi, '');
    text = text.replace(/Lihat semua chord dari:[^\n]*/gi, '');
    text = text.replace(/https?:\/\/[^\s]+/gi, '');
    text = text.replace(/Capo di fret \d+/gi, function (match) {
      return `// ${match}`;
    });
    // Replace tabs with 4 spaces for consistent monospace alignment
    text = text.replace(/\t/g, '    ');
    return text.trim();
  }


  /* ==========================================================================
     3. DEFAULT SAMPLE SONGS (Classic Hits for Live Gigs)
     ========================================================================== */

  const DEFAULT_SONGS = [
    {
      id: 'dewa19-kangen',
      title: 'Kangen',
      artist: 'Dewa 19',
      key: 'D',
      tempo: 82,
      capo: 'Tanpa Capo',
      notes: 'Keyboard: Intro Rhodes + Delay di bait 1. Reff kedua drum masuk full. Ending fade out bareng bass.',
      rawText: `[Intro]
D  F#m  G  A
D  F#m  G  A

[Verse 1]
D             F#m
Kutrima suratmu
G                 A
Telah kubaca dan aku mengerti
D             F#m
Betapa merindunya
G                 A
Dirimu akan hadirnya diriku
Bm           F#m
Di dalam hari-harimu
G              Em
Bersama lagi...

[Verse 2]
D             F#m
Kau tanyakan padaku
G                 A
Kapan aku akan kembali lagi
D             F#m
Katamu kau tak kuasa
G                 A
Lagi sendiri memikul beban ini
Bm           F#m
Di dalam hari-harimu
G              A
Bersama lagi...

[Chorus]
D         F#m       G
Semua kata rindumu semakin membuatku
A
Tak berdaya
D         F#m       G
Menahan rasa ingin jumpa
Bm        F#m       G
Percayalah padaku akupun rindu kamu
Em           A
Ku akan segera kembali
G           A          D
Semoga kita dapat bersama lagi...

[Interlude]
D  F#m  G  A
D  F#m  G  A

[Bridge]
Bm         F#m
Jangan layukan bunga
G              Em
Di dalam hatimu kasih
Bm         F#m
Ku kan datang menyiraminya
G                A
Dengan cinta yang suci...

[Chorus]
D         F#m       G
Semua kata rindumu semakin membuatku
A
Tak berdaya
D         F#m       G
Menahan rasa ingin jumpa
Bm        F#m       G
Percayalah padaku akupun rindu kamu
Em           A
Ku akan segera kembali
G           A          D
Semoga kita dapat bersama lagi...

[Outro]
D  F#m  G  A
D`
    },
    {
      id: 'sheilaon7-dan',
      title: 'Dan',
      artist: 'Sheila on 7',
      key: 'C',
      tempo: 96,
      capo: 'Tanpa Capo',
      notes: 'Tempo ballad 96 BPM. Vokal masuk lembut. Reff kedua semua instrumen masuk full power.',
      rawText: `[Intro]
C  Em  F  Fm
C  Em  F  G

[Verse 1]
C            Em
Dan... bila esok
F             Fm
Datang kembali
C            Em
Seperti sedia kala
F             G
Dimana kau bisa bercanda

[Verse 2]
C            Em
Dan... perlahan kaupun
F             Fm
Lupakan aku
C            Em
Mimpi burukmu
F             G
Dimana t'lah kutancapkan duri tajam
Dm          Em
Kaupun menangis
F           G
Menangis sedih
Dm          Em
Maafkan aku...

[Chorus]
C              Em
Dan... bukan maksudku
F              Fm
Bukan inginku tuk melukaimu
C              Em
Ajarkan aku tuk jadi
F              G
Lelaki yang terbaik untukmu

[Interlude]
C  Em  F  Fm

[Verse 3]
C            Em
Caci maki saja diriku
F             Fm
Bila itu bisa membuatmu
C            Em
Kembali tersenyum
F             G
Dan melupakan luka lama

[Chorus]
C              Em
Dan... bukan maksudku
F              Fm
Bukan inginku tuk melukaimu
C              Em
Ajarkan aku tuk jadi
F              G
Lelaki yang terbaik untukmu

[Outro]
C  Em  F  Fm
C`
    },
    {
      id: 'andra-sempurna',
      title: 'Sempurna',
      artist: 'Andra and The Backbone',
      key: 'E',
      tempo: 76,
      capo: 'Tanpa Capo',
      notes: 'Gitar akustik petikan intro. Keyboard pad tebal di chorus. Solo di bridge.',
      rawText: `[Intro]
E  G#m  A  B
E  G#m  A  B

[Verse 1]
E            G#m
Kau begitu sempurna
A                   B
Di mataku kau begitu indah
E            G#m
Kau membuat diriku
A                   B
Akan selalu memujamu

[Verse 2]
C#m               G#m
Disetiap langkahku
A                 B
Ku kan selalu memikirkan dirimu
C#m               G#m
Tak bisa kubayangkan
A                 B
Hidupku tanpa cintamu

[Chorus]
E            G#m
Janganlah kau pernah hancurkan
A            B
Semua mimpi-mimpi indahku
E            G#m
Kau adalah darahku
A            B
Kau adalah nafasku
C#m          G#m
Kau yang selalu menghiasi
A            B         E
Hari-hariku selalu...

[Interlude]
E  G#m  A  B

[Bridge]
F#m          G#m
Kuingin kau tahu
A            B
Kau sangat berharga
F#m          G#m
Di dalam hidupku
A            B
Kau begitu sempurna...

[Chorus]
E            G#m
Janganlah kau pernah hancurkan
A            B
Semua mimpi-mimpi indahku
E            G#m
Kau adalah darahku
A            B
Kau adalah nafasku
C#m          G#m
Kau yang selalu menghiasi
A            B         E
Hari-hariku selalu...

[Outro]
E  G#m  A  B
E`
    },
    {
      id: 'eagles-hotel-california',
      title: 'Hotel California',
      artist: 'Eagles',
      key: 'Bm',
      tempo: 75,
      capo: 'Capo Fret 2',
      notes: 'Gitar akustik 12-string capo fret 2. Masuk solo duel gitar di outro.',
      rawText: `[Intro]
Bm  F#  A  E
G   D   Em F#

[Verse 1]
Bm                     F#
On a dark desert highway, cool wind in my hair
A                      E
Warm smell of colitas, rising up through the air
G                      D
Up ahead in the distance, I saw a shimmering light
Em
My head grew heavy and my sight grew dim
F#
I had to stop for the night

[Verse 2]
Bm                     F#
There she stood in the doorway, I heard the mission bell
A
And I was thinkin' to myself
E
This could be heaven or this could be hell
G                      D
Then she lit up a candle, and she showed me the way
Em
There were voices down the corridor
F#
I thought I heard them say

[Chorus]
G                      D
Welcome to the Hotel California
Em                     Bm
Such a lovely place, such a lovely face
G                      D
Plenty of room at the Hotel California
Em                     F#
Any time of year, you can find it here

[Solo]
Bm  F#  A  E
G   D   Em F#

[Outro]
Bm  F#  A  E
G   D   Em F#
Bm`
    }
  ];


  /* ==========================================================================
     4. APPLICATION STATE & STORAGE
     ========================================================================== */

  const STORAGE_KEY_SETLIST = 'seechart_setlist_v1';
  const STORAGE_KEY_CUSTOM_SETLISTS = 'seechart_custom_setlists_v1';
  const STORAGE_KEY_PREFS = 'seechart_prefs_v1';

  const AppState = {
    songs: [],
    setlists: [], // Custom setlists: [{ id, name, songIds: [] }]
    activeSetlistId: 'all', // 'all' or setlist id
    activeSongIndex: 0,
    transposeOffset: 0, // semitones (-11 to +11)
    accidentalPref: '#', // '#' or 'b'
    fontSizePx: 20,
    theme: 'theme-amber',
    isAutoScrolling: false,
    autoScrollSpeed: 1.5, // speed multiplier
    scrollRafId: null,
    isStageClean: false,
    isTwoColumns: false,
    chordModalTab: 'guitar', // 'guitar' or 'piano'
    stageTimer: {
      targetMinutes: 45,
      remainingSeconds: 45 * 60,
      isStopwatch: false,
      isRunning: false,
      intervalId: null
    },
    metronome: {
      active: false,
      bpm: 120,
      soundEnabled: false,
      beat: 0,
      intervalId: null,
      audioCtx: null
    }
  };


  /* ==========================================================================
     5. DOM ELEMENT REFERENCES
     ========================================================================== */

  const DOM = {
    // Stage Header
    header: document.getElementById('main-header'),
    headerSongTitle: document.getElementById('header-song-title'),
    headerSongArtist: document.getElementById('header-song-artist'),
    stageClockTime: document.getElementById('stage-clock-time'),
    btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
    btnNewSong: document.getElementById('btn-new-song'),
    btnStageClean: document.getElementById('btn-stage-clean'),
    btnFullscreen: document.getElementById('btn-fullscreen'),
    iconFsEnter: document.getElementById('icon-fs-enter'),
    iconFsExit: document.getElementById('icon-fs-exit'),
    btnShortcutsModal: document.getElementById('btn-shortcuts-modal'),
    btnToggleColumns: document.getElementById('btn-toggle-columns'),

    // Stage Timer
    stageTimerBadge: document.getElementById('stage-timer-badge'),
    stageTimerDisplay: document.getElementById('stage-timer-display'),
    stageTimerPopup: document.getElementById('stage-timer-popup'),
    btnTimerStartPause: document.getElementById('btn-timer-start-pause'),
    btnTimerReset: document.getElementById('btn-timer-reset'),

    // Transpose
    btnTransposeDown: document.getElementById('btn-transpose-down'),
    btnTransposeUp: document.getElementById('btn-transpose-up'),
    btnTransposeReset: document.getElementById('btn-transpose-reset'),
    transposeValueDisplay: document.getElementById('transpose-value'),
    keyIndicator: document.getElementById('key-indicator'),
    btnAccidentalToggle: document.getElementById('btn-accidental-toggle'),
    accidentalModeText: document.getElementById('accidental-mode-text'),

    // Font Size
    btnFontSmaller: document.getElementById('btn-font-smaller'),
    btnFontLarger: document.getElementById('btn-font-larger'),
    fontSizeDisplay: document.getElementById('font-size-display'),

    // Theme Picker
    btnThemePicker: document.getElementById('btn-theme-picker'),
    themeDropdown: document.getElementById('theme-dropdown'),

    // Auto Scroll
    btnAutoScrollToggle: document.getElementById('btn-autoscroll-toggle'),
    scrollSpeedDisplay: document.getElementById('scroll-speed-display'),
    btnSpeedMinus: document.getElementById('btn-speed-minus'),
    btnSpeedPlus: document.getElementById('btn-speed-plus'),
    scrollProgressBar: document.getElementById('scroll-progress-bar'),

    // Floating HUD (Clean Mode)
    floatingHud: document.getElementById('stage-floating-hud'),
    hudExitClean: document.getElementById('hud-exit-clean'),
    hudTransposeDown: document.getElementById('hud-transpose-down'),
    hudTransposeUp: document.getElementById('hud-transpose-up'),
    hudKeyBadge: document.getElementById('hud-key-badge'),
    hudAutoScrollToggle: document.getElementById('hud-autoscroll-toggle'),
    hudScrollIcon: document.getElementById('hud-scroll-icon'),
    hudSpeedDisplay: document.getElementById('hud-speed-display'),
    hudFontDown: document.getElementById('hud-font-down'),
    hudFontUp: document.getElementById('hud-font-up'),

    // Sidebar & Setlists
    setlistSidebar: document.getElementById('setlist-sidebar'),
    sidebarBackdrop: document.getElementById('sidebar-backdrop'),
    btnCloseSidebar: document.getElementById('btn-close-sidebar'),
    setlistItemsContainer: document.getElementById('setlist-items-container'),
    setlistSearchInput: document.getElementById('setlist-search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    btnSidebarAddSong: document.getElementById('btn-sidebar-add-song'),
    btnRestoreSamples: document.getElementById('btn-restore-samples'),
    setlistCount: document.getElementById('setlist-count'),
    btnExportSetlist: document.getElementById('btn-export-setlist'),
    btnImportSetlist: document.getElementById('btn-import-setlist'),
    inputFileImport: document.getElementById('input-file-import'),
    selectActiveSetlist: document.getElementById('select-active-setlist'),
    btnCreateSetlist: document.getElementById('btn-create-setlist'),
    btnEditSetlistSongs: document.getElementById('btn-edit-setlist-songs'),

    // Stage Viewport
    stageViewport: document.getElementById('stage-viewport'),
    stageSongTitle: document.getElementById('stage-song-title'),
    stageSongArtist: document.getElementById('stage-song-artist'),
    stageSongTempo: document.getElementById('stage-song-tempo'),
    stageSongCapo: document.getElementById('stage-song-capo'),
    stageKeyPill: document.getElementById('stage-key-pill'),
    stageTransposeOffset: document.getElementById('stage-transpose-offset'),
    sheetRenderContainer: document.getElementById('sheet-render-container'),
    btnEditCurrentSong: document.getElementById('btn-edit-current-song'),
    btnPrintSheet: document.getElementById('btn-print-sheet'),
    btnJumpTop: document.getElementById('btn-jump-top'),
    stageCueBox: document.getElementById('stage-cue-box'),
    stageCueText: document.getElementById('stage-cue-text'),
    btnEditInlineCue: document.getElementById('btn-edit-inline-cue'),

    // Nav Floater
    btnPrevSong: document.getElementById('btn-prev-song'),
    btnNextSong: document.getElementById('btn-next-song'),
    btnQuickScrollPause: document.getElementById('btn-quick-scroll-pause'),
    quickScrollText: document.getElementById('quick-scroll-text'),

    // Metronome
    btnMetronomeToggle: document.getElementById('btn-metronome-toggle'),
    stageMetronomeBar: document.getElementById('stage-metronome-bar'),
    metroBeatDots: document.getElementById('metro-beat-dots'),
    metroBpmNum: document.getElementById('metro-bpm-num'),
    metroSlider: document.getElementById('metro-slider'),
    btnMetroMinus: document.getElementById('btn-metro-minus'),
    btnMetroPlus: document.getElementById('btn-metro-plus'),
    btnMetroTap: document.getElementById('btn-metro-tap'),
    btnMetroSoundToggle: document.getElementById('btn-metro-sound-toggle'),
    metroSoundLabel: document.getElementById('metro-sound-label'),
    btnMetroClose: document.getElementById('btn-metro-close'),

    // Modal: Song Editor
    modalSongEditor: document.getElementById('modal-song-editor'),
    btnCloseEditor: document.getElementById('btn-close-editor'),
    btnCancelEditor: document.getElementById('btn-cancel-editor'),
    btnSaveSong: document.getElementById('btn-save-song'),
    btnPreviewSong: document.getElementById('btn-preview-song'),
    inputSongTitle: document.getElementById('input-song-title'),
    inputSongArtist: document.getElementById('input-song-artist'),
    inputSongKey: document.getElementById('input-song-key'),
    inputSongTempo: document.getElementById('input-song-tempo'),
    inputSongCapo: document.getElementById('input-song-capo'),
    inputSongNotes: document.getElementById('input-song-notes'),
    rawSongTextarea: document.getElementById('raw-song-textarea'),
    btnPasteClipboard: document.getElementById('btn-paste-clipboard'),
    btnCleanChords: document.getElementById('btn-clean-chords'),
    btnLoadTemplate: document.getElementById('btn-load-template'),
    detectedLinesStat: document.getElementById('detected-lines-stat'),

    // Modal: Shortcuts Help
    modalShortcuts: document.getElementById('modal-shortcuts'),
    btnCloseShortcuts: document.getElementById('btn-close-shortcuts'),
    btnOkShortcuts: document.getElementById('btn-ok-shortcuts'),

    // Modal: Chord Info
    modalChordInfo: document.getElementById('modal-chord-info'),
    btnCloseChordInfo: document.getElementById('btn-close-chord-info'),
    btnDismissChord: document.getElementById('btn-dismiss-chord'),
    modalChordName: document.getElementById('modal-chord-name'),
    chordNotesText: document.getElementById('chord-notes-text'),
    chordFormulaText: document.getElementById('chord-formula-text'),
    tabBtnGuitar: document.getElementById('tab-btn-guitar'),
    tabBtnPiano: document.getElementById('tab-btn-piano'),
    guitarVisualizerWrap: document.getElementById('guitar-visualizer-wrap'),
    pianoVisualizerWrap: document.getElementById('piano-visualizer-wrap'),
    guitarFretboardDisplay: document.getElementById('guitar-fretboard-display'),
    pianoKeysDisplay: document.getElementById('piano-keys-display'),

    // Modal: Custom Setlists
    modalManageSetlists: document.getElementById('modal-manage-setlists'),
    inputSetlistName: document.getElementById('input-setlist-name'),
    btnDeleteCurrentSetlist: document.getElementById('btn-delete-current-setlist'),
    setlistSongsCheckboxes: document.getElementById('setlist-songs-checkboxes'),
    setlistPickerStat: document.getElementById('setlist-picker-stat'),
    btnCloseSetlistModal: document.getElementById('btn-close-setlist-modal'),
    btnCancelSetlistModal: document.getElementById('btn-cancel-setlist-modal'),
    btnSaveSetlistModal: document.getElementById('btn-save-setlist-modal'),

    // Toast Container
    toastContainer: document.getElementById('toast-container')
  };


  /* ==========================================================================
     6. TOAST NOTIFICATION UTILITY
     ========================================================================== */

  function showToast(message, durationMs = 2200) {
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.textContent = message;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 160);
    }, durationMs);
  }


  /* ==========================================================================
     7. INITIALIZATION & STORAGE LOAD/SAVE
     ========================================================================== */

  function loadStateFromStorage() {
    // Load Setlist
    try {
      const storedSetlist = localStorage.getItem(STORAGE_KEY_SETLIST);
      if (storedSetlist) {
        AppState.songs = JSON.parse(storedSetlist);
      }
    } catch (e) {
      console.warn('Gagal membaca setlist dari localStorage:', e);
    }

    if (!AppState.songs || AppState.songs.length === 0) {
      AppState.songs = JSON.parse(JSON.stringify(DEFAULT_SONGS));
      saveSetlistToStorage();
    }

    // Load Custom Setlists
    try {
      const storedCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_SETLISTS);
      if (storedCustom) {
        AppState.setlists = JSON.parse(storedCustom);
      }
    } catch (e) {
      console.warn('Gagal membaca custom setlists:', e);
    }

    if (!AppState.setlists || AppState.setlists.length === 0) {
      AppState.setlists = [
        {
          id: 'setlist_live_1',
          name: 'Manggung Malam Ini (Live Set)',
          songIds: ['dewa19-kangen', 'sheilaon7-dan', 'andra-sempurna']
        }
      ];
      saveCustomSetlistsToStorage();
    }

    // Load User Preferences
    try {
      const storedPrefs = localStorage.getItem(STORAGE_KEY_PREFS);
      if (storedPrefs) {
        const prefs = JSON.parse(storedPrefs);
        if (prefs.fontSizePx) AppState.fontSizePx = prefs.fontSizePx;
        if (prefs.theme) AppState.theme = prefs.theme;
        if (prefs.accidentalPref) AppState.accidentalPref = prefs.accidentalPref;
        if (prefs.autoScrollSpeed) AppState.autoScrollSpeed = prefs.autoScrollSpeed;
        if (prefs.activeSetlistId) AppState.activeSetlistId = prefs.activeSetlistId;
        if (prefs.activeSongIndex !== undefined) {
          AppState.activeSongIndex = prefs.activeSongIndex;
        }
        if (prefs.isTwoColumns) {
          AppState.isTwoColumns = true;
          document.body.classList.add('mode-two-columns');
          if (DOM.btnToggleColumns) DOM.btnToggleColumns.classList.add('active');
        }
      }
    } catch (e) {
      console.warn('Gagal membaca preferences:', e);
    }

    applyTheme(AppState.theme);
    applyFontSize(AppState.fontSizePx);
    updateSpeedDisplay();
    updateAccidentalDisplay();
  }

  function saveSetlistToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_SETLIST, JSON.stringify(AppState.songs));
      renderSetlistMenu();
    } catch (e) {
      console.error('Gagal menyimpan setlist ke localStorage:', e);
    }
  }

  function saveCustomSetlistsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_SETLISTS, JSON.stringify(AppState.setlists));
      populateSetlistDropdown();
      renderSetlistMenu();
    } catch (e) {
      console.error('Gagal menyimpan custom setlists:', e);
    }
  }

  function savePreferencesToStorage() {
    try {
      const prefs = {
        fontSizePx: AppState.fontSizePx,
        theme: AppState.theme,
        accidentalPref: AppState.accidentalPref,
        autoScrollSpeed: AppState.autoScrollSpeed,
        activeSongIndex: AppState.activeSongIndex,
        activeSetlistId: AppState.activeSetlistId,
        isTwoColumns: AppState.isTwoColumns
      };
      localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
    } catch (e) {
      console.error('Gagal menyimpan preferensi:', e);
    }
  }


  /* ==========================================================================
     8. STAGE CLOCK (HH:MM:SS) & GIG STAGE TIMER
     ========================================================================== */

  function startStageClock() {
    function updateClock() {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      DOM.stageClockTime.textContent = `${hrs}:${mins}:${secs}`;
    }
    updateClock();
    setInterval(updateClock, 1000);
  }

  // Gig Stage Countdown Timer & Stopwatch
  function updateStageTimerDisplay() {
    const t = AppState.stageTimer;
    let totalSecs = t.remainingSeconds;
    const isNeg = totalSecs < 0;
    totalSecs = Math.abs(totalSecs);

    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const displayStr = `${isNeg ? '-' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    DOM.stageTimerDisplay.textContent = displayStr;

    // Visual Alert States
    DOM.stageTimerBadge.classList.remove('warning', 'danger');
    if (!t.isStopwatch) {
      if (t.remainingSeconds <= 0 || isNeg) {
        DOM.stageTimerBadge.classList.add('danger');
      } else if (t.remainingSeconds <= 180) { // < 3 mins
        DOM.stageTimerBadge.classList.add('danger');
      } else if (t.remainingSeconds <= 600) { // < 10 mins
        DOM.stageTimerBadge.classList.add('warning');
      }
    }
  }

  function toggleStageTimer() {
    const t = AppState.stageTimer;
    if (t.isRunning) {
      // Pause
      t.isRunning = false;
      clearInterval(t.intervalId);
      t.intervalId = null;
      DOM.btnTimerStartPause.textContent = 'Lanjut';
      showToast('Timer Panggung Dijeda');
    } else {
      // Start
      t.isRunning = true;
      DOM.btnTimerStartPause.textContent = 'Jeda';
      t.intervalId = setInterval(() => {
        if (t.isStopwatch) {
          t.remainingSeconds++;
        } else {
          t.remainingSeconds--;
        }
        updateStageTimerDisplay();
      }, 1000);
      showToast('Timer Panggung Berjalan');
    }
  }

  function resetStageTimer(targetMins = null) {
    const t = AppState.stageTimer;
    if (t.intervalId) {
      clearInterval(t.intervalId);
      t.intervalId = null;
    }
    t.isRunning = false;
    DOM.btnTimerStartPause.textContent = 'Mulai';

    if (targetMins !== null) {
      t.targetMinutes = targetMins;
      t.isStopwatch = targetMins === 0;
      t.remainingSeconds = targetMins * 60;
    } else {
      t.remainingSeconds = t.isStopwatch ? 0 : t.targetMinutes * 60;
    }
    updateStageTimerDisplay();
    showToast(t.isStopwatch ? 'Stopwatch di-reset' : `Timer di-reset ke ${t.targetMinutes} menit`);
  }


  /* ==========================================================================
     9. SONG RENDERING & TRANSPOSE DISPLAY
     ========================================================================== */

  function getActiveSetlistSongs() {
    if (AppState.activeSetlistId === 'all') {
      return AppState.songs;
    }
    const currentSetlist = AppState.setlists.find(s => s.id === AppState.activeSetlistId);
    if (!currentSetlist || !currentSetlist.songIds || currentSetlist.songIds.length === 0) {
      return [];
    }
    const result = [];
    currentSetlist.songIds.forEach(id => {
      const found = AppState.songs.find(s => s.id === id);
      if (found) result.push(found);
    });
    return result;
  }

  function getActiveSong() {
    if (AppState.previewSong) return AppState.previewSong;
    const list = getActiveSetlistSongs();
    if (list.length === 0) return AppState.songs[0];
    return list[AppState.activeSongIndex] || list[0];
  }

  /**
   * Render active song into the stage sheet
   */
  function renderActiveSong() {
    const song = getActiveSong();
    if (!song) return;

    // Render Stage Cue Notes
    if (song.notes && song.notes.trim()) {
      DOM.stageCueBox.classList.remove('d-none');
      DOM.stageCueText.textContent = song.notes.trim();
    } else {
      DOM.stageCueBox.classList.add('d-none');
    }
    if (!song) return;

    // Update Header Metadata
    DOM.headerSongTitle.textContent = song.title || 'Tanpa Judul';
    DOM.headerSongArtist.textContent = song.artist || 'Artis';

    // Update Hero Banner
    DOM.stageSongTitle.textContent = song.title || 'Tanpa Judul';
    DOM.stageSongArtist.textContent = song.artist || 'Artis';
    DOM.stageSongTempo.textContent = song.tempo ? `BPM: ${song.tempo}` : 'Tempo: Fleksibel';
    DOM.stageSongCapo.textContent = song.capo || 'No Capo';

    // Calculate Current Transposed Key
    const originalKey = song.key || 'C';
    const currentKey = transposeChord(originalKey, AppState.transposeOffset, AppState.accidentalPref);
    DOM.stageKeyPill.textContent = `Kunci: ${currentKey}`;
    DOM.keyIndicator.textContent = currentKey;
    DOM.hudKeyBadge.textContent = currentKey;

    // Transpose Value Indicator
    const prefix = AppState.transposeOffset > 0 ? `+${AppState.transposeOffset}` : `${AppState.transposeOffset}`;
    DOM.transposeValueDisplay.textContent = prefix;
    DOM.stageTransposeOffset.textContent = AppState.transposeOffset === 0
      ? 'Nada Asli'
      : `Transpose: ${prefix} semitone`;

    // Parse and Render Sheet Content
    const parsedLines = parseSongContent(song.rawText || '');
    DOM.sheetRenderContainer.innerHTML = '';

    const fragment = document.createDocumentFragment();

    parsedLines.forEach(item => {
      if (item.type === 'empty') {
        const div = document.createElement('div');
        div.className = 'sheet-line-empty';
        fragment.appendChild(div);
      }
      else if (item.type === 'section') {
        const sectionWrap = document.createElement('div');
        sectionWrap.className = 'sheet-line-section';
        const badge = document.createElement('span');
        badge.className = 'section-badge';
        badge.textContent = item.title;
        sectionWrap.appendChild(badge);
        fragment.appendChild(sectionWrap);
      }
      else if (item.type === 'tab') {
        const tabDiv = document.createElement('div');
        tabDiv.className = 'sheet-line-tab';
        tabDiv.textContent = item.text;
        fragment.appendChild(tabDiv);
      }
      else if (item.type === 'comment') {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'sheet-line-comment';
        commentDiv.textContent = item.text;
        fragment.appendChild(commentDiv);
      }
      else if (item.type === 'chords_only') {
        const chordDiv = document.createElement('div');
        chordDiv.className = 'sheet-line-chords';
        renderFormattedChordTokens(chordDiv, item.chords, AppState.transposeOffset, AppState.accidentalPref);
        fragment.appendChild(chordDiv);
      }
      else if (item.type === 'lyrics_only') {
        const lyricDiv = document.createElement('div');
        lyricDiv.className = 'sheet-line-lyrics';
        lyricDiv.textContent = item.lyrics;
        fragment.appendChild(lyricDiv);
      }
      else if (item.type === 'pair') {
        const pairDiv = document.createElement('div');
        pairDiv.className = 'sheet-line-pair';

        const chordDiv = document.createElement('div');
        chordDiv.className = 'sheet-line-chords';
        renderFormattedChordTokens(chordDiv, item.chords, AppState.transposeOffset, AppState.accidentalPref);

        const lyricDiv = document.createElement('div');
        lyricDiv.className = 'sheet-line-lyrics';
        lyricDiv.textContent = item.lyrics;

        pairDiv.appendChild(chordDiv);
        pairDiv.appendChild(lyricDiv);
        fragment.appendChild(pairDiv);
      }
    });

    DOM.sheetRenderContainer.appendChild(fragment);

    // Sync metronome BPM if song has specified tempo
    if (song.tempo && !AppState.metronome.active) {
      setMetronomeBpm(parseInt(song.tempo, 10));
    }

    // Scroll to top of viewport
    window.scrollTo({ top: 0, behavior: 'instant' });
    updateScrollProgress();
  }

  /**
   * Render chord line into container with interactive clickable chord spans
   */
  function renderFormattedChordTokens(container, chordLine, transposeOffset, accidentalPref) {
    const tokens = parseChordTokensWithPositions(chordLine);
    let lastOriginalIndex = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const spaceCount = Math.max(0, token.index - lastOriginalIndex);

      if (spaceCount > 0) {
        container.appendChild(document.createTextNode(' '.repeat(spaceCount)));
      }

      if (token.isChord) {
        const transposedChord = transposeChord(token.text, transposeOffset, accidentalPref);
        const span = document.createElement('span');
        span.className = 'chord-token';
        span.textContent = transposedChord;
        span.dataset.chord = transposedChord;
        span.title = `Klik untuk info chord ${transposedChord}`;
        span.addEventListener('click', (e) => {
          e.stopPropagation();
          openChordVoicingModal(transposedChord);
        });
        container.appendChild(span);
      } else {
        container.appendChild(document.createTextNode(token.text));
      }

      lastOriginalIndex = token.index + token.length;

      // Adjust spacing before next chord so lyrics alignment is strictly maintained
      if (i < tokens.length - 1) {
        const nextToken = tokens[i + 1];
        const originalSpacing = nextToken.index - (token.index + token.length);
        const transposedLen = token.isChord
          ? transposeChord(token.text, transposeOffset, accidentalPref).length
          : token.text.length;
        const lenDiff = transposedLen - token.length;
        const adjustedSpacing = Math.max(1, originalSpacing - lenDiff);

        container.appendChild(document.createTextNode(' '.repeat(adjustedSpacing)));
        lastOriginalIndex = nextToken.index;
      }
    }
  }


  /* ==========================================================================
     10. TRANSPOSE CONTROLS
     ========================================================================== */

  function setTranspose(offset) {
    // Normalise offset between -11 and +11
    if (offset > 11) offset = -11;
    if (offset < -11) offset = 11;

    AppState.transposeOffset = offset;
    renderActiveSong();

    const sign = offset > 0 ? `+${offset}` : `${offset}`;
    showToast(`Nada ditranspose: ${sign} semitone`);
  }

  function transposeUp() {
    setTranspose(AppState.transposeOffset + 1);
  }

  function transposeDown() {
    setTranspose(AppState.transposeOffset - 1);
  }

  function resetTranspose() {
    if (AppState.transposeOffset !== 0) {
      setTranspose(0);
      showToast('Transpose di-reset ke nada asal');
    }
  }

  function toggleAccidentalPreference() {
    AppState.accidentalPref = AppState.accidentalPref === '#' ? 'b' : '#';
    updateAccidentalDisplay();
    renderActiveSong();
    savePreferencesToStorage();
    showToast(`Mode notasi: ${AppState.accidentalPref === '#' ? 'Kres (#)' : 'Mol (b)'}`);
  }

  function updateAccidentalDisplay() {
    DOM.accidentalModeText.textContent = AppState.accidentalPref;
  }


  /* ==========================================================================
     11. AUTO-SCROLL ENGINE (requestAnimationFrame)
     ========================================================================== */

  let lastTimestamp = 0;
  let scrollSubPixelAccumulator = 0;

  function autoScrollLoop(timestamp) {
    if (!AppState.isAutoScrolling) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTimeSec = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    // Base speed: 40 pixels per second * multiplier
    const speedPxPerSec = 40 * AppState.autoScrollSpeed;
    scrollSubPixelAccumulator += speedPxPerSec * deltaTimeSec;

    if (scrollSubPixelAccumulator >= 1) {
      const scrollPixels = Math.floor(scrollSubPixelAccumulator);
      scrollSubPixelAccumulator -= scrollPixels;
      window.scrollBy(0, scrollPixels);

      // Check if reached bottom
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= maxScroll - 2) {
        stopAutoScroll();
        showToast('Auto-Scroll: Selesai di akhir lagu');
        return;
      }
    }

    updateScrollProgress();
    AppState.scrollRafId = requestAnimationFrame(autoScrollLoop);
  }

  function startAutoScroll() {
    if (AppState.isAutoScrolling) return;

    AppState.isAutoScrolling = true;
    lastTimestamp = 0;
    scrollSubPixelAccumulator = 0;
    document.body.classList.add('is-scrolling');

    DOM.quickScrollText.textContent = 'JEDA';
    DOM.hudScrollIcon.innerHTML = '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>';

    AppState.scrollRafId = requestAnimationFrame(autoScrollLoop);
    showToast(`Auto-Scroll Aktif (${AppState.autoScrollSpeed}x)`);
  }

  function stopAutoScroll() {
    if (!AppState.isAutoScrolling) return;

    AppState.isAutoScrolling = false;
    document.body.classList.remove('is-scrolling');
    if (AppState.scrollRafId) {
      cancelAnimationFrame(AppState.scrollRafId);
      AppState.scrollRafId = null;
    }

    DOM.quickScrollText.textContent = 'SCROLL';
    DOM.hudScrollIcon.innerHTML = '<polygon points="6,4 20,12 6,20" fill="currentColor"/>';
    showToast('Auto-Scroll Dijeda');
  }

  function toggleAutoScroll() {
    if (AppState.isAutoScrolling) {
      stopAutoScroll();
    } else {
      startAutoScroll();
    }
  }

  function adjustScrollSpeed(delta) {
    let newSpeed = Math.round((AppState.autoScrollSpeed + delta) * 100) / 100;
    if (newSpeed < 0.5) newSpeed = 0.5;
    if (newSpeed > 5.0) newSpeed = 5.0;

    AppState.autoScrollSpeed = newSpeed;
    updateSpeedDisplay();
    savePreferencesToStorage();
    showToast(`Kecepatan Scroll: ${newSpeed}x`);
  }

  function updateSpeedDisplay() {
    const formatted = `${AppState.autoScrollSpeed}x`;
    DOM.scrollSpeedDisplay.textContent = formatted;
    DOM.hudSpeedDisplay.textContent = formatted;
  }

  function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    DOM.scrollProgressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });


  /* ==========================================================================
     12. STAGE VIEWPORT & CLEAN MODE
     ========================================================================== */

  function toggleStageCleanMode() {
    AppState.isStageClean = !AppState.isStageClean;
    if (AppState.isStageClean) {
      document.body.classList.add('stage-clean');
      DOM.floatingHud.classList.remove('d-none');
      showToast('Stage Clean Mode Aktif (Tekan [H] untuk keluar)');
    } else {
      document.body.classList.remove('stage-clean');
      DOM.floatingHud.classList.add('d-none');
      showToast('Stage Clean Mode Dinonaktifkan');
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        DOM.iconFsEnter.classList.add('d-none');
        DOM.iconFsExit.classList.remove('d-none');
        showToast('Layar Penuh (Fullscreen)');
      }).catch(err => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          DOM.iconFsEnter.classList.remove('d-none');
          DOM.iconFsExit.classList.add('d-none');
        });
      }
    }
  }

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      DOM.iconFsEnter.classList.remove('d-none');
      DOM.iconFsExit.classList.add('d-none');
    }
  });


  /* ==========================================================================
     13. FONT SIZE & THEME CONTROLS
     ========================================================================== */

  function applyFontSize(sizePx) {
    AppState.fontSizePx = Math.max(14, Math.min(42, sizePx));
    document.documentElement.style.setProperty('--sheet-font-size', `${AppState.fontSizePx}px`);
    DOM.fontSizeDisplay.textContent = `${AppState.fontSizePx}px`;
    savePreferencesToStorage();
  }

  function changeFontSize(delta) {
    applyFontSize(AppState.fontSizePx + delta);
    showToast(`Ukuran Font: ${AppState.fontSizePx}px`);
  }

  function applyTheme(themeClass) {
    document.body.classList.remove('theme-amber', 'theme-cyan', 'theme-lime', 'theme-magenta', 'theme-white');
    document.body.classList.add(themeClass);
    AppState.theme = themeClass;
    savePreferencesToStorage();
  }


  /* ==========================================================================
     14. SETLIST & MULTI-GIG SETLIST MANAGER
     ========================================================================== */

  let editingCustomSetlistId = null;

  function populateSetlistDropdown() {
    if (!DOM.selectActiveSetlist) return;
    DOM.selectActiveSetlist.innerHTML = '';

    // Default: All Songs (Library)
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = `Semua Lagu (Library) (${AppState.songs.length})`;
    if (AppState.activeSetlistId === 'all') optAll.selected = true;
    DOM.selectActiveSetlist.appendChild(optAll);

    // Custom Setlists
    AppState.setlists.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      const validCount = (s.songIds || []).filter(id => AppState.songs.some(song => song.id === id)).length;
      opt.textContent = `${s.name} (${validCount} lagu)`;
      if (s.id === AppState.activeSetlistId) opt.selected = true;
      DOM.selectActiveSetlist.appendChild(opt);
    });

    // Update edit button visibility
    if (DOM.btnEditSetlistSongs) {
      DOM.btnEditSetlistSongs.title = AppState.activeSetlistId === 'all'
        ? 'Pilih Lagu untuk Setlist Baru'
        : 'Pilih / Kelola Lagu di Setlist Ini';
    }
  }

  function renderSetlistMenu(filterQuery = '') {
    DOM.setlistItemsContainer.innerHTML = '';
    const q = filterQuery.toLowerCase().trim();

    const activeSongs = getActiveSetlistSongs();
    const isCustomSetlist = AppState.activeSetlistId !== 'all';

    const filtered = activeSongs.filter(song => {
      if (!q) return true;
      return (song.title || '').toLowerCase().includes(q) || (song.artist || '').toLowerCase().includes(q);
    });

    const setlistLabel = isCustomSetlist
      ? (AppState.setlists.find(s => s.id === AppState.activeSetlistId)?.name || 'Setlist')
      : 'Semua Lagu (Library)';
    DOM.setlistCount.textContent = `${activeSongs.length} Lagu (${setlistLabel})`;

    if (filtered.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-search-hint';
      emptyDiv.style.padding = '2rem 1rem';
      emptyDiv.style.textAlign = 'center';
      emptyDiv.style.color = 'var(--text-dim)';
      emptyDiv.innerHTML = isCustomSetlist && activeSongs.length === 0
        ? `Belum ada lagu di setlist ini.<br><button id="btn-empty-add-songs" class="btn-primary mt-2" style="margin-top:0.6rem; padding:4px 10px; font-size:0.75rem;">+ Tambah Lagu ke Setlist</button>`
        : 'Tidak ada lagu yang cocok';
      DOM.setlistItemsContainer.appendChild(emptyDiv);

      const addBtn = emptyDiv.querySelector('#btn-empty-add-songs');
      if (addBtn) {
        addBtn.addEventListener('click', () => openSetlistModal(false));
      }
      return;
    }

    filtered.forEach((song, idx) => {
      const card = document.createElement('div');
      card.className = `song-card ${idx === AppState.activeSongIndex ? 'active' : ''}`;
      card.dataset.index = idx;

      let reorderHtml = '';
      if (isCustomSetlist) {
        reorderHtml = `
          <div class="song-card-reorder">
            <button class="btn-reorder btn-move-up" data-index="${idx}" title="Pindah ke Atas">▲</button>
            <button class="btn-reorder btn-move-down" data-index="${idx}" title="Pindah ke Bawah">▼</button>
          </div>
        `;
      }

      card.innerHTML = `
        <div style="display:flex; align-items:center;">
          ${reorderHtml}
          <div class="song-card-info">
            <div class="song-card-title">${escapeHtml(song.title || 'Tanpa Judul')}</div>
            <div class="song-card-meta">
              <span>${escapeHtml(song.artist || 'Artis')}</span>
              <span class="song-card-key">${song.key || 'C'}</span>
              ${song.tempo ? `<span>• ${song.tempo} BPM</span>` : ''}
            </div>
          </div>
        </div>
        <div class="song-card-actions">
          <button class="btn-song-delete" title="${isCustomSetlist ? 'Keluarkan dari Setlist' : 'Hapus dari Library'}" data-index="${idx}">&times;</button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-song-delete') || e.target.closest('.btn-reorder')) return;
        selectSongByIndex(idx);
        closeSidebar();
      });

      if (isCustomSetlist) {
        const upBtn = card.querySelector('.btn-move-up');
        const downBtn = card.querySelector('.btn-move-down');
        upBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          moveSongInSetlist(idx, -1);
        });
        downBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          moveSongInSetlist(idx, 1);
        });
      }

      const delBtn = card.querySelector('.btn-song-delete');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSongByIndex(idx);
      });

      DOM.setlistItemsContainer.appendChild(card);
    });
  }

  function moveSongInSetlist(idx, direction) {
    const currentSetlist = AppState.setlists.find(s => s.id === AppState.activeSetlistId);
    if (!currentSetlist || !currentSetlist.songIds) return;

    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= currentSetlist.songIds.length) return;

    const temp = currentSetlist.songIds[idx];
    currentSetlist.songIds[idx] = currentSetlist.songIds[targetIdx];
    currentSetlist.songIds[targetIdx] = temp;

    if (AppState.activeSongIndex === idx) {
      AppState.activeSongIndex = targetIdx;
    } else if (AppState.activeSongIndex === targetIdx) {
      AppState.activeSongIndex = idx;
    }

    saveCustomSetlistsToStorage();
    renderSetlistMenu();
    showToast('Urutan lagu diubah');
  }

  function selectSongByIndex(index) {
    const currentSongs = getActiveSetlistSongs();
    if (index < 0 || index >= currentSongs.length) return;

    AppState.activeSongIndex = index;
    AppState.transposeOffset = 0; // Reset transpose when changing songs
    renderActiveSong();
    renderSetlistMenu();
    savePreferencesToStorage();
    showToast(`Memuat: ${getActiveSong().title}`);
  }

  function nextSong() {
    const currentSongs = getActiveSetlistSongs();
    if (currentSongs.length <= 1) return;
    const nextIdx = (AppState.activeSongIndex + 1) % currentSongs.length;
    selectSongByIndex(nextIdx);
  }

  function prevSong() {
    const currentSongs = getActiveSetlistSongs();
    if (currentSongs.length <= 1) return;
    let prevIdx = AppState.activeSongIndex - 1;
    if (prevIdx < 0) prevIdx = currentSongs.length - 1;
    selectSongByIndex(prevIdx);
  }

  function deleteSongByIndex(index) {
    const currentSongs = getActiveSetlistSongs();
    const song = currentSongs[index];
    if (!song) return;

    if (AppState.activeSetlistId !== 'all') {
      // Remove from custom setlist
      const currentSetlist = AppState.setlists.find(s => s.id === AppState.activeSetlistId);
      if (currentSetlist) {
        currentSetlist.songIds.splice(index, 1);
        if (AppState.activeSongIndex >= currentSetlist.songIds.length) {
          AppState.activeSongIndex = Math.max(0, currentSetlist.songIds.length - 1);
        }
        saveCustomSetlistsToStorage();
        renderActiveSong();
        showToast(`Lagu "${song.title}" dikeluarkan dari setlist`);
      }
      return;
    }

    // Delete from Library
    if (AppState.songs.length === 1) {
      showToast('Setlist tidak boleh kosong');
      return;
    }

    if (confirm(`Hapus lagu "${song.title}" dari Library lagu?`)) {
      AppState.songs.splice(index, 1);
      // Clean up references in custom setlists
      AppState.setlists.forEach(s => {
        s.songIds = (s.songIds || []).filter(id => id !== song.id);
      });
      if (AppState.activeSongIndex >= AppState.songs.length) {
        AppState.activeSongIndex = AppState.songs.length - 1;
      }
      saveSetlistToStorage();
      saveCustomSetlistsToStorage();
      renderActiveSong();
      showToast('Lagu berhasil dihapus dari library');
    }
  }

  // Custom Setlist Modal Handling
  function openSetlistModal(isNew = false) {
    if (isNew || AppState.activeSetlistId === 'all') {
      editingCustomSetlistId = null;
      DOM.inputSetlistName.value = '';
      DOM.btnDeleteCurrentSetlist.classList.add('d-none');
    } else {
      const currentSetlist = AppState.setlists.find(s => s.id === AppState.activeSetlistId);
      if (currentSetlist) {
        editingCustomSetlistId = currentSetlist.id;
        DOM.inputSetlistName.value = currentSetlist.name;
        DOM.btnDeleteCurrentSetlist.classList.remove('d-none');
      }
    }

    // Populate checkboxes of all library songs
    DOM.setlistSongsCheckboxes.innerHTML = '';
    const activeSongIds = editingCustomSetlistId
      ? (AppState.setlists.find(s => s.id === editingCustomSetlistId)?.songIds || [])
      : [];

    AppState.songs.forEach(song => {
      const label = document.createElement('label');
      label.className = 'setlist-song-pick-item';
      const isChecked = activeSongIds.includes(song.id);

      label.innerHTML = `
        <input type="checkbox" value="${song.id}" ${isChecked ? 'checked' : ''}>
        <div>
          <strong>${escapeHtml(song.title)}</strong>
          <span style="color:var(--text-muted); font-size:0.8rem; margin-left:6px;">— ${escapeHtml(song.artist || '')} (${song.key || 'C'})</span>
        </div>
      `;
      DOM.setlistSongsCheckboxes.appendChild(label);
    });

    updateSetlistPickerCount();
    DOM.modalManageSetlists.classList.remove('d-none');
    DOM.inputSetlistName.focus();
  }

  function closeSetlistModal() {
    DOM.modalManageSetlists.classList.add('d-none');
  }

  function updateSetlistPickerCount() {
    const checked = DOM.setlistSongsCheckboxes.querySelectorAll('input[type="checkbox"]:checked');
    DOM.setlistPickerStat.textContent = `${checked.length} dipilih`;
  }

  DOM.setlistSongsCheckboxes.addEventListener('change', updateSetlistPickerCount);

  function saveSetlistFromModal() {
    const name = DOM.inputSetlistName.value.trim();
    if (!name) {
      alert('Mohon masukkan nama setlist.');
      DOM.inputSetlistName.focus();
      return;
    }

    const checkedBoxes = DOM.setlistSongsCheckboxes.querySelectorAll('input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);

    if (editingCustomSetlistId) {
      const current = AppState.setlists.find(s => s.id === editingCustomSetlistId);
      if (current) {
        current.name = name;
        current.songIds = selectedIds;
      }
      showToast(`Setlist "${name}" diperbarui`);
    } else {
      const newId = 'setlist_' + Date.now();
      AppState.setlists.push({
        id: newId,
        name,
        songIds: selectedIds
      });
      AppState.activeSetlistId = newId;
      AppState.activeSongIndex = 0;
      showToast(`Setlist "${name}" berhasil dibuat!`);
    }

    saveCustomSetlistsToStorage();
    savePreferencesToStorage();
    renderActiveSong();
    closeSetlistModal();
  }

  function deleteCurrentSetlistFromModal() {
    if (!editingCustomSetlistId) return;
    const current = AppState.setlists.find(s => s.id === editingCustomSetlistId);
    if (!current) return;

    if (confirm(`Hapus setlist "${current.name}"? Lagu di library tidak akan terhapus.`)) {
      AppState.setlists = AppState.setlists.filter(s => s.id !== editingCustomSetlistId);
      AppState.activeSetlistId = 'all';
      AppState.activeSongIndex = 0;
      saveCustomSetlistsToStorage();
      savePreferencesToStorage();
      renderActiveSong();
      closeSetlistModal();
      showToast(`Setlist "${current.name}" telah dihapus`);
    }
  }

  function toggleSidebar() {
    const isOpen = document.body.classList.toggle('sidebar-open');
    DOM.sidebarBackdrop.classList.toggle('d-none', !isOpen);
    if (isOpen) {
      DOM.setlistSearchInput.focus();
      renderSetlistMenu();
    }
  }

  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
    DOM.sidebarBackdrop.classList.add('d-none');
  }

  function restoreSampleSongs() {
    if (confirm('Muat ulang seluruh lagu sampel standar? Lagu yang sudah ada tidak akan hilang.')) {
      // Append sample songs that don't already exist
      DEFAULT_SONGS.forEach(sample => {
        if (!AppState.songs.some(s => s.title.toLowerCase() === sample.title.toLowerCase())) {
          AppState.songs.push(JSON.parse(JSON.stringify(sample)));
        }
      });
      saveSetlistToStorage();
      showToast('Lagu sampel berhasil dimuat');
    }
  }

  // Export / Import JSON Setlist
  function exportSetlistJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(AppState.songs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `SeeChart_Setlist_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('Setlist diekspor sebagai JSON');
  }

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported) && imported.length > 0) {
          AppState.songs = imported;
          AppState.activeSongIndex = 0;
          saveSetlistToStorage();
          renderActiveSong();
          showToast(`Berhasil mengimpor ${imported.length} lagu!`);
        } else {
          alert('Format file JSON tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }


  /* ==========================================================================
     15. SONG INPUT / AUTO-PARSE & EDIT MODAL
     ========================================================================== */

  let editingSongIndex = null; // null for new song, or index for editing

  function openSongEditor(songToEdit = null) {
    if (songToEdit !== null) {
      editingSongIndex = AppState.activeSongIndex;
      DOM.inputSongTitle.value = songToEdit.title || '';
      DOM.inputSongArtist.value = songToEdit.artist || '';
      DOM.inputSongKey.value = songToEdit.key || 'AUTO';
      DOM.inputSongTempo.value = songToEdit.tempo || '';
      DOM.inputSongCapo.value = songToEdit.capo || '';
      DOM.inputSongNotes.value = songToEdit.notes || '';
      DOM.rawSongTextarea.value = songToEdit.rawText || '';
    } else {
      editingSongIndex = null;
      DOM.inputSongTitle.value = '';
      DOM.inputSongArtist.value = '';
      DOM.inputSongKey.value = 'AUTO';
      DOM.inputSongTempo.value = '120';
      DOM.inputSongCapo.value = 'Tanpa Capo';
      DOM.inputSongNotes.value = '';
      DOM.rawSongTextarea.value = '';
    }

    updateDetectedLinesCount();
    DOM.modalSongEditor.classList.remove('d-none');
    DOM.inputSongTitle.focus();
  }

  function closeSongEditor() {
    DOM.modalSongEditor.classList.add('d-none');
  }

  function updateDetectedLinesCount() {
    const text = DOM.rawSongTextarea.value;
    const lines = text.split(/\r?\n/);
    let chordLines = 0;
    lines.forEach(l => {
      if (isChordLine(l)) chordLines++;
    });
    DOM.detectedLinesStat.textContent = `${lines.length} baris (${chordLines} baris chord)`;
  }

  DOM.rawSongTextarea.addEventListener('input', updateDetectedLinesCount);

  function autoDetectSongKey(rawText) {
    const lines = rawText.split(/\r?\n/);
    const chordsCount = {};

    lines.forEach(line => {
      if (isChordLine(line)) {
        const tokens = parseChordTokensWithPositions(line);
        tokens.forEach(t => {
          if (t.isChord) {
            const match = t.text.match(SINGLE_CHORD_DECOMPOSE);
            if (match) {
              const root = match[1];
              chordsCount[root] = (chordsCount[root] || 0) + 1;
            }
          }
        });
      }
    });

    let detectedKey = 'C';
    let maxCount = 0;
    for (const [k, count] of Object.entries(chordsCount)) {
      if (count > maxCount) {
        maxCount = count;
        detectedKey = k;
      }
    }
    return detectedKey;
  }

  function saveSongFromEditor() {
    const title = DOM.inputSongTitle.value.trim();
    if (!title) {
      alert('Mohon isi Judul Lagu terlebih dahulu.');
      DOM.inputSongTitle.focus();
      return;
    }

    const artist = DOM.inputSongArtist.value.trim() || 'Artis';
    const tempo = DOM.inputSongTempo.value ? parseInt(DOM.inputSongTempo.value, 10) : 120;
    const capo = DOM.inputSongCapo.value.trim() || 'Tanpa Capo';
    const notes = DOM.inputSongNotes.value.trim();
    let key = DOM.inputSongKey.value;
    const rawText = DOM.rawSongTextarea.value.trim();

    if (!rawText) {
      alert('Mohon paste atau masukkan teks chord dan lirik.');
      DOM.rawSongTextarea.focus();
      return;
    }

    if (key === 'AUTO') {
      key = autoDetectSongKey(rawText);
    }

    const newSongObj = {
      id: 'song_' + Date.now(),
      title,
      artist,
      key,
      tempo,
      capo,
      notes,
      rawText
    };

    if (editingSongIndex !== null && AppState.songs[editingSongIndex]) {
      AppState.songs[editingSongIndex] = newSongObj;
      AppState.activeSongIndex = editingSongIndex;
      showToast(`Lagu "${title}" berhasil diperbarui`);
    } else {
      AppState.songs.unshift(newSongObj);
      AppState.activeSongIndex = 0;
      showToast(`Lagu "${title}" ditambahkan ke setlist`);
    }

    AppState.transposeOffset = 0;
    saveSetlistToStorage();
    renderActiveSong();
    closeSongEditor();
  }

  function previewSongFromEditor() {
    const rawText = DOM.rawSongTextarea.value.trim();
    if (!rawText) {
      alert('Mohon masukkan teks chord untuk dipratinjau.');
      DOM.rawSongTextarea.focus();
      return;
    }

    const title = DOM.inputSongTitle.value.trim() || 'Pratinjau Lagu Baru';
    const artist = DOM.inputSongArtist.value.trim() || 'Artis';
    let key = DOM.inputSongKey.value;
    if (key === 'AUTO') {
      key = autoDetectSongKey(rawText);
    }

    const previewSong = {
      id: 'preview_temp',
      title: `[PRATINJAU] ${title}`,
      artist,
      key,
      tempo: DOM.inputSongTempo.value || 120,
      capo: DOM.inputSongCapo.value || 'Tanpa Capo',
      notes: DOM.inputSongNotes.value.trim(),
      rawText
    };

    closeSongEditor();

    // Temporarily replace active view with preview song
    AppState.songs.unshift(previewSong);
    AppState.activeSongIndex = 0;
    AppState.transposeOffset = 0;
    renderActiveSong();
    showToast('Mode Pratinjau aktif! Klik "Edit Teks" untuk menyimpan ke setlist.');
  }

  // 2-Column Mode Toggle
  function toggleTwoColumns() {
    AppState.isTwoColumns = !AppState.isTwoColumns;
    document.body.classList.toggle('mode-two-columns', AppState.isTwoColumns);
    if (DOM.btnToggleColumns) {
      DOM.btnToggleColumns.classList.toggle('active', AppState.isTwoColumns);
    }
    savePreferencesToStorage();
    showToast(AppState.isTwoColumns ? 'Mode 2 Kolom Aktif (Side-by-Side)' : 'Mode 1 Kolom Normal');
  }


  /* ==========================================================================
     16. INTERACTIVE CHORD DETAIL & GUITAR/PIANO VISUALIZER
     ========================================================================== */

  function openChordVoicingModal(chordName) {
    DOM.modalChordName.textContent = chordName;
    const { notes, formula, rootIdx } = getChordNotesAndFormula(chordName);

    DOM.chordNotesText.textContent = notes.join(' - ');
    DOM.chordFormulaText.textContent = formula;

    // Render Guitar SVG Diagram
    DOM.guitarFretboardDisplay.innerHTML = generateGuitarChordSVG(chordName);

    // Render 2-octave piano keyboard
    renderPianoVisualizer(notes);

    // Set active instrument tab
    setChordModalTab(AppState.chordModalTab || 'guitar');

    DOM.modalChordInfo.classList.remove('d-none');
  }

  function setChordModalTab(tabName) {
    AppState.chordModalTab = tabName;
    if (tabName === 'guitar') {
      DOM.tabBtnGuitar.classList.add('active');
      DOM.tabBtnPiano.classList.remove('active');
      DOM.guitarVisualizerWrap.classList.remove('d-none');
      DOM.pianoVisualizerWrap.classList.add('d-none');
    } else {
      DOM.tabBtnPiano.classList.add('active');
      DOM.tabBtnGuitar.classList.remove('active');
      DOM.pianoVisualizerWrap.classList.remove('d-none');
      DOM.guitarVisualizerWrap.classList.add('d-none');
    }
  }

  function renderPianoVisualizer(activeNotes) {
    DOM.pianoKeysDisplay.innerHTML = '';
    // 2 Octaves: C3 to B4
    const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const blackNotePositions = [
      { note: 'C#', leftPercent: 5.2 },
      { note: 'D#', leftPercent: 12.4 },
      { note: 'F#', leftPercent: 26.8 },
      { note: 'G#', leftPercent: 34.0 },
      { note: 'A#', leftPercent: 41.2 },
      // Octave 2
      { note: 'C#', leftPercent: 55.2 },
      { note: 'D#', leftPercent: 62.4 },
      { note: 'F#', leftPercent: 76.8 },
      { note: 'G#', leftPercent: 84.0 },
      { note: 'A#', leftPercent: 91.2 }
    ];

    // Create 14 white keys
    for (let oct = 0; oct < 2; oct++) {
      for (const note of whiteNotes) {
        const whiteKey = document.createElement('div');
        whiteKey.className = 'piano-white-key';
        whiteKey.dataset.note = note;
        if (activeNotes.includes(note)) {
          whiteKey.classList.add('active');
        }
        DOM.pianoKeysDisplay.appendChild(whiteKey);
      }
    }

    // Create 10 black keys
    for (const b of blackNotePositions) {
      const blackKey = document.createElement('div');
      blackKey.className = 'piano-black-key';
      blackKey.style.left = `${b.leftPercent}%`;
      blackKey.dataset.note = b.note;
      if (activeNotes.includes(b.note)) {
        blackKey.classList.add('active');
      }
      DOM.pianoKeysDisplay.appendChild(blackKey);
    }
  }


  /* ==========================================================================
     17. STAGE METRONOME (Web Audio API)
     ========================================================================== */

  function getAudioContext() {
    if (!AppState.metronome.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        AppState.metronome.audioCtx = new AudioCtx();
      }
    }
    if (AppState.metronome.audioCtx && AppState.metronome.audioCtx.state === 'suspended') {
      AppState.metronome.audioCtx.resume();
    }
    return AppState.metronome.audioCtx;
  }

  function playMetronomeClick(isBeatOne) {
    if (!AppState.metronome.soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = isBeatOne ? 1200 : 800; // Accent first beat

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  }

  function setMetronomeBpm(newBpm) {
    AppState.metronome.bpm = Math.max(40, Math.min(240, newBpm));
    DOM.metroBpmNum.textContent = AppState.metronome.bpm;
    DOM.metroSlider.value = AppState.metronome.bpm;

    if (AppState.metronome.active) {
      restartMetronomeTimer();
    }
  }

  function toggleMetronome() {
    const isVisible = DOM.stageMetronomeBar.classList.contains('d-none');
    if (isVisible) {
      DOM.stageMetronomeBar.classList.remove('d-none');
      startMetronomeEngine();
      showToast(`Metronome Aktif (${AppState.metronome.bpm} BPM)`);
    } else {
      DOM.stageMetronomeBar.classList.add('d-none');
      stopMetronomeEngine();
      showToast('Metronome Berhenti');
    }
  }

  function startMetronomeEngine() {
    AppState.metronome.active = true;
    AppState.metronome.beat = 0;
    restartMetronomeTimer();
  }

  function restartMetronomeTimer() {
    if (AppState.metronome.intervalId) {
      clearInterval(AppState.metronome.intervalId);
    }

    const intervalMs = (60 / AppState.metronome.bpm) * 1000;
    AppState.metronome.intervalId = setInterval(() => {
      const dots = DOM.metroBeatDots.querySelectorAll('.dot');
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === AppState.metronome.beat);
      });

      playMetronomeClick(AppState.metronome.beat === 0);
      AppState.metronome.beat = (AppState.metronome.beat + 1) % 4;
    }, intervalMs);
  }

  function stopMetronomeEngine() {
    AppState.metronome.active = false;
    if (AppState.metronome.intervalId) {
      clearInterval(AppState.metronome.intervalId);
      AppState.metronome.intervalId = null;
    }
  }

  // Tap tempo
  let tapTimestamps = [];
  function handleTapTempo() {
    const now = Date.now();
    tapTimestamps.push(now);

    // Keep only last 4 taps
    if (tapTimestamps.length > 4) tapTimestamps.shift();

    if (tapTimestamps.length >= 2) {
      const diffs = [];
      for (let i = 1; i < tapTimestamps.length; i++) {
        diffs.push(tapTimestamps[i] - tapTimestamps[i - 1]);
      }
      const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const calculatedBpm = Math.round(60000 / avgMs);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        setMetronomeBpm(calculatedBpm);
      }
    }
  }


  /* ==========================================================================
     18. KEYBOARD NAVIGATION & GIG HOTKEYS
     ========================================================================== */

  function isInputFocused() {
    const active = document.activeElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable);
  }

  function setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      // If typing in a text field, do not trigger global stage shortcuts
      if (isInputFocused()) {
        if (e.key === 'Escape') {
          closeSongEditor();
          closeSidebar();
          closeModalShortcuts();
        }
        return;
      }

      switch (e.key) {
        // Spacebar: Toggle Auto-Scroll
        case ' ':
          e.preventDefault();
          toggleAutoScroll();
          break;

        // Smooth Scroll Down: Down Arrow or PageDown
        case 'ArrowDown':
          e.preventDefault();
          window.scrollBy({ top: 180, behavior: 'smooth' });
          break;

        case 'PageDown':
          e.preventDefault();
          window.scrollBy({ top: 400, behavior: 'smooth' });
          break;

        // Smooth Scroll Up: Up Arrow or PageUp
        case 'ArrowUp':
          e.preventDefault();
          window.scrollBy({ top: -180, behavior: 'smooth' });
          break;

        case 'PageUp':
          e.preventDefault();
          window.scrollBy({ top: -400, behavior: 'smooth' });
          break;

        // Home key: jump to top
        case 'Home':
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;

        // Speed adjustment: Left & Right arrows
        case 'ArrowLeft':
          e.preventDefault();
          adjustScrollSpeed(-0.25);
          break;

        case 'ArrowRight':
          e.preventDefault();
          adjustScrollSpeed(0.25);
          break;

        // Font Zoom: [+] / [=] and [-]
        case '+':
        case '=':
          e.preventDefault();
          changeFontSize(2);
          break;

        case '-':
        case '_':
          e.preventDefault();
          changeFontSize(-2);
          break;

        // Transpose Up: [>] or []]
        case ']':
        case '>':
          e.preventDefault();
          transposeUp();
          break;

        // Transpose Down: [<] or [[]
        case '[':
        case '<':
          e.preventDefault();
          transposeDown();
          break;

        // Transpose Reset: [0]
        case '0':
          e.preventDefault();
          resetTranspose();
          break;

        // [T] key: Transpose prompt / focus
        case 't':
        case 'T':
          e.preventDefault();
          DOM.btnTransposeUp.focus();
          showToast('Kontrol Transpose Aktif [ [ = Turun, ] = Naik ]');
          break;

        // [H] key: Toggle Clean Stage Mode
        case 'h':
        case 'H':
          e.preventDefault();
          toggleStageCleanMode();
          break;

        // [F] key: Toggle Fullscreen
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;

        // [S] key: Toggle Setlist Sidebar
        case 's':
        case 'S':
          e.preventDefault();
          toggleSidebar();
          break;

        // [M] key: Toggle Metronome
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMetronome();
          break;

        // [N] key: Open New Song modal
        case 'n':
        case 'N':
          e.preventDefault();
          openSongEditor();
          break;

        // [C] key: Toggle 2-Column Split View
        case 'c':
        case 'C':
          e.preventDefault();
          toggleTwoColumns();
          break;

        // [W] key: Toggle Stage Timer
        case 'w':
        case 'W':
          e.preventDefault();
          toggleStageTimer();
          break;

        // [?] key: Open Shortcuts Cheat Sheet
        case '?':
        case '/':
          if (e.shiftKey || e.key === '?') {
            e.preventDefault();
            openModalShortcuts();
          }
          break;

        // Escape: Close modals, close sidebar, or exit clean mode
        case 'Escape':
          e.preventDefault();
          if (AppState.isStageClean) {
            toggleStageCleanMode();
          } else {
            closeSidebar();
            closeSongEditor();
            closeModalShortcuts();
            closeChordModal();
            closeSetlistModal();
            if (DOM.stageTimerPopup) DOM.stageTimerPopup.classList.add('d-none');
          }
          break;
      }
    });
  }

  function openModalShortcuts() {
    DOM.modalShortcuts.classList.remove('d-none');
  }

  function closeModalShortcuts() {
    DOM.modalShortcuts.classList.add('d-none');
  }

  function closeChordModal() {
    DOM.modalChordInfo.classList.add('d-none');
  }


  /* ==========================================================================
     19. UTILITY HELPERS
     ========================================================================== */

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


  /* ==========================================================================
     20. BIND DOM EVENT LISTENERS
     ========================================================================== */

  function bindEvents() {
    // Stage Header Buttons
    DOM.btnToggleSidebar.addEventListener('click', toggleSidebar);
    DOM.btnCloseSidebar.addEventListener('click', closeSidebar);
    DOM.sidebarBackdrop.addEventListener('click', closeSidebar);

    DOM.btnNewSong.addEventListener('click', () => openSongEditor());
    DOM.btnSidebarAddSong.addEventListener('click', () => {
      closeSidebar();
      openSongEditor();
    });
    DOM.btnRestoreSamples.addEventListener('click', restoreSampleSongs);

    DOM.btnStageClean.addEventListener('click', toggleStageCleanMode);
    DOM.hudExitClean.addEventListener('click', toggleStageCleanMode);

    DOM.btnFullscreen.addEventListener('click', toggleFullscreen);
    DOM.btnShortcutsModal.addEventListener('click', openModalShortcuts);
    DOM.btnCloseShortcuts.addEventListener('click', closeModalShortcuts);
    DOM.btnOkShortcuts.addEventListener('click', closeModalShortcuts);

    // 2-Column Split Mode
    if (DOM.btnToggleColumns) {
      DOM.btnToggleColumns.addEventListener('click', toggleTwoColumns);
    }

    // Stage Countdown Timer & Stopwatch
    if (DOM.stageTimerBadge) {
      DOM.stageTimerBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.stageTimerPopup.classList.toggle('d-none');
      });
      DOM.btnTimerStartPause.addEventListener('click', toggleStageTimer);
      DOM.btnTimerReset.addEventListener('click', () => resetStageTimer());

      DOM.stageTimerPopup.addEventListener('click', (e) => e.stopPropagation());

      DOM.stageTimerPopup.querySelectorAll('.btn-timer-preset').forEach(btn => {
        btn.addEventListener('click', () => {
          DOM.stageTimerPopup.querySelectorAll('.btn-timer-preset').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const mins = parseInt(btn.dataset.mins, 10);
          resetStageTimer(mins);
        });
      });
    }

    // Stage Cue Inline Editor
    if (DOM.btnEditInlineCue) {
      DOM.btnEditInlineCue.addEventListener('click', () => {
        const song = getActiveSong();
        const newNotes = prompt('Edit Catatan Panggung (Stage Cues) untuk lagu ini:', song.notes || '');
        if (newNotes !== null) {
          song.notes = newNotes.trim();
          saveSetlistToStorage();
          renderActiveSong();
          showToast('Catatan panggung diperbarui');
        }
      });
    }

    // Instrument Chord Voicing Tabs
    if (DOM.tabBtnGuitar && DOM.tabBtnPiano) {
      DOM.tabBtnGuitar.addEventListener('click', () => setChordModalTab('guitar'));
      DOM.tabBtnPiano.addEventListener('click', () => setChordModalTab('piano'));
    }

    // Custom Setlists Management
    if (DOM.selectActiveSetlist) {
      DOM.selectActiveSetlist.addEventListener('change', (e) => {
        AppState.activeSetlistId = e.target.value;
        AppState.activeSongIndex = 0;
        AppState.transposeOffset = 0;
        savePreferencesToStorage();
        renderActiveSong();
        renderSetlistMenu();
        showToast(`Setlist aktif: ${DOM.selectActiveSetlist.options[DOM.selectActiveSetlist.selectedIndex].text}`);
      });
      DOM.btnCreateSetlist.addEventListener('click', () => openSetlistModal(true));
      DOM.btnEditSetlistSongs.addEventListener('click', () => openSetlistModal(false));
      DOM.btnCloseSetlistModal.addEventListener('click', closeSetlistModal);
      DOM.btnCancelSetlistModal.addEventListener('click', closeSetlistModal);
      DOM.btnSaveSetlistModal.addEventListener('click', saveSetlistFromModal);
      DOM.btnDeleteCurrentSetlist.addEventListener('click', deleteCurrentSetlistFromModal);
    }

    // Transpose Controls
    DOM.btnTransposeDown.addEventListener('click', transposeDown);
    DOM.btnTransposeUp.addEventListener('click', transposeUp);
    DOM.btnTransposeReset.addEventListener('click', resetTranspose);
    DOM.btnAccidentalToggle.addEventListener('click', toggleAccidentalPreference);

    // Floating HUD Transpose
    DOM.hudTransposeDown.addEventListener('click', transposeDown);
    DOM.hudTransposeUp.addEventListener('click', transposeUp);

    // Font Controls
    DOM.btnFontSmaller.addEventListener('click', () => changeFontSize(-2));
    DOM.btnFontLarger.addEventListener('click', () => changeFontSize(2));
    DOM.hudFontDown.addEventListener('click', () => changeFontSize(-2));
    DOM.hudFontUp.addEventListener('click', () => changeFontSize(2));

    // Theme Picker
    DOM.btnThemePicker.addEventListener('click', (e) => {
      e.stopPropagation();
      DOM.themeDropdown.classList.toggle('d-none');
    });

    document.addEventListener('click', () => {
      DOM.themeDropdown.classList.add('d-none');
      if (DOM.stageTimerPopup) DOM.stageTimerPopup.classList.add('d-none');
    });

    DOM.themeDropdown.querySelectorAll('.theme-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.theme);
        DOM.themeDropdown.classList.add('d-none');
      });
    });

    // Auto-Scroll
    DOM.btnAutoScrollToggle.addEventListener('click', toggleAutoScroll);
    DOM.hudAutoScrollToggle.addEventListener('click', toggleAutoScroll);
    DOM.btnQuickScrollPause.addEventListener('click', toggleAutoScroll);
    DOM.btnSpeedMinus.addEventListener('click', () => adjustScrollSpeed(-0.25));
    DOM.btnSpeedPlus.addEventListener('click', () => adjustScrollSpeed(0.25));

    // Song Nav Buttons
    DOM.btnPrevSong.addEventListener('click', prevSong);
    DOM.btnNextSong.addEventListener('click', nextSong);
    DOM.btnJumpTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Song Editor Modal
    DOM.btnEditCurrentSong.addEventListener('click', () => openSongEditor(getActiveSong()));
    DOM.btnCloseEditor.addEventListener('click', closeSongEditor);
    DOM.btnCancelEditor.addEventListener('click', closeSongEditor);
    DOM.btnSaveSong.addEventListener('click', saveSongFromEditor);
    DOM.btnPreviewSong.addEventListener('click', previewSongFromEditor);

    DOM.btnCleanChords.addEventListener('click', () => {
      DOM.rawSongTextarea.value = cleanRawChords(DOM.rawSongTextarea.value);
      updateDetectedLinesCount();
      showToast('Iklan & format otomatis dibersihkan');
    });

    DOM.btnPasteClipboard.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          DOM.rawSongTextarea.value = text;
          updateDetectedLinesCount();
          showToast('Teks berhasil ditempel dari Clipboard');
        }
      } catch (err) {
        showToast('Gunakan Ctrl+V di kotak teks');
      }
    });

    DOM.btnLoadTemplate.addEventListener('click', () => {
      DOM.rawSongTextarea.value = `[Intro]
C  G/B  Am  G
F  Em   Dm  G

[Verse 1]
C             Em
Baris lirik pertama di sini
F             C
Baris lirik kedua di sini
Dm            G
Baris lirik ketiga di sini

[Chorus]
C             Em
Ini bagian Chorus lagu
F             G
Semua chord di atas lirik presisi`;
      updateDetectedLinesCount();
    });

    // Print Sheet
    DOM.btnPrintSheet.addEventListener('click', () => {
      window.print();
    });

    // Setlist Search
    DOM.setlistSearchInput.addEventListener('input', () => {
      const val = DOM.setlistSearchInput.value;
      DOM.btnClearSearch.classList.toggle('d-none', !val);
      renderSetlistMenu(val);
    });

    DOM.btnClearSearch.addEventListener('click', () => {
      DOM.setlistSearchInput.value = '';
      DOM.btnClearSearch.classList.add('d-none');
      renderSetlistMenu();
      DOM.setlistSearchInput.focus();
    });

    // Export / Import Setlist
    DOM.btnExportSetlist.addEventListener('click', exportSetlistJson);
    DOM.btnImportSetlist.addEventListener('click', () => DOM.inputFileImport.click());
    DOM.inputFileImport.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImportFile(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Chord Info Modal
    DOM.btnCloseChordInfo.addEventListener('click', closeChordModal);
    DOM.btnDismissChord.addEventListener('click', closeChordModal);

    // Metronome
    DOM.btnMetronomeToggle.addEventListener('click', toggleMetronome);
    DOM.btnMetroClose.addEventListener('click', toggleMetronome);
    DOM.btnMetroMinus.addEventListener('click', () => setMetronomeBpm(AppState.metronome.bpm - 5));
    DOM.btnMetroPlus.addEventListener('click', () => setMetronomeBpm(AppState.metronome.bpm + 5));
    DOM.metroSlider.addEventListener('input', (e) => setMetronomeBpm(parseInt(e.target.value, 10)));
    DOM.btnMetroTap.addEventListener('click', handleTapTempo);
    DOM.btnMetroSoundToggle.addEventListener('click', () => {
      AppState.metronome.soundEnabled = !AppState.metronome.soundEnabled;
      DOM.btnMetroSoundToggle.classList.toggle('active', AppState.metronome.soundEnabled);
      DOM.metroSoundLabel.textContent = AppState.metronome.soundEnabled ? 'Bunyi Beep' : 'Bisu';
      if (AppState.metronome.soundEnabled) {
        getAudioContext(); // initialize audio context
      }
    });

    // Global Keybindings
    setupKeyboardListeners();
  }


  /* ==========================================================================
     21. BOOTSTRAP APPLICATION
     ========================================================================== */

  function init() {
    loadStateFromStorage();
    bindEvents();
    startStageClock();
    updateStageTimerDisplay();
    populateSetlistDropdown();
    renderActiveSong();
    renderSetlistMenu();
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
