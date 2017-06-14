/*
 *  copyright 2015 James Ingram
 *
 *  Code licensed under MIT
 *
 *  The WebMIDI.cwConstants namespace which defines read-only MIDI constants for Chris Wilson's cwMIDISynth.
 */

/*jslint white */
/*global WebMIDI */

WebMIDI.namespace('WebMIDI.cwConstants');

WebMIDI.cwConstants = (function()
{
    "use strict";
	var
	ALL_CONTROLLERS_OFF = WebMIDI.constants.CONTROL.ALL_CONTROLLERS_OFF,
	WAVEFORM = {},
	OSC1_OCTAVE = {},
	OSC2_OCTAVE = {},
	CW_CCINDEX = {},
	CW_DEFAULT = {},
	CW_NITEMS = {},

    API =
    {
    	CW_CCINDEX: CW_CCINDEX,
    	CW_DEFAULT: CW_DEFAULT,
    	CW_NITEMS: CW_NITEMS
    };
	
	// WAVEFORM
	// The values are the indices of options in the in the WAVEFORM select controls.
    Object.defineProperty(WAVEFORM, "SINE", { value: 0, writable: false });
    Object.defineProperty(WAVEFORM, "SQUARE", { value: 1, writable: false });
    Object.defineProperty(WAVEFORM, "SAW", { value: 2, writable: false });
    Object.defineProperty(WAVEFORM, "TRIANGLE", { value: 3, writable: false });

	// OSC1_OCTAVE
	// The values are the indices of options in the in the OSC1_OCTAVE select control.
    Object.defineProperty(OSC1_OCTAVE, "F32", { value: 0, writable: false });
    Object.defineProperty(OSC1_OCTAVE, "F16", { value: 1, writable: false });
    Object.defineProperty(OSC1_OCTAVE, "F8", { value: 2, writable: false });

	// OSC2_OCTAVE
	// The values are the indices of options in the in the OSC2_OCTAVE select control.
    Object.defineProperty(OSC2_OCTAVE, "F16", { value: 0, writable: false });
    Object.defineProperty(OSC2_OCTAVE, "F8", { value: 1, writable: false });
    Object.defineProperty(OSC2_OCTAVE, "F4", { value: 2, writable: false });

	/****************************************************************************************************************/
	// CW_CCINDEX
	// These values are unique MIDI controller indices in the range 0..127.
	// Controls should be used with their original meaning where possible.
	// The same control can be mapped to more than one index (e.g. "MASTER_DRIVE1",
	// "MASTER_DRIVE2","MASTER_DRIVE3").

    Object.defineProperty(CW_CCINDEX, "RESET", { value: ALL_CONTROLLERS_OFF, writable: false });

    Object.defineProperty(CW_CCINDEX, "MASTER_DRIVE1", { value: 5, writable: false });
    Object.defineProperty(CW_CCINDEX, "MASTER_DRIVE2", { value: 15, writable: false });
    Object.defineProperty(CW_CCINDEX, "MASTER_DRIVE3", { value: 73, writable: false });
    Object.defineProperty(CW_CCINDEX, "MASTER_REVERB1", { value: 6, writable: false });
    Object.defineProperty(CW_CCINDEX, "MASTER_REVERB2", { value: 16, writable: false });
    Object.defineProperty(CW_CCINDEX, "MASTER_REVERB3", { value: 72, writable: false });
    Object.defineProperty(CW_CCINDEX, "MASTER_VOLUME", { value: 91, writable: false });

    Object.defineProperty(CW_CCINDEX, "MOD_WAVEFORM", { value: 9, writable: false });
    Object.defineProperty(CW_CCINDEX, "MOD_FREQ1", { value: 4, writable: false });
    Object.defineProperty(CW_CCINDEX, "MOD_FREQ2", { value: 17, writable: false });
    Object.defineProperty(CW_CCINDEX, "MOD_OSC1_TREMOLO", { value: 74, writable: false });
    Object.defineProperty(CW_CCINDEX, "MOD_OSC2_TREMOLO", { value: 71, writable: false }); 

    Object.defineProperty(CW_CCINDEX, "OSC1_WAVEFORM", { value: 20, writable: false });
    Object.defineProperty(CW_CCINDEX, "OSC1_OCTAVE", { value: 21, writable: false });
    Object.defineProperty(CW_CCINDEX, "OSC1_DETUNE", { value: 22, writable: false });
    Object.defineProperty(CW_CCINDEX, "OSC1_MIX", { value: 23, writable: false });

    Object.defineProperty(CW_CCINDEX, "OSC2_WAVEFORM", { value: 24, writable: false });
    Object.defineProperty(CW_CCINDEX, "OSC2_OCTAVE", { value: 25, writable: false }); 
    Object.defineProperty(CW_CCINDEX, "OSC2_DETUNE", { value: 26, writable: false }); 
    Object.defineProperty(CW_CCINDEX, "OSC2_MIX", { value: 27, writable: false });

    Object.defineProperty(CW_CCINDEX, "FILTER_CUTOFF", { value: 2, writable: false });
    Object.defineProperty(CW_CCINDEX, "FILTER_Q1", { value: 7, writable: false });
    Object.defineProperty(CW_CCINDEX, "FILTER_Q2", { value: 10, writable: false });
    Object.defineProperty(CW_CCINDEX, "FILTER_MOD", { value: 1, writable: false }); 
    Object.defineProperty(CW_CCINDEX, "FILTER_ENV", { value: 3, writable: false }); 

    Object.defineProperty(CW_CCINDEX, "FILTERENV_ATTACK", { value: 28, writable: false });
    Object.defineProperty(CW_CCINDEX, "FILTERENV_DECAY", { value: 29, writable: false });
    Object.defineProperty(CW_CCINDEX, "FILTERENV_SUSTAIN", { value: 30, writable: false });
    Object.defineProperty(CW_CCINDEX, "FILTERENV_RELEASE", { value: 31, writable: false }); 

    Object.defineProperty(CW_CCINDEX, "VOLUMEENV_ATTACK", { value: 46, writable: false });
    Object.defineProperty(CW_CCINDEX, "VOLUMEENV_DECAY", { value: 47, writable: false }); 
    Object.defineProperty(CW_CCINDEX, "VOLUMEENV_SUSTAIN", { value: 48, writable: false });
    Object.defineProperty(CW_CCINDEX, "VOLUMEENV_RELEASE", { value: 49, writable: false });

    Object.defineProperty(CW_CCINDEX, "X1BUTTON1", { value: 33, writable: false });
    Object.defineProperty(CW_CCINDEX, "X1BUTTON2", { value: 51, writable: false });
    Object.defineProperty(CW_CCINDEX, "X2BUTTON1", { value: 34, writable: false });
    Object.defineProperty(CW_CCINDEX, "X2BUTTON2", { value: 52, writable: false });

	/****************************************************************************************************************/
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
    Object.defineProperty(CW_DEFAULT, "OSC1_OCTAVE", { value: OSC1_OCTAVE.F32, writable: false });// currentOsc1Octave = 0; [select3]  // 32'
    Object.defineProperty(CW_DEFAULT, "OSC1_DETUNE", { value: 64, writable: false });			// currentOsc1Detune = 0; [-1200..1200]	// 0
    Object.defineProperty(CW_DEFAULT, "OSC1_MIX", { value: 64, writable: false });				// currentOsc1Mix = 50.0; [0..100]	// 50%

    Object.defineProperty(CW_DEFAULT, "OSC2_WAVEFORM", { value: WAVEFORM.SAW, writable: false });// currentOsc2Waveform = 2;[select4] // SAW
    Object.defineProperty(CW_DEFAULT, "OSC2_OCTAVE", { value: OSC2_OCTAVE.F16, writable: false });// currentOsc2Octave = 0; [select3]  // 16'
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

    Object.defineProperty(CW_DEFAULT, "X1BUTTON", { value: 0, writable: false });
    Object.defineProperty(CW_DEFAULT, "X2BUTTON", { value: 0, writable: false });

	/****************************************************************************************************************/
	// CW_NITEMS
	// These values are only defined for controllers (like switches or popup menus) that have a fixed number of values.
	// When controlled by a CC, an index (like a select.selectedIndex) is calculated by dividing the range 0..127 into parts
	// of nearly equal size, each correponding to a particular index.
	// For example:
	//  if nItems is 2, values 0..63 -> index 0, values 64..127 -> index 1.
	//  if nItems is 3, values 0..42 -> index 0, values 43..85 -> index 1, values 86..127 -> index 2.
	//  if nItems is 4, values 0..31 -> index 0, values 32..63 -> index 1, values 64..95 -> index 2, values 96..127 -> index 3.
    Object.defineProperty(CW_NITEMS, "MOD_WAVEFORM", { value: 4, writable: false });
    Object.defineProperty(CW_NITEMS, "OSC1_WAVEFORM", { value: 4, writable: false });
    Object.defineProperty(CW_NITEMS, "OSC1_OCTAVE", { value: 3, writable: false });
    Object.defineProperty(CW_NITEMS, "OSC2_WAVEFORM", { value: 4, writable: false });
    Object.defineProperty(CW_NITEMS, "OSC2_OCTAVE", { value: 3, writable: false });
    Object.defineProperty(CW_NITEMS, "X1BUTTON", { value: 2, writable: false });
    Object.defineProperty(CW_NITEMS, "X2BUTTON", { value: 2, writable: false });

    return API;

} ());

    
