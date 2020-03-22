/* Copyright 2015 James Ingram, gree
 * https://james-ingram-act-two.de/
 * https://github.com/gree
 *  
 * This code is based on the gree soundFont synthesizer at
 * https://github.com/gree/sf2synth.js
 *
 * All this code is licensed under MIT
 *
 * WebMIDI.residentSf2Synth namespace containing a ResidentSf2Synth constructor.
 * 
 * This soundFont synth plays soundFonts loaded using its setSoundFont(soundFont)
 * function. It also logs MIDI messages to the console.
 * The object of having this code is to be able to discuss and improve the interface.
 * It would, however, be nice if this synth could be optimised and improved by real
 * Web Audio programmers. See the Web MIDI Synth Host issues on GitHub.
 * https://github.com/notator/WebMIDISynthHost
 */

/* eslint no-unused-vars: 0 */

WebMIDI.namespace('WebMIDI.residentSf2Synth');

WebMIDI.residentSf2Synth = (function(window)
{
	"use strict";

	var
		/*********************************************************
		 * ji -- November 2015
		 * These variables were originally in the gree code.
		 * I have removed all references to the original gree GUI
		 * (i.e. the HTML <table> and the instrument names).
		 *********************************************************/
		bankIndex = 0,
		bankSet,
		ctx, // set in open()
		gainMaster,  // set in open() (ji)

		/** ji begin compressor commented out because unused November 2015 */
		/** @type {DynamicsCompressorNode} */
		// compressor,
		/** ji end compressor commented out because unused November 2015 */

		bufSrc,  // set in constructor (ji)
		channelInstrument =
			[0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 10, 11, 12, 13, 14, 15],
		channelVolume =
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		channelPanpot =
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		channelPitchBend =
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		channelRegisteredParameterCoarse =
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		channelDataEntryCoarse =
			[2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
		currentNoteOns = [],
		baseVolume = 1 / 0x8000,

		/*  end of gree variables  ****************************************/
		/******************************************************************/

		getAudioContext = function()
		{
			var AudioContext = (window.AudioContext || window.webkitAudioContext);

			return new AudioContext();
		},

		CMD = WebMIDI.constants.COMMAND,
		CTL = WebMIDI.constants.CONTROL,

		// The commands and controls arrays are part of a standard WebMIDI synth's interface.
		commands =
			[
				// The name strings and defaultValues (if any) for these are defined in WebMIDI.constants
				CMD.NOTE_OFF,
				CMD.NOTE_ON,
				// CMD.AFTERTOUCH is not defined,
				CMD.CONTROL_CHANGE,
				CMD.PRESET,
				// CMD.CHANNEL_PRESSURE is not defined,
				CMD.PITCHWHEEL
			],

		controls =
			[
				// standard 3-byte controllers.
				// The name strings and defaultValues for these are defined in WebMIDI.constants
				CTL.BANK,
				CTL.VOLUME,
				CTL.PAN,

				// REGISTERED_PARAMETER_COARSE can be set by client software, but it should never be set to anything except 0.
				// If the value is set to anything other than 0, attempts to retrieve pitchBendSensitivity will fail.
				// These synths don't use REGISTERED_PARAMETER_COARSE for anything else.
				// The REGISTERED_PARAMETER_COARSE control has been deliberately omitted from this synth's UI in the WebMIDISynthHost application. 
				CTL.REGISTERED_PARAMETER_COARSE,
				CTL.DATA_ENTRY_COARSE,

				// standard 2-byte controllers.
				// The name strings for these are defined in WebMIDI.constants
				CTL.ALL_CONTROLLERS_OFF,
				CTL.ALL_SOUND_OFF
			],

		ResidentSf2Synth = function()
		{
			if(!(this instanceof ResidentSf2Synth))
			{
				return new ResidentSf2Synth();
			}

			// WebMIDIAPI §4.6 -- MIDIPort interface
			// See https://github.com/notator/WebMIDISynthHost/issues/23
			// and https://github.com/notator/WebMIDISynthHost/issues/24
			Object.defineProperty(this, "id", { value: "ResidentSf2Synth_v1", writable: false });
			Object.defineProperty(this, "manufacturer", { value: "gree & james ingram", writable: false });
			Object.defineProperty(this, "name", { value: "ResidentSf2Synth", writable: false });
			Object.defineProperty(this, "type", { value: "output", writable: false });
			Object.defineProperty(this, "version", { value: "1", writable: false });
			Object.defineProperty(this, "ondisconnect", { value: null, writable: false }); // Do we need this at all? Is it correct to set it to null?

			/*** Is this necessary? See https://github.com/WebAudio/web-midi-api/issues/110 ***/
			/*** See also: disconnect() function below ***/
			Object.defineProperty(this, "removable", { value: true, writable: false });

			/*** Extensions for software synths ***/
			// The synth author's webpage hosting the synth. 
			Object.defineProperty(this, "url", { value: "https://github.com/notator/WebMIDISynthHost", writable: false });
			// The commands supported by this synth (see above).
			Object.defineProperty(this, "commands", { value: commands, writable: false });
			// The controls supported by this synth (see above).
			Object.defineProperty(this, "controls", { value: controls, writable: false });
			// If isMultiChannel is false or undefined, the synth ignores the channel nibble in MIDI messages
			Object.defineProperty(this, "isMultiChannel", { value: true, writable: false });
			// If isPolyphonic is false or undefined, the synth can only play one note at a time
			Object.defineProperty(this, "isPolyphonic", { value: true, writable: false });
			// If supportsGeneralMIDI is defined, and is true, then
			// 1. both COMMAND.PRESET and CONTROL.BANK MUST be defined.
			// 2. the presets in bank 0 can be usefully named using GM preset names.
			//    (GM preset names are returned by WebMIDI.constants.generalMIDIPresetName(presetIndex). )
			// 3. when the channel index is 9, notes can be usefully named using the GM percussion names.
			//    (GM percussion names are returned by WebMIDI.constants.generalMIDIPercussionName(noteIndex). )
			// 4. the synth MUST define the function:
			//        boolean presetIsAvailable(presetIndex).
			//    On their own, conditions 1-3 do not guarantee that a particular preset can be set.
			// 5. the synth MAY define the function:
			//        void setSoundFont(soundFont)
			//    It is possible for a synth to support GM without using soundfonts.
			// 6. a GM preset <select> control will be created in WebMidiSynthHost application.
			Object.defineProperty(this, "supportsGeneralMIDI", { value: true, writable: false });
		},

		API =
		{
			ResidentSf2Synth: ResidentSf2Synth // constructor
		};
	// end var

	// WebMIDIAPI §4.6 -- MIDIPort interface
	// See https://github.com/notator/WebMIDISynthHost/issues/24
	// This is called when the start button is clicked on page 1 of the Assistant Performer,
	// and the synth is selected in the outputDeviceSelector.
	ResidentSf2Synth.prototype.open = function()
	{
		// console.log("residentSf2Synth opened.");
		ctx = getAudioContext();
		gainMaster = ctx.createGain();

		/** ji begin compressor commented out because unused November 2015 */
		/** @type {DynamicsCompressorNode} */
		// compressor = ctx.createDynamicsCompressor();
		/** ji end compressor commented out because unused November 2015 */

		/** @type {AudioBufferSourceNode} */

		bufSrc = ctx.createBufferSource();

		for(let i = 0; i < 16; ++i)
		{
			currentNoteOns.push([]);
		}

		bufSrc.connect(gainMaster);
		gainMaster.connect(ctx.destination);
		bufSrc.start(0);

		// ji November 2015
		this.setMasterVolume(16383);
	};

	// WebMIDIAPI §4.6 -- MIDIPort interface
	// See https://github.com/notator/WebMIDISynthHost/issues/24
	ResidentSf2Synth.prototype.close = function()
	{
		// console.log("residentSf2Synth closed.");
	};

	// WebMIDIAPI MIDIOutput send()
	// This synth does not yet support timestamps (05.11.2015)
	ResidentSf2Synth.prototype.send = function(message, ignoredTimestamp)
	{
		var
			command = message[0] & 0xF0,
			channel = message[0] & 0xF,
			data1 = message[1],
			data2 = message[2],
			that = this;

		function checkCommandExport(command)
		{
			if(command === undefined)
			{
				console.warn("Illegal command");
			}
			else
			{
				let cmd = commands.find(cmd => cmd === command);
				if(cmd === undefined)
				{
					console.warn("Command " + command.toString(10) + " (0x" + command.toString(16) + ") is not supported.");
				}
			}
		}
		function handleNoteOff(channel, data1, data2)
		{
			checkCommandExport(CMD.NOTE_OFF);
			// console.log("residentSf2Synth NoteOff: channel:" + channel + " note:" + data1 + " velocity:" + data2);
			that.noteOff(channel, data1, data2);
		}
		function handleNoteOn(channel, data1, data2)
		{
			checkCommandExport(CMD.NOTE_ON);
			// console.log("residentSf2Synth NoteOn: channel:" + channel + " note:" + data1 + " velocity:" + data2);
			that.noteOn(channel, data1, data2);
		}
		function handleControl(channel, data1, data2)
		{
			function checkControlExport(control)
			{
				if(control === undefined)
				{
					console.warn("Illegal control");
				}
				else
				{
					let ctl = controls.find(ctl => ctl === control);
					if(ctl === undefined)
					{
						console.warn("Controller " + control.toString(10) + " (0x" + control.toString(16) + ") is not supported.");
					}
				}
			}
			function setBank(channel, value)
			{
				checkControlExport(CTL.BANK);
				// console.log("residentSf2Synth Bank: channel:" + channel + " value:" + value);
				bankIndex = value; // this is the complete implementation!
			}
			function setVolume(channel, value)
			{
				checkControlExport(CTL.VOLUME);
				// console.log("residentSf2Synth Volume: channel:" + channel + " value:" + value);
				that.volumeChange(channel, value);
			}
			function setPan(channel, value)
			{
				checkControlExport(CTL.PAN);
				// console.log("residentSf2Synth Pan: channel:" + channel + " value:" + value);
				that.panpotChange(channel, value);
			}

			function setAllControllersOff(channel)
			{
				checkControlExport(CTL.ALL_CONTROLLERS_OFF);
				// console.log("residentSf2Synth AllControllersOff: channel:" + channel);
				that.resetAllControl(channel);
			}
			function setAllSoundOff(channel)
			{
				checkControlExport(CTL.ALL_SOUND_OFF);
				// console.log("residentSf2Synth AllSoundOff: channel:" + channel);
				that.allSoundOff(channel);
			}

			function setRegisteredParameterCoarse(channel, param)
			{
				checkControlExport(CTL.REGISTERED_PARAMETER_COARSE);
				// console.log("residentSf2Synth RegisteredParameterCoarse: channel:" + channel + " value:" + param);
				if(param !== 0)
				{
					throw "This synth only supports registeredParameterCoarse = 0 (pitchWheelDeviation semitones)";
				}
				that.registeredParameterCoarse(channel, param);
			}

			function setDataEntryCoarse(channel, semitones)
			{
				checkControlExport(CTL.DATA_ENTRY_COARSE);
				// console.log("residentSf2Synth DataEntryCoarse: channel:" + channel + " value:" + semitones);
				that.dataEntryCoarse(channel, semitones);
			}

			checkCommandExport(CMD.CONTROL_CHANGE);
			// If the controller is not present in the controllers info array, it is ignored here
			switch(data1)
			{
				case CTL.BANK:
					setBank(channel, data2);
					break;
				case CTL.VOLUME:
					setVolume(channel, data2);
					break;
				case CTL.PAN:
					setPan(channel, data2);
					break;
				case CTL.ALL_CONTROLLERS_OFF:
					setAllControllersOff(channel);
					break;
				case CTL.ALL_SOUND_OFF:
					setAllSoundOff(channel);
					break;
				// CTL.REGISTERED_PARAMETER_FINE and CTL.DATA_ENTRY_FINE are not supported (i.e. are ignored by) this synth.
				case CTL.REGISTERED_PARAMETER_COARSE:
					setRegisteredParameterCoarse(channel, data2);
					break;
				case CTL.DATA_ENTRY_COARSE: // default coarse is semitones pitchWheelDeviation when RPC is 0
					setDataEntryCoarse(channel, data2);
					break;
				default:
					console.warn(`Controller ${data1.toString(10)} (0x${data1.toString(16)}) is not supported.`);
			}
		}
		function handlePresetChange(channel, data1)
		{
			checkCommandExport(CMD.PRESET);
			// console.log("residentSf2Synth preset: channel:" + channel, " value:" + data1);
			that.programChange(channel, data1);
		}
		function handlePitchWheel(channel, data1)
		{
			checkCommandExport(CMD.PITCHWHEEL);
			// console.log("residentSf2Synth PitchWheel: channel:" + channel, " value:" + data1);
			that.pitchBend(channel, data1, data2);
		}

		switch(command)
		{
			case CMD.NOTE_OFF:
				handleNoteOff(channel, data1, data2);
				break;
			case CMD.NOTE_ON:
				handleNoteOn(channel, data1, data2);
				break;
			case CMD.CONTROL_CHANGE:
				handleControl(channel, data1, data2);
				break;
			case CMD.PRESET:
				handlePresetChange(channel, data1);
				break;
			case CMD.PITCHWHEEL:
				handlePitchWheel(channel, data1, data2);
				break;
			default:
				console.warn("Command " + command.toString(10) + " (0x" + command.toString(16) + ") is not supported.");
		}
	};

	ResidentSf2Synth.prototype.setChannelControlDefaults = function(channel)
	{
		let commandDefaultValue = WebMIDI.constants.commandDefaultValue,
			controlDefaultValue = WebMIDI.constants.controlDefaultValue;

		this.pitchBend(channel, 0, commandDefaultValue(CMD.PITCHWHEEL)); // 0, 64 -- was 0x00, 0x40 (8192)

		this.volumeChange(channel, controlDefaultValue(CTL.VOLUME)); // 100 -- was 0x64
		this.panpotChange(channel, controlDefaultValue(CTL.PAN)); // 64 -- was 0x40
		this.registeredParameterCoarse(channel, controlDefaultValue(CTL.REGISTERED_PARAMETER_COARSE)); // 0 -- was 0
		this.dataEntryCoarse(channel, controlDefaultValue(CTL.DATA_ENTRY_COARSE)); // 2 -- was 2
	};

	ResidentSf2Synth.prototype.setSoundFont = function(soundFont)
	{
		bankSet = soundFont.banks;

		bankIndex = 0;

		for(let i = 0; i < 16; ++i)
		{
			if(i !== 9)
			{
				this.programChange(i, soundFont.presetInfos[0].presetIndex); // the first preset index in the bankSet
			}
			this.setChannelControlDefaults(i);
		}

		// console.log("residentSf2Synth SoundFont set.");
	};

	ResidentSf2Synth.prototype.setMasterVolume = function(volume)
	{
		// masterVolume = volume; -- masterVolume unused so commented out (ji November 2015)
		gainMaster.gain.value = baseVolume * (volume / 16384);
	};

	ResidentSf2Synth.prototype.disconnect = function()
	{
		bufSrc.disconnect(0);
		gainMaster.disconnect(0);

		/** ji begin compressor commented out because unused November 2015 */
		// compressor.disconnect(0);
		/** ji end compressor commented out because unused November 2015 */

	};

	// Note that channel 9 *always* uses bank 128.
	ResidentSf2Synth.prototype.noteOn = function(channel, key, velocity)
	{
		var bnkIndex = (channel === 9) ? 128 : bankIndex,
			bank = bankSet[bnkIndex],
			presetLayers,
			keyLayers,
			note,
			midi = {},
			pan = channelPanpot[channel] - 64,
			bankIndexStr, instrStr, channelStr;

		// *Setting* the pitchBendSensitivity should be done by
		//   1. setting channelRegisteredParameterCoarse[channel] to 0 -- using this.registeredParameterCoarse(channel, param).
		//   2. setting channelDataEntryCoarse[channel] to the sensitivity (in semitones) -- using this.dataEntryCoarse(channel, semitones).
		// If the channelRegisteredParameterCoarse param is set !== 0, then this function will throw an exception.
		// These synths ignore both channelRegisteredParameterFine and channelDataEntryFine.
		function getPitchBendSensitivity(channel)
		{
			if(channelRegisteredParameterCoarse[channel] !== 0)
			{
				throw "channelRegisteredParameterCoarse[channel] must be 0 to get the pitch bend sensitivity";
			}
			return channelDataEntryCoarse[channel]; // the channel's pitchBendSensitivity in semitones
		}

		if(bank === undefined)
		{
			if(channel !== 9)
			{
				console.warn("bank " + bnkIndex.toString(10) + " not found.");
			}
			// return with no comment when channel === 9
			return;
		}

		presetLayers = bank[channelInstrument[channel]];
		if(presetLayers === undefined)
		{
			bankIndexStr = bnkIndex.toString(10);
			instrStr = (channelInstrument[channel]).toString(10);
			channelStr = channel.toString(10);
			console.warn("presetLayers not found: bank=" + bankIndexStr + " presetLayers=" + instrStr + " channel=" + channelStr);
			return;
		}

		keyLayers = presetLayers[key];
		if(!keyLayers)
		{
			bankIndexStr = bnkIndex.toString(10);
			instrStr = (channelInstrument[channel]).toString(10);
			channelStr = channel.toString(10);
			console.warn("presetLayers[key] not found: bank=" + bankIndexStr + " presetLayers=" + instrStr + " channel=" + channelStr + " key=" + key);
			return;
		}

		pan /= pan < 0 ? 64 : 63;

		midi.channel = channel;
		midi.key = key;
		midi.velocity = velocity;
		midi.pan = pan;
		midi.volume = channelVolume[channel] / 127;
		midi.pitchBend = channelPitchBend[channel]; // a value in range [-8192..+8191]
		midi.pitchBendSensitivity = getPitchBendSensitivity(channel);

		// note on
		note = new WebMIDI.soundFontSynthNote.SoundFontSynthNote(ctx, gainMaster, keyLayers, midi);
		note.noteOn();
		currentNoteOns[channel].push(note);
	};

	ResidentSf2Synth.prototype.noteOff = function(channel, key, velocity)
	{
		var bank = bankSet[channel === 9 ? 128 : bankIndex],
			instrument,
			i, il,
			currentNoteOn = currentNoteOns[channel],
			note;

		if(bank === undefined)
		{
			return;
		}

		instrument = bank[channelInstrument[channel]];
		if(instrument === undefined)
		{
			return;
		}

		il = currentNoteOn.length;
		for(i = 0; i < il; ++i)
		{
			note = currentNoteOn[i];
			if(note.key === key)
			{
				note.noteOff();
				currentNoteOn.splice(i, 1);
				--i;
				--il;
			}
		}
	};

	ResidentSf2Synth.prototype.programChange = function(channel, instrument)
	{
		if(channel === 9)
		{
			return;
		}

		channelInstrument[channel] = instrument;
	};

	ResidentSf2Synth.prototype.volumeChange = function(channel, volume)
	{
		channelVolume[channel] = volume;
	};

	ResidentSf2Synth.prototype.panpotChange = function(channel, pan)
	{
		channelPanpot[channel] = pan;
	};

	ResidentSf2Synth.prototype.pitchBend = function(channel, lowerByte, higherByte)
	{
		var pitchBend = ((lowerByte & 0x7f) | ((higherByte & 0x7f) << 7)) - 8192,
			i, il,
			currentNoteOn = currentNoteOns[channel];

		if(currentNoteOn !== undefined)
		{
			il = currentNoteOn.length;
			for(i = 0; i < il; ++i)
			{
				currentNoteOn[i].updatePlaybackRate(pitchBend);
			}
		}
		channelPitchBend[channel] = pitchBend;
	};

	// Both of these should be called by clients, but setting registeredParameterCoarse to anything other than 0
	// will cause the retrieval of the dataEntryCoarse (pitchBendSensitivity) to throw an exception and fail.
	// Setting registeredParameterCoarse has been suppressed in this synth's UI in the WebMIDISynthHost app. 
	ResidentSf2Synth.prototype.registeredParameterCoarse = function(channel, param)
	{
		channelRegisteredParameterCoarse[channel] = param;
	};
	ResidentSf2Synth.prototype.dataEntryCoarse = function(channel, semitones)
	{
		channelDataEntryCoarse[channel] = semitones;
	};

	ResidentSf2Synth.prototype.allSoundOff = function(channel)
	{
		let currentNOns = currentNoteOns[channel];

		while(currentNOns.length > 0)
		{
			this.noteOff(channel, currentNOns[0].key, 0);
		}
	};

	ResidentSf2Synth.prototype.resetAllControl = function(channel)
	{
		var currentNOns = currentNoteOns[channel];

		while(currentNOns.length > 0)
		{
			this.noteOff(channel, currentNOns[0].key, 0);
		}

		this.setChannelControlDefaults(channel);
	};

	return API;

}(window));
