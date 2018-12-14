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
	core = WebMIDI.cwMIDISynthCore,

	commands =
	[
		CMD.NOTE_OFF,
		CMD.NOTE_ON,
		CMD.CONTROL_CHANGE,
		CMD.AFTERTOUCH,
		//CMD.PATCH_CHANGE,
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
        { name: "mod freq", index: CWCC.MOD_FREQ1, defaultValue: DEFAULTVALUE.MOD_FREQ },
        { name: "mod freq", index: CWCC.MOD_FREQ2, defaultValue: DEFAULTVALUE.MOD_FREQ },
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
        { name: "filter q", index: CWCC.FILTER_Q1, defaultValue: DEFAULTVALUE.FILTER_Q },
        { name: "filter q", index: CWCC.FILTER_Q2, defaultValue: DEFAULTVALUE.FILTER_Q },
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

        { name: "x1 button", index: CWCC.X1BUTTON1, defaultValue: DEFAULTVALUE.X1BUTTON, nItems: NITEMS.X1BUTTON }, // 2
        { name: "x1 button", index: CWCC.X1BUTTON2, defaultValue: DEFAULTVALUE.X1BUTTON, nItems: NITEMS.X1BUTTON }, // 2
        { name: "x2 button", index: CWCC.X2BUTTON1, defaultValue: DEFAULTVALUE.X2BUTTON, nItems: NITEMS.X2BUTTON }, // 2
        { name: "x2 button", index: CWCC.X2BUTTON2, defaultValue: DEFAULTVALUE.X2BUTTON, nItems: NITEMS.X2BUTTON }, // 2

		{ name: "master drive", index: CWCC.MASTER_DRIVE1, defaultValue: DEFAULTVALUE.MASTER_DRIVE },
		{ name: "master drive", index: CWCC.MASTER_DRIVE2, defaultValue: DEFAULTVALUE.MASTER_DRIVE },
		{ name: "master drive", index: CWCC.MASTER_DRIVE3, defaultValue: DEFAULTVALUE.MASTER_DRIVE },
        { name: "master reverb", index: CWCC.MASTER_REVERB1, defaultValue: DEFAULTVALUE.MASTER_REVERB },
        { name: "master reverb", index: CWCC.MASTER_REVERB2, defaultValue: DEFAULTVALUE.MASTER_REVERB },
        { name: "master reverb", index: CWCC.MASTER_REVERB3, defaultValue: DEFAULTVALUE.MASTER_REVERB },
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
		Object.defineProperty(this, "id", { value: "cwMIDISynth", writable: false });
		Object.defineProperty(this, "manufacturer", { value: "chris wilson", writable: false });
		Object.defineProperty(this, "name", { value: "MIDI synth (Chris Wilson)", writable: false });
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
		command = message[0] & 0xF0,
		channel = message[0] & 0xF,
		data1 = message[1],
		data2 = message[2],
		that = this;

		function checkCommandExport(command)
		{
			var index = commands.indexOf(command);
			if(index < 0)
			{
				console.warn( "Command " + command.toString(10) + " (0x" + command.toString(16) + ") is not supported.");
			}
		}
		function checkControlExport(controlIndex)
		{
			var i, found = false;

			for(i = 0; i < controls.length; ++i)
			{
				if((typeof controls[i] === "number" && controls[i] === controlIndex) || controls[i].index === controlIndex)
				{
					found = true;
					break;
				}
			}
			if(found === false)
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
		function handleAftertouch(channel, data1, data2)
		{
			that.core.polyPressure(data1, data2);
			console.log("cwMIDISynth PolyPressure: channel:" + channel + " note:" + data1 + " velocity:" + data2 + " (channel is ignored)");
		}
		function handleControl(channel, data1, data2)
		{
			var
			index,
			controller = that.core.controller, // function
			CWCC = WebMIDI.cwConstants.CW_CCINDEX,
			NITEMS =  WebMIDI.cwConstants.CW_NITEMS;

			function resetAllControllers()
			{
				var
				i,
				CWCC = WebMIDI.cwConstants.CW_CCINDEX,
				DEFAULTVALUE = WebMIDI.cwConstants.CW_DEFAULT,
				controls = that.controls,
				controller = that.core.controller; // function

				for(i = 0; i < controls.length; ++i)
				{
					switch(controls[i].index)
					{
						case CWCC.MASTER_DRIVE1:
							controller(CWCC.MASTER_DRIVE1, DEFAULTVALUE.MASTER_DRIVE);
							break;
						case CWCC.MASTER_REVERB1:
							controller(CWCC.MASTER_REVERB1, DEFAULTVALUE.MASTER_REVERB);
							break;
						case CWCC.MASTER_VOLUME:
							controller(CWCC.MASTER_VOLUME, DEFAULTVALUE.MASTER_VOLUME);
							break;

						case CWCC.MOD_WAVEFORM:
							controller(CWCC.MOD_WAVEFORM, DEFAULTVALUE.MOD_WAVEFORM);
							break;
						case CWCC.MOD_FREQ1:
							controller(CWCC.MOD_FREQ1, DEFAULTVALUE.MOD_FREQ);
							break;
						case CWCC.MOD_OSC1_TREMOLO:
							controller(CWCC.MOD_OSC1_TREMOLO, DEFAULTVALUE.MOD_OSC1_TREMOLO);
							break;
						case CWCC.MOD_OSC2_TREMOLO:
							controller(CWCC.MOD_OSC2_TREMOLO, DEFAULTVALUE.MOD_OSC2_TREMOLO);
							break;

						case CWCC.OSC1_WAVEFORM:
							controller(CWCC.OSC1_WAVEFORM, DEFAULTVALUE.OSC1_WAVEFORM);
							break;
						case CWCC.OSC1_OCTAVE:
							controller(CWCC.OSC1_OCTAVE, DEFAULTVALUE.OSC1_OCTAVE);
							break;
						case CWCC.OSC1_DETUNE:
							controller(CWCC.OSC1_DETUNE, DEFAULTVALUE.OSC1_DETUNE);
							break;
						case CWCC.OSC1_MIX:
							controller(CWCC.OSC1_MIX, DEFAULTVALUE.OSC1_MIX);
							break;

						case CWCC.OSC2_WAVEFORM:
							controller(CWCC.OSC2_WAVEFORM, DEFAULTVALUE.OSC2_WAVEFORM);
							break;
						case CWCC.OSC2_OCTAVE:
							controller(CWCC.OSC2_OCTAVE, DEFAULTVALUE.OSC2_OCTAVE);
							break;
						case CWCC.OSC2_DETUNE:
							controller(CWCC.OSC2_DETUNE, DEFAULTVALUE.OSC2_DETUNE);
							break;
						case CWCC.OSC2_MIX:
							controller(CWCC.OSC2_MIX, DEFAULTVALUE.OSC2_MIX);
							break;

						case CWCC.FILTER_CUTOFF:
							controller(CWCC.FILTER_CUTOFF, DEFAULTVALUE.FILTER_CUTOFF);
							break;
						case CWCC.FILTER_Q1:
							controller(CWCC.FILTER_Q1, DEFAULTVALUE.FILTER_Q);
							break;
						case CWCC.FILTER_MOD:
							controller(CWCC.FILTER_MOD, DEFAULTVALUE.FILTER_MOD);
							break;
						case CWCC.FILTER_ENV:
							controller(CWCC.FILTER_ENV, DEFAULTVALUE.FILTER_ENV);
							break;

						case CWCC.FILTERENV_ATTACK:
							controller(CWCC.FILTERENV_ATTACK, DEFAULTVALUE.FILTERENV_ATTACK);
							break;
						case CWCC.FILTERENV_DECAY:
							controller(CWCC.FILTERENV_DECAY, DEFAULTVALUE.FILTERENV_DECAY);
							break;
						case CWCC.FILTERENV_SUSTAIN:
							controller(CWCC.FILTERENV_SUSTAIN, DEFAULTVALUE.FILTERENV_SUSTAIN);
							break;
						case CWCC.FILTERENV_RELEASE:
							controller(CWCC.FILTERENV_RELEASE, DEFAULTVALUE.FILTERENV_RELEASE);
							break;

						case CWCC.VOLUMEENV_ATTACK:
							controller(CWCC.VOLUMEENV_ATTACK, DEFAULTVALUE.VOLUMEENV_ATTACK);
							break;
						case CWCC.VOLUMEENV_DECAY:
							controller(CWCC.VOLUMEENV_DECAY, DEFAULTVALUE.VOLUMEENV_DECAY);
							break;
						case CWCC.VOLUMEENV_SUSTAIN:
							controller(CWCC.VOLUMEENV_SUSTAIN, DEFAULTVALUE.VOLUMEENV_SUSTAIN);
							break;
						case CWCC.VOLUMEENV_RELEASE:
							controller(CWCC.VOLUMEENV_RELEASE, DEFAULTVALUE.VOLUMEENV_RELEASE);
							break;

						case CWCC.X1BUTTON1:
							controller(CWCC.X1BUTTON1, DEFAULTVALUE.X1BUTTON);
							break;
						case CWCC.X2BUTTON1:
							controller(CWCC.X2BUTTON1, DEFAULTVALUE.X2BUTTON);
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
				case CWCC.RESET:
					checkControlExport(data1);
					resetAllControllers();
					break;

				// master
				case CWCC.MASTER_DRIVE1:
				case CWCC.MASTER_DRIVE2:
				case CWCC.MASTER_DRIVE3:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setMasterDrive(" + data2 + ")");
					break;
				case CWCC.MASTER_REVERB1:
				case CWCC.MASTER_REVERB2:
				case CWCC.MASTER_REVERB3:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setMasterReverb(" + data2 + ")");
					break;
				case CWCC.MASTER_VOLUME:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setMasterVolume(" + data2 + ")");
					break;

				// mod
				case CWCC.MOD_WAVEFORM:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.MOD_WAVEFORM);
					controller(data1, index);
					console.log("cwMIDISynth setModShape(" + index + ")");
					break;
				case CWCC.MOD_FREQ1:
				case CWCC.MOD_FREQ2:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setModFreq(" + data2 + ")");
					break;
				case CWCC.MOD_OSC1_TREMOLO:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setModOsc1Tremolo(" + data2 + ")");
					break;
				case CWCC.MOD_OSC2_TREMOLO:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setModOsc2Tremolo(" + data2 + ")");
					break;

					// osc1
				case CWCC.OSC1_WAVEFORM:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.OSC1_WAVEFORM);
					controller(data1, index);
					console.log("cwMIDISynth setOsc1Waveform(" + index + ")");
					break;
				case CWCC.OSC1_OCTAVE:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.OSC1_OCTAVE);
					controller(data1, index);
					console.log("cwMIDISynth setOsc1Interval(" + index + ")");
					break;
				case CWCC.OSC1_DETUNE:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setOsc1Detune(" + data2 + ")");
					break;
				case CWCC.OSC1_MIX:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setOsc1Mix(" + data2 + ")");
					break;

					// osc2
				case CWCC.OSC2_WAVEFORM:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.OSC2_WAVEFORM);
					controller(data1, index);
					console.log("cwMIDISynth setOsc2Waveform(" + index + ")");
					break;
				case CWCC.OSC2_OCTAVE:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.OSC2_OCTAVE);
					controller(data1, index);
					console.log("cwMIDISynth setOsc2Interval(" + index + ")");
					break;
				case CWCC.OSC2_DETUNE:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setOsc2Detune(" + data2 + ")");
					break;
				case CWCC.OSC2_MIX:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setOsc2Mix(" + data2 + ")");
					break;

					// filter
				case CWCC.FILTER_CUTOFF:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterCutoff(" + data2 + ")");
					break;
				case CWCC.FILTER_Q1:
				case CWCC.FILTER_Q2:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterQ(" + data2 + ")");
					break;
				case CWCC.FILTER_MOD:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterMod(" + data2 + ")");
					break;
				case CWCC.FILTER_ENV:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterEnv(" + data2 + ")");
					break;

					// filter envelope
				case CWCC.FILTERENV_ATTACK:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterEnvelopeAttack(" + data2 + ")");
					break;
				case CWCC.FILTERENV_DECAY:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterEnvelopeDecay(" + data2 + ")");
					break;
				case CWCC.FILTERENV_SUSTAIN:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterEnvelopeSustain(" + data2 + ")");
					break;
				case CWCC.FILTERENV_RELEASE:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setFilterEnvelopeRelease(" + data2 + ")");
					break;

					// volume envelope
				case CWCC.VOLUMEENV_ATTACK:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setVolumeEnvelopeAttack(" + data2 + ")");
					break;
				case CWCC.VOLUMEENV_DECAY:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setVolumeEnvelopeDecay(" + data2 + ")");
					break;
				case CWCC.VOLUMEENV_SUSTAIN:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setVolumeEnvelopeSustain(" + data2 + ")");
					break;
				case CWCC.VOLUMEENV_RELEASE:
					checkControlExport(data1);
					controller(data1, data2);
					console.log("cwMIDISynth setVolumeEnvelopeRelease(" + data2 + ")");
					break;

					// buttons
				case CWCC.X1BUTTON1:
				case CWCC.X1BUTTON2:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.X1BUTTON);
					controller(data1, index);
					console.log("cwMIDISynth setX1Button(" + index + ")");
					break;
				case CWCC.X2BUTTON1:
				case CWCC.X2BUTTON2:
					checkControlExport(data1);
					index = getIndex(data2, NITEMS.X2BUTTON);
					controller(data1, index);
					console.log("cwMIDISynth setX2Button(" + index + ")");
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

		switch(command)
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
			case CMD.AFTERTOUCH:
				checkCommandExport(CMD.CONTROL_CHANGE);
				handleAftertouch(channel, data1, data2); //  data1 is key, data2 is pressure
				break;
			case CMD.CONTROL_CHANGE:
				checkCommandExport(CMD.CONTROL_CHANGE);
				handleControl(channel, data1, data2);
				break;
			case CMD.PATCH_CHANGE:
				console.warn( "CMD.PATCH_CHANGE is not implemented.");
				//checkCommandExport(CMD.PATCH_CHANGE);
				//handlePatchChange(channel, data1);
				break;
			case CMD.CHANNEL_PRESSURE:
				console.warn( "CMD.CHANNEL_PRESSURE is not implemented.");
				//checkCommandExport(CMD.CHANNEL_PRESSURE);
				// CHANNEL_PRESSURE.data[1] is the amount of pressure 0..127.
				//handleChannelPressure(channel, data1);
				break;
			case CMD.PITCHWHEEL:
				checkCommandExport(CMD.PITCHWHEEL);
				handlePitchWheel(channel, data1);
				break;
			default:
				console.warn( "Command " + command.toString(10) + " (0x" + command.toString(16) + ") is not defined.");
			}
	};

	return API;

}());
