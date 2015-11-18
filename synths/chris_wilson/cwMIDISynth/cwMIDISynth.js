/*
*  copyright 2015 Chris Wilson, James Ingram
*  https://github.com/cwilso
*  http://james-ingram-act-two.de/
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

/*jslint bitwise: false, nomen: true, plusplus: true, white: true */
/*global WebMIDI: false,  window: false,  document: false, performance: false, console: false, alert: false, XMLHttpRequest: false */

WebMIDI.namespace('WebMIDI.cwMIDISynth');

WebMIDI.cwMIDISynth = (function()
{
	"use strict";

	var
	CMD = WebMIDI.constants.COMMAND,
	CTL = WebMIDI.constants.CONTROL,
	CUSTOMCONTROL = WebMIDI.constants.CUSTOMCONTROL,
	CW_DEFAULT = WebMIDI.cwConstants.CW_DEFAULT,
	core = WebMIDI.cwMIDISynthCore,

	commands =
	[
		CMD.NOTE_OFF,
		CMD.NOTE_ON,
		CMD.CONTROL_CHANGE,
		CMD.CUSTOMCONTROL_CHANGE, // See constants.js and utilities.js
		//CMD.PATCH_CHANGE,
		//CMD.CHANNEL_PRESSURE,
		CMD.PITCHWHEEL
	],

	// Numbers in this array define Standard MIDI controls, objects define custom controls.
	controls =
	[
		// Custom controls
		// ji: Custom control indices must be unique and in the range [0..127]. They can be freely chosen here, except that
		// 126 and 127 are reseved for Aftertouch controls (see WebMIDI.constants.js and WebMIDI.utilities.js).
		// The defaultValues here are all integral MIDI controller values in the range [0..127]. They are defined as constants
		// because they are needed by CTL.ALL_CONTROLLERS_OFF (which resets all controls to their default values).
		// nDiscreteItems is set for non-continuous controls such as switches, knobs with a fixed number of settings or
		// html <select>s. It describes the number of options in the control.
		// If nDiscreteItems is defined, then the control will have valid values in the range [0..nDiscreteItems - 1].
		// If neither defaultValue nor nDiscreteItems is defined, the control has a 2-byte message (like CTL.ALL_NOTES_OFF).
        { name: "mod waveform", index: 0, defaultValue: CW_DEFAULT.MOD_WAVEFORM, nDiscreteItems: 4 }, // WAVEFORM.SINE
        { name: "mod freq", index: 1, defaultValue: CW_DEFAULT.MOD_FREQ },
        { name: "mod osc1 tremolo", index: 2, defaultValue: CW_DEFAULT.MOD_OSC1_TREMOLO },
        { name: "mod osc2 tremolo", index: 3, defaultValue: CW_DEFAULT.MOD_OSC2_TREMOLO },

        { name: "osc1 waveform", index: 4, defaultValue: CW_DEFAULT.OSC1_WAVEFORM, nDiscreteItems: 4 }, // WAVEFORM.SAW
        { name: "osc1 interval", index: 5, defaultValue: CW_DEFAULT.OSC1_INTERVAL, nDiscreteItems: 3 }, // OSC1_INTERVAL.F32
        { name: "osc1 detune", index: 6, defaultValue: CW_DEFAULT.OSC1_DETUNE },
        { name: "osc1 mix", index: 7, defaultValue: CW_DEFAULT.OSC1_MIX },

        { name: "osc2 waveform", index: 8, defaultValue: CW_DEFAULT.OSC2_WAVEFORM, nDiscreteItems: 4 }, // WAVEFORM.SAW
        { name: "osc2 interval", index: 9, defaultValue: CW_DEFAULT.OSC2_INTERVAL, nDiscreteItems: 3 }, // OSC2_INTERVAL.F16
        { name: "osc2 detune", index: 10, defaultValue: CW_DEFAULT.OSC2_DETUNE },
        { name: "osc2 mix", index: 11, defaultValue: CW_DEFAULT.OSC2_MIX },

        { name: "filter cutoff", index: 12, defaultValue: CW_DEFAULT.FILTER_CUTOFF },
        { name: "filter q", index: 13, defaultValue: CW_DEFAULT.FILTER_Q },
        { name: "filter mod", index: 14, defaultValue: CW_DEFAULT.FILTER_MOD },
        { name: "filter env", index: 15, defaultValue: CW_DEFAULT.FILTER_ENV },

        { name: "filterEnvelope attack", index: 16, defaultValue: CW_DEFAULT.FILTERENV_ATTACK },
        { name: "filterEnvelope decay", index: 17, defaultValue: CW_DEFAULT.FILTERENV_DECAY },
        { name: "filterEnvelope sustain", index: 18, defaultValue: CW_DEFAULT.FILTERENV_SUSTAIN },
        { name: "filterEnvelope release", index: 19, defaultValue: CW_DEFAULT.FILTERENV_RELEASE },

        { name: "volumeEnvelope attack", index: 20, defaultValue: CW_DEFAULT.VOLUMEENV_ATTACK },
        { name: "volumeEnvelope decay", index: 21, defaultValue: CW_DEFAULT.VOLUMEENV_DECAY },
        { name: "volumeEnvelope sustain", index: 22, defaultValue: CW_DEFAULT.VOLUMEENV_SUSTAIN },
        { name: "volumeEnvelope release", index: 23, defaultValue: CW_DEFAULT.VOLUMEENV_RELEASE },

		{ name: "master drive", index: 24, defaultValue: CW_DEFAULT.MASTER_DRIVE },
        { name: "master reverb", index: 25, defaultValue: CW_DEFAULT.MASTER_REVERB },
	    { name: "master volume", index: 26, defaultValue: CW_DEFAULT.MASTER_VOLUME },

		{ name: "aftertouch key", index: CUSTOMCONTROL.AFTERTOUCH_KEY, defaultValue:0 },
		{ name: "aftertouch pressure", index: CUSTOMCONTROL.AFTERTOUCH_PRESSURE, defaultValue:0 },

		// Standard (2-byte) controller.
        CTL.ALL_CONTROLLERS_OFF
	],

	CWMIDISynth = function()
	{
		if(!(this instanceof CWMIDISynth))
		{
			return new CWMIDISynth();
		}

		/** WebMIDIAPI §10 -- MIDIPort interface **/
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

		Object.defineProperty(this, "core", { value: core, writable: false }); // If isPolyphonic is false, the synth can only play one note at a time
	},

	API =
	{
		CWMIDISynth: CWMIDISynth // constructor
	};
	// end var

	// The init function should be called immediately after the synth has been constructed.
	CWMIDISynth.prototype.init = function()
	{
		this.core.initAudio();
		console.log("cwMIDISynth initialised.");
	};

	// WebMIDIAPI MIDIOutput send()
	// This synth does not support timestamps
	CWMIDISynth.prototype.send = function(message, ignoredTimestamp)
	{
		var
		command = message[0]& 0xF0,
		channel = message[0]& 0xF,
		data1 = message[1],
		data2 = message[2],
		that = this;

		function checkCommandExport(command)
		{
			var index = commands.indexOf(command);
			if(index < 0)
			{
				throw "Error: ".concat("Command ", command.toString(10), " (0x", command.toString(16), ") is not being exported.");
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
				throw "Error: ".concat("Controller ", controlIndex.toString(10), " (0x", controlIndex.toString(16), ") is not being exported.");
			}
		}
		function handleNoteOff(channel, data1, data2)
		{
			that.core.noteOff(data1);
			console.log("cwMIDISynth NoteOff:".concat(" channel:", channel, " note:", data1, " velocity:", data2, " (channel and velocity are ignored)"));
		}
		function handleNoteOn(channel, data1, data2)
		{
			that.core.noteOn(data1, data2);
			console.log("cwMIDISynth NoteOn:".concat(" channel:", channel, " note:", data1, " velocity:", data2, " (channel and velocity are ignored)"));
		}
		function handleControl(channel, data1, data2)
		{
			function resetAllControllers()
			{
				var
				i, CWDEF = WebMIDI.cwConstants.CW_DEFAULT,
				controls = that.controls,
				controller = that.core.controller, // function
				controllerIndex;

				for(i = 0; i < controls.length; ++i)
				{
					controllerIndex = controls[i].index; // is undefined for standard controls
					switch(controllerIndex) // ji controller indices
					{
						case 0:
							controller(0, CWDEF.MOD_WAVEFORM);
							break;
						case 1:
							controller(1, CWDEF.MOD_FREQ);
							break;
						case 2:
							controller(2, CWDEF.MOD_OSC1_TREMOLO);
							break;
						case 3:
							controller(3, CWDEF.MOD_OSC2_TREMOLO);
							break;

						case 4:
							controller(4, CWDEF.OSC1_WAVEFORM);
							break;
						case 5:
							controller(5, CWDEF.OSC1_INTERVAL);
							break;
						case 6:
							controller(6, CWDEF.OSC1_DETUNE);
							break;
						case 7:
							controller(7, CWDEF.OSC1_MIX);
							break;

						case 8:
							controller(8, CWDEF.OSC2_WAVEFORM);
							break;
						case 9:
							controller(9, CWDEF.OSC2_INTERVAL);
							break;
						case 10:
							controller(10, CWDEF.OSC2_DETUNE);
							break;
						case 11:
							controller(11, CWDEF.OSC2_MIX);
							break;

						case 12:
							controller(12, CWDEF.FILTER_CUTOFF);
							break;
						case 13:
							controller(13, CWDEF.FILTER_Q);
							break;
						case 14:
							controller(14, CWDEF.FILTER_MOD);
							break;
						case 15:
							controller(15, CWDEF.FILTER_ENV);
							break;

						case 16:
							controller(16, CWDEF.FILTERENV_ATTACK);
							break;
						case 17:
							controller(17, CWDEF.FILTERENV_DECAY);
							break;
						case 18:
							controller(18, CWDEF.FILTERENV_SUSTAIN);
							break;
						case 19:
							controller(19, CWDEF.FILTERENV_RELEASE);
							break;

						case 20:
							controller(20, CWDEF.VOLUMEENV_ATTACK);
							break;
						case 21:
							controller(21, CWDEF.VOLUMEENV_DECAY);
							break;
						case 22:
							controller(22, CWDEF.VOLUMEENV_SUSTAIN);
							break;
						case 23:
							controller(23, CWDEF.VOLUMEENV_RELEASE);
							break;

						case 24:
							controller(24, CWDEF.MASTER_DRIVE);
							break;
						case 25:
							controller(25, CWDEF.MASTER_REVERB);
							break;
						case 26:
							controller(26, CWDEF.MASTER_VOLUME);
							break;
						case CUSTOMCONTROL.AFTERTOUCH_KEY:
							controller(CUSTOMCONTROL.AFTERTOUCH_KEY, CWDEF.MOD_WAVEFORM);
							break;
						case CUSTOMCONTROL.AFTERTOUCH_PRESSURE:
							controller(CUSTOMCONTROL.AFTERTOUCH_PRESSURE, CWDEF.MOD_WAVEFORM);
							break;
					}
				}
				console.log("cwMIDISynth resetAllControllers().");
			}

			// If data1 is the index of a control that is not present in the
			// control array, an exception is thrown in the default:
			switch(data1)
			{
				case CTL.ALL_CONTROLLERS_OFF:
					checkControlExport(data1);
					resetAllControllers();
					break;
				default:
					throw "Error: Unknown standard controller"
					break;
			}
		}
		function handleCustomControlChange(channel, data1, data2)
		{
			// If data1 is the index of a control that is not present in the
			// control array, an exception is thrown in the default:
			switch(data1)
			{
				// mod
				case controls[0].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setModShape(".concat(data2, ")"));
					break;
				case controls[1].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setModFreq(".concat(data2, ")"));
					break;
				case controls[2].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setModOsc1Tremolo(".concat(data2, ")"));
					break;
				case controls[3].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setModOsc2Tremolo(".concat(data2, ")"));
					break;

					// osc1
				case controls[4].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setOsc1Waveform(".concat(data2, ")"));
					break;
				case controls[5].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setOsc1Interval(".concat(data2, ")"));
					break;
				case controls[6].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setOsc1Detune(".concat(data2, ")"));
					break;
				case controls[7].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setOsc1Mix(".concat(data2, ")"));
					break;

					// osc2
				case controls[8].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setOsc2Waveform(".concat(data2, ")"));
					break;
				case controls[9].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setOsc2Interval(".concat(data2, ")"));
					break;
				case controls[10].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setOsc2Detune(".concat(data2, ")"));
					break;
				case controls[11].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setOsc2Mix(".concat(data2, ")"));
					break;

					// filter
				case controls[12].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setFilterCutoff(".concat(data2, ")"));
					break;
				case controls[13].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setFilterQ(".concat(data2, ")"));
					break;
				case controls[14].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setFilterMod(".concat(data2, ")"));
					break;
				case controls[15].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setFilterEnv(".concat(data2, ")"));
					break;

					// filter envelope
				case controls[16].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setFilterEnvelopeAttack(".concat(data2, ")"));
					break;
				case controls[17].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setFilterEnvelopeDecay(".concat(data2, ")"));
					break;
				case controls[18].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setFilterEnvelopeSustain(".concat(data2, ")"));
					break;
				case controls[19].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setFilterEnvelopeRelease(".concat(data2, ")"));
					break;

					// volume envelope
				case controls[20].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setVolumeEnvelopeAttack(".concat(data2, ")"));
					break;
				case controls[21].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setVolumeEnvelopeDecay(".concat(data2, ")"));
					break;
				case controls[22].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setVolumeEnvelopeSustain(".concat(data2, ")"));
					break;
				case controls[23].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setVolumeEnvelopeRelease(".concat(data2, ")"));
					break;

					// master
				case controls[24].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setMasterDrive(".concat(data2, ")"));
					break;
				case controls[25].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setMasterReverb(".concat(data2, ")"));
					break;
				case controls[26].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setMasterVolume(".concat(data2, ")"));
					break;

					// Aftertouch
				case controls[27].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setAftertouchKey(".concat(data2, ")"));
					break;
				case controls[28].index:
					checkControlExport(data1);
					that.core.controller(data1, data2);
					console.log("cwMIDISynth setAftertouchPressure(".concat(data2, ")"));
					break;

				default:
					throw "Error: ".concat("There is no control defined with index ", data1.toString(10), " (0x", data1.toString(16), ")");
			}
		}
		//function handlePatchChange(channel, data1)
		//{
		//	console.log("cwMIDISynth Patch:".concat(" channel:", channel, " value:", data1));
		//}
		//// CHANNEL_PRESSURE.data[1] is the amount of pressure 0..127.
		//function handleChannelPressure(channel, data1)
		//{
		//	console.log("cwMIDISynth ChannelPressure:".concat(" channel:", channel, " value:", data1));
		//}
		function handlePitchWheel(channel, data1, data2)
		{
			var value = ((data1 * 2) / 127) - 1; // data1 is in range [0..127]
			that.core.pitchWheel(value); // value is in range [-1..1]
			console.log("cwMIDISynth PitchWheel:".concat(" data1:", data1, " (value:", value, ")"));
		}

		switch(command)
		{
			case CMD.NOTE_OFF:
				checkCommandExport(CMD.NOTE_OFF);
				handleNoteOff(channel, data1, data2);
				break;
			case CMD.NOTE_ON:
				checkCommandExport(CMD.NOTE_ON);
				handleNoteOn(channel, data1, data2);
				break;
			case CMD.CONTROL_CHANGE:
				checkCommandExport(CMD.CONTROL_CHANGE);
				handleControl(channel, data1, data2);
				break;
			case CMD.CUSTOMCONTROL_CHANGE:
				checkCommandExport(CMD.CONTROL_CHANGE);
				handleCustomControlChange(channel, data1, data2);
				break;
				//case CMD.PATCH_CHANGE:
				//	checkCommandExport(CMD.PATCH_CHANGE);
				//	handlePatchChange(channel, data1);
				//	break;
				//case CMD.CHANNEL_PRESSURE:
				//	checkCommandExport(CMD.CHANNEL_PRESSURE);
				//	// CHANNEL_PRESSURE.data[1] is the amount of pressure 0..127.
				//	handleChannelPressure(channel, data1);
				//	break;
			case CMD.PITCHWHEEL:
				checkCommandExport(CMD.PITCHWHEEL);
				handlePitchWheel(channel, data1, data2);
				break;

			default:
				throw "Error: ".concat("Command ", command.toString(10), " (0x", command.toString(16), ") is not defined.");
			}
	};

	return API;

}());
