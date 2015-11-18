/*
 *  copyright 2015 James Ingram
 *
 *  Code licensed under MIT
 *
 *  The WebMIDI.cwConstants namespace which defines read-only MIDI constants for Chris Wilson's cwMIDISynth.
 */

/*jslint bitwise: false, nomen: false, plusplus: false, white: true */
/*global WebMIDI: false,  window: false,  document: false, performance: false, console: false, alert: false, XMLHttpRequest: false */

WebMIDI.namespace('WebMIDI.cwConstants');

WebMIDI.cwConstants = (function()
{
    "use strict";
	var
	WAVEFORM = {},
	OSC1_INTERVAL = {},
	OSC2_INTERVAL = {},
	CW_DEFAULT = {},

    API =
    {
		CW_DEFAULT: CW_DEFAULT
    };
	
	// WAVEFORM
	// The values are the indices of options in the in the WAVEFORM select controls.
    Object.defineProperty(WAVEFORM, "SINE", { value: 0, writable: false });
    Object.defineProperty(WAVEFORM, "SQUARE", { value: 1, writable: false });
    Object.defineProperty(WAVEFORM, "SAW", { value: 2, writable: false });
    Object.defineProperty(WAVEFORM, "TRIANGLE", { value: 3, writable: false });

	// OSC1_INTERVAL
	// The values are the indices of options in the in the OSC1_INTERVAL select control.
    Object.defineProperty(OSC1_INTERVAL, "F32", { value: 0, writable: false });
    Object.defineProperty(OSC1_INTERVAL, "F16", { value: 1, writable: false });
    Object.defineProperty(OSC1_INTERVAL, "F8", { value: 2, writable: false });

	// OSC2_INTERVAL
	// The values are the indices of options in the in the OSC2_INTERVAL select control.
    Object.defineProperty(OSC2_INTERVAL, "F16", { value: 0, writable: false });
    Object.defineProperty(OSC2_INTERVAL, "F8", { value: 1, writable: false });
    Object.defineProperty(OSC2_INTERVAL, "F4", { value: 2, writable: false });

	// CW_DEFAULT
	// These values are all integral MIDI controller values in the range 0..127.			// The "initial patch"
    Object.defineProperty(CW_DEFAULT, "MASTER_DRIVE", { value: 48, writable: false });			// currentDrive = 38; [0..100]
    Object.defineProperty(CW_DEFAULT, "MASTER_REVERB", { value: 41, writable: false });		// currentRev = 32; [0..100]
    Object.defineProperty(CW_DEFAULT, "MASTER_VOLUME", { value: 95, writable: false });		// currentVol = 75;  [0..100]

    Object.defineProperty(CW_DEFAULT, "MOD_WAVEFORM", { value: WAVEFORM.SINE, writable: false }); // currentModWaveform = 0; [select4]	// SINE
    Object.defineProperty(CW_DEFAULT, "MOD_FREQ", { value: 27, writable: false });				// currentModFrequency = 2.1; [0..10] // Hz * 10 = 2.1
    Object.defineProperty(CW_DEFAULT, "MOD_OSC1_TREMOLO", { value: 19, writable: false });		// currentModOsc1 = 15; [0..100]
    Object.defineProperty(CW_DEFAULT, "MOD_OSC2_TREMOLO", { value: 22, writable: false });		// currentModOsc2 = 17; [0..100]

    Object.defineProperty(CW_DEFAULT, "OSC1_WAVEFORM", { value: WAVEFORM.SAW, writable: false });// currentOsc1Waveform = 2;[select4] // SAW
    Object.defineProperty(CW_DEFAULT, "OSC1_INTERVAL", { value: OSC1_INTERVAL.F32, writable: false });// currentOsc1Octave = 0; [select3]  // 32'
    Object.defineProperty(CW_DEFAULT, "OSC1_DETUNE", { value: 64, writable: false });			// currentOsc1Detune = 0; [-1200..1200]	// 0
    Object.defineProperty(CW_DEFAULT, "OSC1_MIX", { value: 64, writable: false });				// currentOsc1Mix = 50.0; [0..100]	// 50%

    Object.defineProperty(CW_DEFAULT, "OSC2_WAVEFORM", { value: WAVEFORM.SAW, writable: false });// currentOsc2Waveform = 2;[select4] // SAW
    Object.defineProperty(CW_DEFAULT, "OSC2_INTERVAL", { value: OSC2_INTERVAL.F16, writable: false });// currentOsc2Octave = 0; [select3]  // 16'
    Object.defineProperty(CW_DEFAULT, "OSC2_DETUNE", { value: 62, writable: false });			// currentOsc2Detune = -25; [-1200..1200]	// fat detune makes pretty analogue-y sound.  :)
    Object.defineProperty(CW_DEFAULT, "OSC2_MIX", { value: 64, writable: false });				// currentOsc2Mix = 50.0; [0..100]	// 0%

    Object.defineProperty(CW_DEFAULT, "FILTER_CUTOFF", { value: 10, writable: false });		// currentFilterCutoff = 8; [20..20000] : ji ((10/127) * 100) is ca. 8
    Object.defineProperty(CW_DEFAULT, "FILTER_Q", { value: 44, writable: false });				// currentFilterQ = 7.0; [0..20]
    Object.defineProperty(CW_DEFAULT, "FILTER_MOD", { value: 27, writable: false });			// currentFilterMod = 21; [0..100]
    Object.defineProperty(CW_DEFAULT, "FILTER_ENV", { value: 71, writable: false });			// currentFilterEnv = 56; [0..100]

    Object.defineProperty(CW_DEFAULT, "FILTERENV_ATTACK", { value: 6, writable: false });		// currentFilterEnvA = 5; [0..100]
    Object.defineProperty(CW_DEFAULT, "FILTERENV_DECAY", { value: 8, writable: false });		// currentFilterEnvD = 6; [0..100]
    Object.defineProperty(CW_DEFAULT, "FILTERENV_SUSTAIN", { value: 6, writable: false });		// currentFilterEnvS = 5; [0..100]
    Object.defineProperty(CW_DEFAULT, "FILTERENV_RELEASE", { value: 9, writable: false });		// currentFilterEnvR = 7; [0..100]

    Object.defineProperty(CW_DEFAULT, "VOLUMEENV_ATTACK", { value: 3, writable: false });		// currentEnvA = 2; [0..100]
    Object.defineProperty(CW_DEFAULT, "VOLUMEENV_DECAY", { value: 19, writable: false });		// currentEnvD = 15; [0..100]
    Object.defineProperty(CW_DEFAULT, "VOLUMEENV_SUSTAIN", { value: 86, writable: false });	// currentEnvS = 68; [0..100]
    Object.defineProperty(CW_DEFAULT, "VOLUMEENV_RELEASE", { value: 6, writable: false });		// currentEnvR = 5;	 [0..100]		

    return API;

} ());

    
