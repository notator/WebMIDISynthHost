/*
*  copyright 2015 Chris Wilson, James Ingram
*  https://github.com/cwilso
*  https://james-ingram-act-two.de/
*
*  Code licensed under MIT
* 
*  This file implements the Web MIDI API interface for Output Devices,
*  with some extensions I am proposing for web-based software synthesizers.
*  Implementing this interface makes the synthesizer controllable from any
*  web application without having to use MIDI hardware.
* 
*  This implementation uses Chris Wilson's midi-synth synthesizer from
*  https://github.com/cwilso/midi-synth
*/

/*jslint bitwise, white */
/*global WebMIDI */

WebMIDI.namespace('WebMIDI.cwMIDISynth');

WebMIDI.cwMIDISynth = (function()
{
	"use strict";

	var
	CMD = WebMIDI.constants.COMMAND,
	CTL = WebMIDI.constants.CONTROL,
	CWCC = WebMIDI.cwConstants.CW_CCINDEX,
	DEFAULTVALUE = WebMIDI.cwConstants.CW_DEFAULT,
	NITEMS = WebMIDI.cwConstants.CW_NITEMS,
	core = new WebMIDI.cwMIDISynthCore.CWMIDISynthCore(),

	commands =
	[
		CMD.NOTE_OFF,
		CMD.NOTE_ON,
		CMD.CONTROL_CHANGE,
		//CMD.AFTERTOUCH,
		//CMD.PRESET,
		//CMD.CHANNEL_PRESSURE,
		CMD.PITCHWHEEL
	],

	controls =
	[
		// Control indices must be unique and in the range [0..127].
		// Controls in the standard MIDI CC set should be used with their original meaning where possible.
		// The same control can be mapped to more than one index.
		// The defaultValues here are all integral MIDI controller values in the range [0..127]. They are defined as constants
		// because they are needed by CTL.ALL_CONTROLLERS_OFF (which resets all controls to their default values).
		// nItems is set for non-continuous controls such as switches, knobs with a fixed number of settings or
		// html <select>s. nItems is the number of options in the control.
		// If nItems is defined, then the control will have valid values in the range [0..nItems - 1].
		// If neither defaultValue nor nItems is defined, the control has a 2-byte message (like CTL.ALL_NOTES_OFF).
        { name: "mod waveform", index: CWCC.MOD_WAVEFORM, defaultValue: DEFAULTVALUE.MOD_WAVEFORM, nItems: NITEMS.MOD_WAVEFORM }, // 4 WAVEFORM.SINE
        { name: "mod freq", index: CWCC.MOD_FREQ, defaultValue: DEFAULTVALUE.MOD_FREQ },
        { name: "mod osc1 tremolo", index: CWCC.MOD_OSC1_TREMOLO, defaultValue: DEFAULTVALUE.MOD_OSC1_TREMOLO },
        { name: "mod osc2 tremolo", index: CWCC.MOD_OSC2_TREMOLO, defaultValue: DEFAULTVALUE.MOD_OSC2_TREMOLO },

        { name: "osc1 waveform", index: CWCC.OSC1_WAVEFORM, defaultValue: DEFAULTVALUE.OSC1_WAVEFORM, nItems: NITEMS.OSC1_WAVEFORM }, // 4 WAVEFORM.SAW
        { name: "osc1 octave", index: CWCC.OSC1_OCTAVE, defaultValue: DEFAULTVALUE.OSC1_OCTAVE, nItems: NITEMS.OSC1_OCTAVE }, // 3 OSC1_OCTAVE.F32
        { name: "osc1 detune", index: CWCC.OSC1_DETUNE, defaultValue: DEFAULTVALUE.OSC1_DETUNE },
        { name: "osc1 mix", index: CWCC.OSC1_MIX, defaultValue: DEFAULTVALUE.OSC1_MIX },

        { name: "osc2 waveform", index: CWCC.OSC2_WAVEFORM, defaultValue: DEFAULTVALUE.OSC2_WAVEFORM, nItems: NITEMS.OSC2_WAVEFORM }, // 4, WAVEFORM.SAW
        { name: "osc2 octave", index: CWCC.OSC2_OCTAVE, defaultValue: DEFAULTVALUE.OSC2_OCTAVE, nItems: NITEMS.OSC2_OCTAVE }, // 3, OSC2_OCTAVE.F16
        { name: "osc2 detune", index: CWCC.OSC2_DETUNE, defaultValue: DEFAULTVALUE.OSC2_DETUNE },
        { name: "osc2 mix", index: CWCC.OSC2_MIX, defaultValue: DEFAULTVALUE.OSC2_MIX },

        { name: "filter cutoff", index: CWCC.FILTER_CUTOFF, defaultValue: DEFAULTVALUE.FILTER_CUTOFF },
        { name: "filter q", index: CWCC.FILTER_Q, defaultValue: DEFAULTVALUE.FILTER_Q },
        { name: "filter mod", index: CWCC.FILTER_MOD, defaultValue: DEFAULTVALUE.FILTER_MOD },
        { name: "filter env", index: CWCC.FILTER_ENV, defaultValue: DEFAULTVALUE.FILTER_ENV },

        { name: "filterEnvelope attack", index: CWCC.FILTERENV_ATTACK, defaultValue: DEFAULTVALUE.FILTERENV_ATTACK },
        { name: "filterEnvelope decay", index: CWCC.FILTERENV_DECAY, defaultValue: DEFAULTVALUE.FILTERENV_DECAY },
        { name: "filterEnvelope sustain", index: CWCC.FILTERENV_SUSTAIN, defaultValue: DEFAULTVALUE.FILTERENV_SUSTAIN },
        { name: "filterEnvelope release", index: CWCC.FILTERENV_RELEASE, defaultValue: DEFAULTVALUE.FILTERENV_RELEASE },

        { name: "volumeEnvelope attack", index: CWCC.VOLUMEENV_ATTACK, defaultValue: DEFAULTVALUE.VOLUMEENV_ATTACK },
        { name: "volumeEnvelope decay", index: CWCC.VOLUMEENV_DECAY, defaultValue: DEFAULTVALUE.VOLUMEENV_DECAY },
        { name: "volumeEnvelope sustain", index: CWCC.VOLUMEENV_SUSTAIN, defaultValue: DEFAULTVALUE.VOLUMEENV_SUSTAIN },
        { name: "volumeEnvelope release", index: CWCC.VOLUMEENV_RELEASE, defaultValue: DEFAULTVALUE.VOLUMEENV_RELEASE },

        { name: "multiply mod freq by 2 button", index: CWCC.MULTIPLY_MOD_FREQ_BY_2_BUTTON, defaultValue: DEFAULTVALUE.MULTIPLY_MOD_FREQ_BY_2_BUTTON, nItems: NITEMS.MULTIPLY_MOD_FREQ_BY_2_BUTTON }, // 2
		{ name: "multiply mod freq by 4 button", index: CWCC.MULTIPLY_MOD_FREQ_BY_4_BUTTON, defaultValue: DEFAULTVALUE.MULTIPLY_MOD_FREQ_BY_4_BUTTON, nItems: NITEMS.MULTIPLY_MOD_FREQ_BY_4_BUTTON }, // 2

		{ name: "master drive", index: CWCC.MASTER_DRIVE, defaultValue: DEFAULTVALUE.MASTER_DRIVE },
        { name: "master reverb", index: CWCC.MASTER_REVERB, defaultValue: DEFAULTVALUE.MASTER_REVERB },
	    { name: "master volume", index: CWCC.MASTER_VOLUME, defaultValue: DEFAULTVALUE.MASTER_VOLUME },

		// Standard (2-byte) controller.
		{ name: "reset controllers", index: CTL.ALL_CONTROLLERS_OFF}       
	],

	CWMIDISynth = function()
	{
		if(!(this instanceof CWMIDISynth))
		{
			return new CWMIDISynth();
		}

		// WebMIDIAPI §4.6 -- MIDIPort interface
		// See https://github.com/notator/WebMIDISynthHost/issues/23
		// and https://github.com/notator/WebMIDISynthHost/issues/24
        Object.defineProperty(this, "id", { value: "CW_MIDISynth_v1", writable: false });
		Object.defineProperty(this, "manufacturer", { value: "chris wilson", writable: false });
		Object.defineProperty(this, "name", { value: "CW_MIDISynth", writable: false });
		Object.defineProperty(this, "type", { value: "output", writable: false });
		Object.defineProperty(this, "version", { value: "1", writable: false });
		Object.defineProperty(this, "ondisconnect", { value: null, writable: false }); // Do we need this at all? Is it correct to set it to null?

		/*** Is this necessary? See https://github.com/WebAudio/web-midi-api/issues/110 ***/
		Object.defineProperty(this, "removable", { value: true, writable: false });

		/*** Extensions for software synths ***/
		Object.defineProperty(this, "url", { value: "https://webaudiodemos.appspot.com/midi-synth/index.html", writable: false }); // The synth author's webpage hosting the synth.		
		Object.defineProperty(this, "commands", { value: commands, writable: false }); // The commands supported by this synth (see above).		
		Object.defineProperty(this, "controls", { value: controls, writable: false }); // The controls supported by this synth (see above).		
		Object.defineProperty(this, "isMultiChannel", { value: false, writable: false }); // If isMultiChannel is false, the synth ignores the channel nibble in MIDI messages
		Object.defineProperty(this, "isPolyphonic", { value: true, writable: false }); // If isPolyphonic is false, the synth can only play one note at a time

		Object.defineProperty(this, "core", { value: core, writable: false });
	},

	API =
	{
		CWMIDISynth: CWMIDISynth // constructor
	};
	// end var

	// WebMIDIAPI §4.6 -- MIDIPort interface
	// See https://github.com/notator/WebMIDISynthHost/issues/24
	CWMIDISynth.prototype.open = function()
	{
		this.core.initAudio();
		console.log("cwMIDISynth opened.");
	};

	// WebMIDIAPI §4.6 -- MIDIPort interface
	// See https://github.com/notator/WebMIDISynthHost/issues/24
	CWMIDISynth.prototype.close = function()
	{
		console.log("cwMIDISynth closed.");
	};

	// WebMIDIAPI MIDIOutput send()
	// This synth does not support timestamps
	CWMIDISynth.prototype.send = function(message, ignoredTimestamp)
	{
		var
		commandIndex = message[0] & 0xF0,
		channel = message[0] & 0xF,
		data1 = message[1],
		data2 = message[2],
		that = this;

		function checkCommandExport(commandIndex)
		{
			var command = commands.find(cmd => cmd === commandIndex);
			if(command === undefined)
			{
				console.warn( "Command " + commandIndex.toString(10) + " (0x" + commandIndex.toString(16) + ") is not supported.");
			}
		}
		function checkControlExport(controlIndex)
		{
			var control = controls.find(ctl => ctl.index === controlIndex);

			if(control === undefined)
			{
				console.warn( "Controller " + controlIndex.toString(10) + " (0x" + controlIndex.toString(16) + ") is not supported.");
			}
		}
		function handleNoteOff(channel, data1, data2)
		{
			that.core.noteOff(data1);
			console.log("cwMIDISynth NoteOff: channel:" + channel + " note:" + data1 + " velocity:" + data2 + " (channel is ignored)");
		}
		function handleNoteOn(channel, data1, data2)
		{
			that.core.noteOn(data1, data2);
			console.log("cwMIDISynth NoteOn: channel:" + channel + " note:" + data1 + " velocity:" + data2 + " (channel is ignored)");
		}
		function handleControl(channel, data1, data2)
		{
			var
			index,
			controller = that.core.controller, // function
			CWCCINDEX = WebMIDI.cwConstants.CW_CCINDEX,
			NITEMS =  WebMIDI.cwConstants.CW_NITEMS;

			function resetAllControllers()
			{
				var
				i,
				CWCCINDEX = WebMIDI.cwConstants.CW_CCINDEX,
				DEFAULTVALUE = WebMIDI.cwConstants.CW_DEFAULT,
				controls = that.controls,
				controller = that.core.controller; // function

				for(i = 0; i < controls.length; ++i)
				{
					switch(controls[i])
					{
						case CWCCINDEX.MASTER_DRIVE:
							controller(CWCCINDEX.MASTER_DRIVE, DEFAULTVALUE.MASTER_DRIVE);
							break;
						case CWCCINDEX.MASTER_REVERB:
							controller(CWCCINDEX.MASTER_REVERB, DEFAULTVALUE.MASTER_REVERB);
							break;
						case CWCCINDEX.MASTER_VOLUME:
							controller(CWCCINDEX.MASTER_VOLUME, DEFAULTVALUE.MASTER_VOLUME);
							break;

						case CWCCINDEX.MOD_WAVEFORM:
							controller(CWCCINDEX.MOD_WAVEFORM, DEFAULTVALUE.MOD_WAVEFORM);
							break;
						case CWCCINDEX.MOD_FREQ:
							controller(CWCCINDEX.MOD_FREQ, DEFAULTVALUE.MOD_FREQ);
							break;
						case CWCCINDEX.MOD_OSC1_TREMOLO:
							controller(CWCCINDEX.MOD_OSC1_TREMOLO, DEFAULTVALUE.MOD_OSC1_TREMOLO);
							break;
						case CWCCINDEX.MOD_OSC2_TREMOLO:
							controller(CWCCINDEX.MOD_OSC2_TREMOLO, DEFAULTVALUE.MOD_OSC2_TREMOLO);
							break;

						case CWCCINDEX.OSC1_WAVEFORM:
							controller(CWCCINDEX.OSC1_WAVEFORM, DEFAULTVALUE.OSC1_WAVEFORM);
							break;
						case CWCCINDEX.OSC1_OCTAVE:
							controller(CWCCINDEX.OSC1_OCTAVE, DEFAULTVALUE.OSC1_OCTAVE);
							break;
						case CWCCINDEX.OSC1_DETUNE:
							controller(CWCCINDEX.OSC1_DETUNE, DEFAULTVALUE.OSC1_DETUNE);
							break;
						case CWCCINDEX.OSC1_MIX:
							controller(CWCCINDEX.OSC1_MIX, DEFAULTVALUE.OSC1_MIX);
							break;

						case CWCCINDEX.OSC2_WAVEFORM:
							controller(CWCCINDEX.OSC2_WAVEFORM, DEFAULTVALUE.OSC2_WAVEFORM);
							break;
						case CWCCINDEX.OSC2_OCTAVE:
							controller(CWCCINDEX.OSC2_OCTAVE, DEFAULTVALUE.OSC2_OCTAVE);
							break;
						case CWCCINDEX.OSC2_DETUNE:
							controller(CWCCINDEX.OSC2_DETUNE, DEFAULTVALUE.OSC2_DETUNE);
							break;
						case CWCCINDEX.OSC2_MIX:
							controller(CWCCINDEX.OSC2_MIX, DEFAULTVALUE.OSC2_MIX);
							break;

						case CWCCINDEX.FILTER_CUTOFF:
							controller(CWCCINDEX.FILTER_CUTOFF, DEFAULTVALUE.FILTER_CUTOFF);
							break;
						case CWCCINDEX.FILTER_Q:
							controller(CWCCINDEX.FILTER_Q, DEFAULTVALUE.FILTER_Q);
							break;
						case CWCCINDEX.FILTER_MOD:
							controller(CWCCINDEX.FILTER_MOD, DEFAULTVALUE.FILTER_MOD);
							break;
						case CWCCINDEX.FILTER_ENV:
							controller(CWCCINDEX.FILTER_ENV, DEFAULTVALUE.FILTER_ENV);
							break;

						case CWCCINDEX.FILTERENV_ATTACK:
							controller(CWCCINDEX.FILTERENV_ATTACK, DEFAULTVALUE.FILTERENV_ATTACK);
							break;
						case CWCCINDEX.FILTERENV_DECAY:
							controller(CWCCINDEX.FILTERENV_DECAY, DEFAULTVALUE.FILTERENV_DECAY);
							break;
						case CWCCINDEX.FILTERENV_SUSTAIN:
							controller(CWCCINDEX.FILTERENV_SUSTAIN, DEFAULTVALUE.FILTERENV_SUSTAIN);
							break;
						case CWCCINDEX.FILTERENV_RELEASE:
							controller(CWCCINDEX.FILTERENV_RELEASE, DEFAULTVALUE.FILTERENV_RELEASE);
							break;

						case CWCCINDEX.VOLUMEENV_ATTACK:
							controller(CWCCINDEX.VOLUMEENV_ATTACK, DEFAULTVALUE.VOLUMEENV_ATTACK);
							break;
						case CWCCINDEX.VOLUMEENV_DECAY:
							controller(CWCCINDEX.VOLUMEENV_DECAY, DEFAULTVALUE.VOLUMEENV_DECAY);
							break;
						case CWCCINDEX.VOLUMEENV_SUSTAIN:
							controller(CWCCINDEX.VOLUMEENV_SUSTAIN, DEFAULTVALUE.VOLUMEENV_SUSTAIN);
							break;
						case CWCCINDEX.VOLUMEENV_RELEASE:
							controller(CWCCINDEX.VOLUMEENV_RELEASE, DEFAULTVALUE.VOLUMEENV_RELEASE);
							break;

						case CWCCINDEX.MULTIPLY_MOD_FREQ_BY_2_BUTTON:
							controller(CWCCINDEX.MULTIPLY_MOD_FREQ_BY_2_BUTTON, DEFAULTVALUE.MULTIPLY_MOD_FREQ_BY_2_BUTTON);
							break;
						case CWCCINDEX.MULTIPLY_MOD_FREQ_BY_4_BUTTON:
							controller(CWCCINDEX.MULTIPLY_MOD_FREQ_BY_4_BUTTON, DEFAULTVALUE.MULTIPLY_MOD_FREQ_BY_4_BUTTON);
							break;

						default:
							// ignore reset and the duplicate controls
							break;
					}
				}
				console.log("cwMIDISynth resetAllControllers().");
			}

			function getIndex(value, nItems)
			{
				var
				i, rval = 0,
				partitionSize = 127 / nItems,
				p = partitionSize,
				limit = Math.round(p);

				for(i = 0; i < nItems; ++i)
				{
					if(value <= limit)
					{
						rval = i;
						break;					
					}
					p += partitionSize;
					limit = Math.round(p);
				}

				return (rval);

			}
			// This synth calls console.warn(...) if data1 is the index
			// of a control	that is not present in its controls array.
			switch(data1)
			{
				case CWCCINDEX.RESET:
					checkControlExport(data1);
					resetAllControllers();
					break;

				// master
				case CWCCINDEX.MASTER_DRIVE:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setMasterDrive(" + data2 + ")");
					break;
				case CWCCINDEX.MASTER_REVERB:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setMasterReverb(" + data2 + ")");
					break;
				case CWCCINDEX.MASTER_VOLUME:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setMasterVolume(" + data2 + ")");
					break;

				// mod
				case CWCCINDEX.MOD_WAVEFORM:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.MOD_WAVEFORM);
					controller(data1, index);
					console.log("cwMIDISynth setModShape(" + index + ")");
					break;
				case CWCCINDEX.MOD_FREQ:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setModFreq(" + data2 + ")");
					break;
				case CWCCINDEX.MOD_OSC1_TREMOLO:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setModOsc1Tremolo(" + data2 + ")");
					break;
				case CWCCINDEX.MOD_OSC2_TREMOLO:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setModOsc2Tremolo(" + data2 + ")");
					break;

					// osc1
				case CWCCINDEX.OSC1_WAVEFORM:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.OSC1_WAVEFORM);
					controller(data1, index);
					console.log("cwMIDISynth setOsc1Waveform(" + index + ")");
					break;
				case CWCCINDEX.OSC1_OCTAVE:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.OSC1_OCTAVE);
					controller(data1, index);
					console.log("cwMIDISynth setOsc1Octave(" + index + ")");
					break;
				case CWCCINDEX.OSC1_DETUNE:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setOsc1Detune(" + data2 + ")");
					break;
				case CWCCINDEX.OSC1_MIX:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setOsc1Mix(" + data2 + ")");
					break;

					// osc2
				case CWCCINDEX.OSC2_WAVEFORM:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.OSC2_WAVEFORM);
					controller(data1, index);
					console.log("cwMIDISynth setOsc2Waveform(" + index + ")");
					break;
				case CWCCINDEX.OSC2_OCTAVE:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.OSC2_OCTAVE);
					controller(data1, index);
					console.log("cwMIDISynth setOsc2Octave(" + index + ")");
					break;
				case CWCCINDEX.OSC2_DETUNE:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setOsc2Detune(" + data2 + ")");
					break;
				case CWCCINDEX.OSC2_MIX:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setOsc2Mix(" + data2 + ")");
					break;

					// filter
				case CWCCINDEX.FILTER_CUTOFF:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterCutoff(" + data2 + ")");
					break;
				case CWCCINDEX.FILTER_Q:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterQ(" + data2 + ")");
					break;
				case CWCCINDEX.FILTER_MOD:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterMod(" + data2 + ")");
					break;
				case CWCCINDEX.FILTER_ENV:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterEnv(" + data2 + ")");
					break;

					// filter envelope
				case CWCCINDEX.FILTERENV_ATTACK:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterEnvelopeAttack(" + data2 + ")");
					break;
				case CWCCINDEX.FILTERENV_DECAY:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterEnvelopeDecay(" + data2 + ")");
					break;
				case CWCCINDEX.FILTERENV_SUSTAIN:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterEnvelopeSustain(" + data2 + ")");
					break;
				case CWCCINDEX.FILTERENV_RELEASE:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterEnvelopeRelease(" + data2 + ")");
					break;

					// volume envelope
				case CWCCINDEX.VOLUMEENV_ATTACK:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setVolumeEnvelopeAttack(" + data2 + ")");
					break;
				case CWCCINDEX.VOLUMEENV_DECAY:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setVolumeEnvelopeDecay(" + data2 + ")");
					break;
				case CWCCINDEX.VOLUMEENV_SUSTAIN:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setVolumeEnvelopeSustain(" + data2 + ")");
					break;
				case CWCCINDEX.VOLUMEENV_RELEASE:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setVolumeEnvelopeRelease(" + data2 + ")");
					break;

					// buttons
				case CWCCINDEX.MULTIPLY_MOD_FREQ_BY_2_BUTTON:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.MULTIPLY_MOD_FREQ_BY_2_BUTTON);
					controller(data1, index);
					console.log("cwMIDISynth: multiply mod freq by 2 (" + index + ")");
					break;
				case CWCCINDEX.MULTIPLY_MOD_FREQ_BY_4_BUTTON:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.MULTIPLY_MOD_FREQ_BY_4_BUTTON);
					controller(data1, index);
                    console.log("cwMIDISynth: multiply mod freq by 4 (" + index + ")");
					break;

				default:
					console.warn( "There is no control defined with index " + data1.toString(10) + " (0x" + data1.toString(16) + ")");
			}
		}
		function handlePitchWheel(channel, data1)
		{
			var value = ((data1 * 2) / 127) - 1; // data1 is in range [0..127]
			that.core.pitchWheel(value); // value is in range [-1..1]
			console.log("cwMIDISynth PitchWheel: data1:" + data1 + " (value:" + value + ")");
		}

		switch(commandIndex)
		{
			case CMD.NOTE_OFF:
				checkCommandExport(CMD.NOTE_OFF);
				handleNoteOff(channel, data1, data2);
				break;
			case CMD.NOTE_ON:
				checkCommandExport(CMD.NOTE_ON);
				if(data2 === 0)
				{
					handleNoteOff(channel, data1, data2);
				}
				else
				{
					handleNoteOn(channel, data1, data2);
				}
				break;
			//case CMD.AFTERTOUCH:
			//	console.warn("CMD.AFTERTOUCH is not implemented.");
			//	break;
			case CMD.CONTROL_CHANGE:
				checkCommandExport(CMD.CONTROL_CHANGE);
				handleControl(channel, data1, data2);
				break;
			//case CMD.PRESET:
			//	console.warn( "CMD.PRESET is not implemented.");
			//	//checkCommandExport(CMD.PRESET);
			//	//handlePreset(channel, data1);
			//	break;
			//case CMD.CHANNEL_PRESSURE:
			//	console.warn("CMD.CHANNEL_PRESSURE is not implemented.");
			//	break;
			case CMD.PITCHWHEEL:
				checkCommandExport(CMD.PITCHWHEEL);
				handlePitchWheel(channel, data1);
				break;
			default:
				console.warn( "Command " + commandIndex.toString(10) + " (0x" + commandIndex.toString(16) + ") is not implemented.");
			}
	};

	return API;

}());
