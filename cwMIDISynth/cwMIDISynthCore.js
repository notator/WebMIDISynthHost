/*
*  copyright 2015 Chris Wilson, James Ingram
*  https://github.com/cwilso
*  https://james-ingram-act-two.de/
*
*  Code licensed under MIT
* 
*  This file encapsulates the file
*  https://github.com/cwilso/midi-synth/blob/master/js/synth.js
*  in a namespace.
*  Unused material has been deleted. Only the necessary functions are exposed.
*/

/*jslint white */
/*global WebMIDI, window */

WebMIDI.namespace('WebMIDI.cwMIDISynthCore');

WebMIDI.cwMIDISynthCore = (function(window)
{
	"use strict";

	var
	WaveShaper = WebMIDI.waveShaper.WaveShaper,
	voices = [],
	audioContext = null,
	isMobile = false,	// we have to disable the convolver on mobile for performance reasons.

	// This is the "initial patch"
	currentModWaveform = 0,	// SINE
	currentModFrequency = 2.1, // Hz * 10 = 2.1
	currentModOsc1 = 15,
	currentModOsc2 = 17,

	currentOsc1Waveform = 2, // SAW
	currentOsc1Octave = 0,  // 32'
	currentOsc1Detune = 0,	// 0
	currentOsc1Mix = 50.0,	// 50% -- ji: JSLint says this isn't being used. Delete?

	currentOsc2Waveform = 2, // SAW
	currentOsc2Octave = 0,  // 16'
	currentOsc2Detune = -25,	// fat detune makes pretty analogue-y sound.  :)
	currentOsc2Mix = 50.0,	// 0% -- ji: JSLint says this isn't being used. Delete?

	currentFilterCutoff = 8,
	currentFilterQ = 7.0,
	currentFilterMod = 21,
	currentFilterEnv = 56,

	currentEnvA = 2,
	currentEnvD = 15,
	currentEnvS = 68,
	currentEnvR = 5,

	currentFilterEnvA = 5,
	currentFilterEnvD = 6,
	currentFilterEnvS = 5,
	currentFilterEnvR = 7,

	currentDrive = 38,
	currentRev = 32,
	currentVol = 75,
	// end initial patch

	effectChain = null,
	waveshaper = null,
	volNode = null,
	revNode = null,
	revGain = null,
	revBypassGain = null,
	compressor = null,

	currentOctave = 3, // ji: JSLint says this isn't being used. Delete?
	modOscFreqMultiplier = 1,
	moDouble = false,
	moQuadruple = false,

	aftertouchKey = 0, // ji: JSLint says this isn't being used. Delete?

	frequencyFromNoteNumber = function(note) {
		return 440 * Math.pow(2,(note-69)/12);
	},

	waveforms = ["sine","square","sawtooth","triangle"],

	onUpdateModWaveform = function(waveformIndex)
	{
		var i;
		currentModWaveform = waveformIndex;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].setModWaveform(waveforms[currentModWaveform]);
			}
		}
	},

	onUpdateModFrequency = function(value) {
		var i, oscFreq;
		currentModFrequency = value;
		oscFreq = currentModFrequency * modOscFreqMultiplier;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].updateModFrequency(oscFreq);
			}
		}
	},

	onUpdateModOsc1 = function(value) {
		var i;
		currentModOsc1 = value;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].updateModOsc1(currentModOsc1);
			}
		}
	},

	onUpdateModOsc2 = function(value) {
		var i;
		currentModOsc2 = value;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].updateModOsc2(currentModOsc2);
			}
		}
	},

	onUpdateFilterCutoff = function(value) {
		var i;
		//	console.log("currentFilterCutoff= " + currentFilterCutoff + "new cutoff= " + value);
		currentFilterCutoff = value;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].setFilterCutoff(value);
			}
		}
	},

	onUpdateFilterQ = function(value) {
		var i;
		currentFilterQ = value;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].setFilterQ(value);
			}
		}
	},

	onUpdateFilterMod = function(value) {
		var i;
		currentFilterMod = value;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].setFilterMod(value);
			}
		}
	},

	onUpdateFilterEnv = function(value) {
		currentFilterEnv = value;
	},

	onUpdateOsc1Wave = function(waveformIndex)
	{
		var i;
		currentOsc1Waveform = waveformIndex;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].setOsc1Waveform(waveforms[currentOsc1Waveform]);
			}
		}
	},

	onUpdateOsc1Octave = function(octaveIndex)
	{
		var i;
		currentOsc1Octave = octaveIndex;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].updateOsc1Frequency();
			}
		}
	},

	onUpdateOsc1Detune = function(value) {
		var i;
		currentOsc1Detune = value;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].updateOsc1Frequency();
			}
		}
	},

	onUpdateOsc1Mix = function(value)
	{
		var i;
		currentOsc1Mix = value;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].updateOsc1Mix(value);
			}
		}
	},

	onUpdateOsc2Wave = function(waveformIndex) {
		var i;
		currentOsc2Waveform = waveformIndex;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].setOsc2Waveform(waveforms[currentOsc2Waveform]);
			}
		}
	},

	onUpdateOsc2Octave = function(octaveIndex) {
		var i;
		currentOsc2Octave = octaveIndex;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].updateOsc2Frequency();
			}
		}
	},

	onUpdateOsc2Detune = function(value) {
		var i;
		currentOsc2Detune = value;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].updateOsc2Frequency();
			}
		}
	},

	onUpdateOsc2Mix = function(value) {
		var i;
		currentOsc2Mix = value;
		for (i=0; i<255; i++) {
			if (voices[i] !== undefined) {
				voices[i].updateOsc2Mix(value);
			}
		}
	},

	onUpdateEnvA = function(value) {
		currentEnvA = value;
	},

	onUpdateEnvD = function(value) {
		currentEnvD = value;
	},

	onUpdateEnvS = function(value) {
		currentEnvS = value;
	},

	onUpdateEnvR = function(value) {
		currentEnvR = value;
	},

	onUpdateFilterEnvA = function(value) {
		currentFilterEnvA = value;
	},

	onUpdateFilterEnvD = function(value) {
		currentFilterEnvD = value;
	},

	onUpdateFilterEnvS = function(value) {
		currentFilterEnvS = value;
	},

	onUpdateFilterEnvR = function(value) {
		currentFilterEnvR = value;
	},

	onUpdateDrive = function(value) {
		currentDrive = value;
		waveshaper.setDrive(0.01 + (currentDrive*currentDrive/500.0));
	},

	onUpdateVolume = function(value) {
		volNode.gain.value = value/100;
	},

	onUpdateReverb = function(value) {
		var gain1, gain2;
		value = value/100;

		// equal-power crossfade
		gain1 = Math.cos(value * 0.5*Math.PI);
		gain2 = Math.cos((1.0-value) * 0.5*Math.PI);

		revBypassGain.gain.value = gain1;
		revGain.gain.value = gain2;
	},

	/*
	var FOURIER_SIZE = 2048;
	var wave = false;
	
		if (wave) {
			var real = new Float32Array(FOURIER_SIZE);
			var imag = new Float32Array(FOURIER_SIZE);
			real[0] = 0.0;
			imag[0] = 0.0;
	
			for (var i=1; i<FOURIER_SIZE; i++) {
				real[i]=1.0;
				imag[i]=1.0;
			}
	
			var wavetable = audioContext.createWaveTable(real, imag);
			oscillatorNode.setWaveTable(wavetable);
		} else {
	
	*/

	filterFrequencyFromCutoff = function(pitch, cutoff) {
		var filterFrequency, nyquist = 0.5 * audioContext.sampleRate;

		//    var filterFrequency = Math.pow(2, (9 * cutoff) - 1) * pitch;
		filterFrequency = Math.pow(2, (9 * cutoff) - 1) * pitch;
		if(filterFrequency > nyquist){
			filterFrequency = nyquist;
		}
		return filterFrequency;
	},

	Voice = function(note, velocity) {

		var filterAttackLevel, filterSustainLevel, filterAttackEnd,
			now, envAttackEnd;

		this.originalFrequency = frequencyFromNoteNumber(note);

		// create osc 1
		this.osc1 = audioContext.createOscillator();
		this.updateOsc1Frequency();
		this.osc1.type = waveforms[currentOsc1Waveform];

		this.osc1Gain = audioContext.createGain();
		/* (ji -- November 2015)
		 * In the original file, the velocity argument to this constructor is not used,
		 * and osc1Gain.gain.value is set as follows:
		 *    this.osc1Gain.gain.value = 0.005 * currentOsc1Mix;
		 * When asked about this, Chris said he didn't want to change the original
		 * file because he'd "ideally like to have some controls over what the velocity
		 * argument does (applies to filter frequency, gain, attack only, etc.)".
		 * Obviously those would be nice things to do too, but I wanted here to avoid
		 * giving the impression that the synth couldn't handle velocity at all, and have
		 * decided to use it as follows:
		 * currentOsc1Mix is in range [0..100], so gain is being set in range [0..0.5];
		 * velocity is in range [0..127], so I have set the gain in range [0..0.5] using
		 *    this.osc1Gain.gain.value = 0.5 * (velocity / 127);
		 * The same goes for osc2 below.
		 */
		this.osc1Gain.gain.value = 0.5 * (velocity / 127); // ji 
		this.osc1.connect(this.osc1Gain);

		// create osc 2
		this.osc2 = audioContext.createOscillator();
		this.updateOsc2Frequency();
		this.osc2.type = waveforms[currentOsc2Waveform];

		this.osc2Gain = audioContext.createGain();
		//this.osc2Gain.gain.value = 0.005 * currentOsc2Mix;
		//this.osc2Gain.gain.value = 0.05 + (0.33 * velocity);
		this.osc2Gain.gain.value = 0.5 * (velocity / 127); // ji
		this.osc2.connect(this.osc2Gain);

		// create modulator osc
		this.modOsc = audioContext.createOscillator();
		this.modOsc.type = 	waveforms[currentModWaveform];
		this.modOsc.frequency.value = currentModFrequency * modOscFreqMultiplier;

		this.modOsc1Gain = audioContext.createGain();
		this.modOsc.connect(this.modOsc1Gain);
		this.modOsc1Gain.gain.value = currentModOsc1/10;
		this.modOsc1Gain.connect(this.osc1.frequency);	// tremolo

		this.modOsc2Gain = audioContext.createGain();
		this.modOsc.connect(this.modOsc2Gain);
		this.modOsc2Gain.gain.value = currentModOsc2/10;
		this.modOsc2Gain.connect(this.osc2.frequency);	// tremolo

		// create the LP filter
		this.filter1 = audioContext.createBiquadFilter();
		this.filter1.type = "lowpass";
		this.filter1.Q.value = currentFilterQ;
		this.filter1.frequency.value = Math.pow(2, currentFilterCutoff); 
		// filterFrequencyFromCutoff(this.originalFrequency, currentFilterCutoff);
		//	console.log("filter frequency: " + this.filter1.frequency.value);
		this.filter2 = audioContext.createBiquadFilter();
		this.filter2.type = "lowpass";
		this.filter2.Q.value = currentFilterQ;
		this.filter2.frequency.value = Math.pow(2, currentFilterCutoff); 

		this.osc1Gain.connect(this.filter1);
		this.osc2Gain.connect(this.filter1);
		this.filter1.connect(this.filter2);

		// connect the modulator to the filters
		this.modFilterGain = audioContext.createGain();
		this.modOsc.connect(this.modFilterGain);
		this.modFilterGain.gain.value = currentFilterMod*24;
		//	console.log("modFilterGain=" + currentFilterMod*24);
		this.modFilterGain.connect(this.filter1.detune);	// filter tremolo
		this.modFilterGain.connect(this.filter2.detune);	// filter tremolo

		// create the volume envelope
		this.envelope = audioContext.createGain();
		this.filter2.connect(this.envelope);
		this.envelope.connect(effectChain);

		// set up the volume and filter envelopes
		now = audioContext.currentTime;
		envAttackEnd = now + (currentEnvA/20.0);

		this.envelope.gain.value = 0.0;
		this.envelope.gain.setValueAtTime(0.0, now);
		this.envelope.gain.linearRampToValueAtTime(1.0, envAttackEnd);
		this.envelope.gain.setTargetAtTime((currentEnvS/100.0), envAttackEnd, (currentEnvD/100.0)+0.001);

		filterAttackLevel = currentFilterEnv*72;  // Range: 0-7200: 6-octave range
		filterSustainLevel = filterAttackLevel* currentFilterEnvS / 100.0; // range: 0-7200
		filterAttackEnd = (currentFilterEnvA/20.0);

		/*	console.log("filterAttackLevel: " + filterAttackLevel + 
						 " filterSustainLevel: " + filterSustainLevel +
						 " filterAttackEnd: " + filterAttackEnd);
		*/
		if(!filterAttackEnd){
			filterAttackEnd = 0.05; // tweak to get target decay to work properly
		}
		this.filter1.detune.setValueAtTime(0, now);
		this.filter1.detune.linearRampToValueAtTime(filterAttackLevel, now+filterAttackEnd);
		this.filter2.detune.setValueAtTime(0, now);
		this.filter2.detune.linearRampToValueAtTime(filterAttackLevel, now+filterAttackEnd);
		this.filter1.detune.setTargetAtTime(filterSustainLevel, now+filterAttackEnd, (currentFilterEnvD/100.0));
		this.filter2.detune.setTargetAtTime(filterSustainLevel, now+filterAttackEnd, (currentFilterEnvD/100.0));

		this.osc1.start(0);
		this.osc2.start(0);
		this.modOsc.start(0);
	},

	noteOn = function(note, velocity)
	{
		//console.log("note on: " + note);
		if(voices[note] === undefined)
		{
			// Create a new synth node
			voices[note] = new Voice(note, velocity);
		}
	},

	noteOff = function(note)
	{
		if(voices[note] !== undefined)
		{
			// Shut off the note playing and clear it 
			voices[note].noteOff();
			voices[note] = undefined;
		}
	},

	changeModMultiplier = function()
	{
		modOscFreqMultiplier = (moDouble ? 2 : 1) * (moQuadruple ? 4 : 1);
		onUpdateModFrequency(currentModFrequency);
	},

	polyPressure = function(noteNumber, value)
	{
		if(voices[noteNumber] !== undefined)
		{
			voices[noteNumber].setFilterQ(value * 20);
		}
	},

	// 'value' is in range [0..127].
	controller = function(controllerIndex, value)
	{
		var
		CWCC = WebMIDI.cwConstants.CW_CCINDEX,
		index = value; // used in discrete controls
		value /= 127; // value now in range [0..1]
		switch (controllerIndex)
		{
			case CWCC.MASTER_DRIVE1:
			case CWCC.MASTER_DRIVE2:
			case CWCC.MASTER_DRIVE3:
				onUpdateDrive(100 * value);
				break;
			case CWCC.MASTER_REVERB1:
			case CWCC.MASTER_REVERB2:
			case CWCC.MASTER_REVERB3:
				onUpdateReverb(100 * value);
				break;
			case CWCC.MASTER_VOLUME:
				onUpdateVolume(100 * value);
				break;

			case CWCC.MOD_WAVEFORM:
				onUpdateModWaveform(index);
				break;
			case CWCC.MOD_FREQ1:
			case CWCC.MOD_FREQ2:
				onUpdateModFrequency(10 * value);
				break;
			case CWCC.MOD_OSC1_TREMOLO:
				onUpdateModOsc1(100 * value);
				break;
			case CWCC.MOD_OSC2_TREMOLO:
				onUpdateModOsc2(100 * value);
				break;

			case CWCC.OSC1_WAVEFORM:
				onUpdateOsc1Wave(index);
				break;
			case CWCC.OSC1_OCTAVE:
				onUpdateOsc1Octave(index);
				break;
			case CWCC.OSC1_DETUNE:
				onUpdateOsc1Detune((value * 2400) - 1200);  // value in range [0..1], arg in range [-1200..1200]
				break;
			case CWCC.OSC1_MIX:
				onUpdateOsc1Mix(100 * value);
				break;

			case CWCC.OSC2_WAVEFORM:
				onUpdateOsc2Wave(index);
				break;
			case CWCC.OSC2_OCTAVE:
				onUpdateOsc2Octave(index);
				break;
			case CWCC.OSC2_DETUNE:
				onUpdateOsc2Detune((value * 2400) - 1200); // value in range [0..1], arg in range [-1200..1200]
				break;
			case CWCC.OSC2_MIX:
				onUpdateOsc2Mix(100 * value);
				break;

			case CWCC.FILTER_CUTOFF:
				onUpdateFilterCutoff(100 * value);
				break;
			case CWCC.FILTER_Q1:
			case CWCC.FILTER_Q2:
				onUpdateFilterQ(20 * value);
				break;
			case CWCC.FILTER_MOD:
				onUpdateFilterMod(100 * value);
				break;
			case CWCC.FILTER_ENV:
				onUpdateFilterEnv(100 * value);
				break;

			case CWCC.FILTERENV_ATTACK:
				onUpdateFilterEnvA(100 * value);
				break;
			case CWCC.FILTERENV_DECAY:
				onUpdateFilterEnvD(100 * value);
				break;
			case CWCC.FILTERENV_SUSTAIN:
				onUpdateFilterEnvS(100 * value);
				break;
			case CWCC.FILTERENV_RELEASE:
				onUpdateFilterEnvR(100 * value);
				break;

			case CWCC.VOLUMEENV_ATTACK:
				onUpdateEnvA(100 * value);
				break;
			case CWCC.VOLUMEENV_DECAY:
				onUpdateEnvD(100 * value);
				break;
			case CWCC.VOLUMEENV_SUSTAIN:
				onUpdateEnvS(100 * value);
				break;
			case CWCC.VOLUMEENV_RELEASE:
				onUpdateEnvR(100 * value);
				break;

			case CWCC.X1BUTTON1:
			case CWCC.X1BUTTON2:
				moDouble = (value > 0);
				changeModMultiplier();
				break;
			case CWCC.X2BUTTON1:
			case CWCC.X2BUTTON2:
				moQuadruple = (value > 0);
				changeModMultiplier();
				break;
		}
	},

	currentPitchWheel = 0.0,
	// 'value' is normalized to [-1,1]
	pitchWheel = function(value)
	{
		var i;

		currentPitchWheel = value;
		for(i = 0; i < 255; i++)
		{
			if(voices[i])
			{
				if(voices[i].osc1)
				{
					voices[i].osc1.detune.value = currentOsc1Detune + currentPitchWheel * 500;	// value in cents - detune major fifth.
				}
				if(voices[i].osc2)
				{
					voices[i].osc2.detune.value = currentOsc2Detune + currentPitchWheel * 500;	// value in cents - detune major fifth.
				}
			}
		}
	},

	initAudio = function() {
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		try {
			audioContext = new window.AudioContext();
		}
		catch(e) {
			alert('The Web Audio API is apparently not supported in this browser.');
		}

		isMobile = (navigator.userAgent.indexOf("Android") !== -1)||(navigator.userAgent.indexOf("iPad") !== -1)||(navigator.userAgent.indexOf("iPhone") !== -1);

		// set up the master effects chain for all voices to connect to.
		effectChain = audioContext.createGain();
		waveshaper = new WaveShaper( audioContext );
		effectChain.connect( waveshaper.input );
		onUpdateDrive( currentDrive );

		if(!isMobile){
			revNode = audioContext.createConvolver();
		}
		else{
			revNode = audioContext.createGain();
		}
		revGain = audioContext.createGain();
		revBypassGain = audioContext.createGain();

		volNode = audioContext.createGain();
		volNode.gain.value = currentVol;
		compressor = audioContext.createDynamicsCompressor();
		waveshaper.output.connect( revNode );
		waveshaper.output.connect( revBypassGain );
		revNode.connect( revGain );
		revGain.connect( volNode );
		revBypassGain.connect( volNode );
		onUpdateReverb(currentRev);

		volNode.connect( compressor );
		compressor.connect(	audioContext.destination );
		onUpdateVolume(currentVol);

		if (!isMobile) {
			var irRRequest = new XMLHttpRequest();
			irRRequest.open("GET", "cwMIDISynth/sounds/irRoom.wav", true);
			irRRequest.responseType = "arraybuffer";
			irRRequest.onload = function()
			{
				audioContext.decodeAudioData(irRRequest.response,
					function(buffer)
					{
						if(revNode) { revNode.buffer = buffer; }
						else { console.log("no revNode ready!"); }
					});
			};
			irRRequest.send();
		}
	},

	API =
    {
    	initAudio: initAudio,

    	noteOn: noteOn,
    	noteOff: noteOff,
    	controller: controller,
    	polyPressure: polyPressure,
    	pitchWheel: pitchWheel
    };

	Voice.prototype.setModWaveform = function(value)
	{
		this.modOsc.type = value;
	};

	Voice.prototype.updateModFrequency = function(value)
	{
		this.modOsc.frequency.value = value;
	};

	Voice.prototype.updateModOsc1 = function(value)
	{
		this.modOsc1Gain.gain.value = value / 10;
	};

	Voice.prototype.updateModOsc2 = function(value)
	{
		this.modOsc2Gain.gain.value = value / 10;
	};

	Voice.prototype.setOsc1Waveform = function(value)
	{
		this.osc1.type = value;
	};

	Voice.prototype.updateOsc1Frequency = function(value)  // value not used
	{
		this.osc1.frequency.value = (this.originalFrequency * Math.pow(2, currentOsc1Octave - 2));  // -2 because osc1 is 32', 16', 8'
		this.osc1.detune.value = currentOsc1Detune + currentPitchWheel * 500;	// value in cents - detune major fifth.
	};

	Voice.prototype.updateOsc1Mix = function(value)
	{
		this.osc1Gain.gain.value = 0.005 * value;
	};

	Voice.prototype.setOsc2Waveform = function(value)
	{
		this.osc2.type = value;
	};

	Voice.prototype.updateOsc2Frequency = function(value)  // value not used
	{
		this.osc2.frequency.value = (this.originalFrequency * Math.pow(2, currentOsc2Octave - 1));
		this.osc2.detune.value = currentOsc2Detune + currentPitchWheel * 500;	// value in cents - detune major fifth.
	};

	Voice.prototype.updateOsc2Mix = function(value)
	{
		this.osc2Gain.gain.value = 0.005 * value;
	};

	Voice.prototype.setFilterCutoff = function(value)
	{
		var now = audioContext.currentTime, // ji: now isnt used. Delete?
		    filterFrequency = Math.pow(2, value);
		//	console.log("Filter cutoff: orig:" + this.filter1.frequency.value + " new:" + filterFrequency + " value: " + value);
		this.filter1.frequency.value = filterFrequency;
		this.filter2.frequency.value = filterFrequency;
	};

	Voice.prototype.setFilterQ = function(value)
	{
		this.filter1.Q.value = value;
		this.filter2.Q.value = value;
	};

	Voice.prototype.setFilterMod = function(value)	 // value isn't used.
	{
		this.modFilterGain.gain.value = currentFilterMod * 24;
		//	console.log("filterMod.gain=" + currentFilterMod*24);
	};

	Voice.prototype.noteOff = function()
	{
		var now = audioContext.currentTime,
			release = now + (currentEnvR / 10.0),
			initFilter = filterFrequencyFromCutoff(this.originalFrequency, currentFilterCutoff / 100 * (1.0 - (currentFilterEnv / 100.0)));

		// initFilter isn't used in this function

		//    console.log("noteoff: now: " + now + " val: " + this.filter1.frequency.value + " initF: " + initFilter + " fR: " + currentFilterEnvR/100);
		this.envelope.gain.cancelScheduledValues(now);
		this.envelope.gain.setValueAtTime(this.envelope.gain.value, now);  // this is necessary because of the linear ramp
		this.envelope.gain.setTargetAtTime(0.0, now, (currentEnvR / 100));
		this.filter1.detune.cancelScheduledValues(now);
		this.filter1.detune.setTargetAtTime(0, now, (currentFilterEnvR / 100.0));
		this.filter2.detune.cancelScheduledValues(now);
		this.filter2.detune.setTargetAtTime(0, now, (currentFilterEnvR / 100.0));

		this.osc1.stop(release);
		this.osc2.stop(release);
	};

	return API;

}(window));
