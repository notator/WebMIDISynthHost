/* Copyright 2015 James Ingram, gree
 * http://james-ingram-act-two.de/
 * https://github.com/gree
 *  
 * This code is based on the gree soundFont synthesizer at
 * https://github.com/gree/sf2synth.js
 *
 * All this code is licensed under MIT
 *
 * WebMIDI.sf2Synth1 namespace containing a Sf2Synth1 constructor.
 * 
 * This soundFont synth plays soundFonts loaded using its setSoundFont(soundFont)
 * function. It also logs MIDI messages to the console.
 * The object of having this code is to be able to discuss and improve the interface.
 * It would, however, be nice if this synth could be optimised and improved by real
 * Web Audio programmers. See the Web MIDI Synth Host issues on GitHub.
 * https://github.com/notator/WebMIDISynthHost
 */

/*jshint strict: true, -W110*/
/*global window, WebMIDI */

WebMIDI.namespace('WebMIDI.sf2Synth1');

WebMIDI.sf2Synth1 = (function(window)
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
	ctx, // set in constructor
	gainMaster,  // set in constructor (ji)

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
	channelPitchBendSensitivity =
	  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	currentNoteOns = [],
	baseVolume = 1 / 0x8000,

	// masterVolume = 16384, -- unused and commented out (ji November 2015)

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
		CMD.PATCH,
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
		CTL.PITCHWHEEL_DEVIATION, // ji: I have defined CTL.PITCHWHEEL_DEVIATION for (software) WebMIDISynths
		// standard 2-byte controllers.
		// The name strings for these are defined in WebMIDI.constants
		CTL.ALL_CONTROLLERS_OFF,
		CTL.ALL_SOUND_OFF
	],

	Sf2Synth1 = function()
	{
		var i;

		if(!(this instanceof Sf2Synth1))
		{
			return new Sf2Synth1();
		}

		// WebMIDIAPI §4.6 -- MIDIPort interface
		// See https://github.com/notator/WebMIDISynthHost/issues/23
		// and https://github.com/notator/WebMIDISynthHost/issues/24
		Object.defineProperty(this, "id", { value: "Sf2Synth01", writable: false });
		Object.defineProperty(this, "manufacturer", { value: "gree & ji", writable: false });
		Object.defineProperty(this, "name", { value: "Sf2Synth1 (gree & ji)", writable: false });
		Object.defineProperty(this, "type", { value: "output", writable: false });
		Object.defineProperty(this, "version", { value: "1", writable: false });
		Object.defineProperty(this, "ondisconnect", { value: null, writable: false }); // Do we need this at all? Is it correct to set it to null?

		/*** Is this necessary? See https://github.com/WebAudio/web-midi-api/issues/110 ***/
		/*** See also: disconnect() function below ***/
		Object.defineProperty(this, "removable", { value: true, writable: false });

		/*** Extensions for software synths ***/
		// The synth author's webpage hosting the synth. 
		Object.defineProperty(this, "url", { value: "https://github.com/gree/sf2synth.js", writable: false });
		// The commands supported by this synth (see above).
		Object.defineProperty(this, "commands", { value: commands, writable: false });
		// The controls supported by this synth (see above).
		Object.defineProperty(this, "controls", { value: controls, writable: false });
		// If isMultiChannel is false or undefined, the synth ignores the channel nibble in MIDI messages
		Object.defineProperty(this, "isMultiChannel", { value: true, writable: false });
		// If isPolyphonic is false or undefined, the synth can only play one note at a time
		Object.defineProperty(this, "isPolyphonic", { value: true, writable: false });
		// If supportsGeneralMIDI is defined, and is true, then
		// 1. both COMMAND.PATCH and CONTROL.BANK MUST be defined.
		// 2. the patches in bank 0 can be usefully named using GM patch names.
		//    (GM patch names are returned by WebMIDI.constants.generalMIDIPatchName(patchIndex). )
		// 3. when the channel index is 9, notes can be usefully named using the GM percussion names.
		//    (GM percussion names are returned by WebMIDI.constants.generalMIDIPercussionName(noteIndex). )
		// 4. the synth MUST define the function:
		//        boolean patchIsAvailable(patchIndex).
		//    On their own, conditions 1-3 do not guarantee that a particular patch can be set.
		// 5. the synth MAY define the function:
		//        void setSoundFont(soundFont)
		//    It is possible for a synth to support GM without using soundfonts.
		Object.defineProperty(this, "supportsGeneralMIDI", { value: true, writable: false });

		ctx = getAudioContext();
		gainMaster = ctx.createGain();

		/** ji begin compressor commented out because unused November 2015 */
		/** @type {DynamicsCompressorNode} */
		// compressor = ctx.createDynamicsCompressor();
		/** ji end compressor commented out because unused November 2015 */

		/** @type {AudioBufferSourceNode} */

		bufSrc = ctx.createBufferSource();

		for(i = 0; i < 16; ++i)
		{
			currentNoteOns.push([]);
		}
	},

	API =
    {
    	Sf2Synth1: Sf2Synth1 // constructor
    };
	// end var

	// WebMIDIAPI §4.6 -- MIDIPort interface
	// See https://github.com/notator/WebMIDISynthHost/issues/24
	Sf2Synth1.prototype.open = function()
	{
		console.log("sf2Synth1 opened.");
	};

	// WebMIDIAPI §4.6 -- MIDIPort interface
	// See https://github.com/notator/WebMIDISynthHost/issues/24
	Sf2Synth1.prototype.close = function()
	{
		console.log("sf2Synth1 closed.");
	};

	// WebMIDIAPI MIDIOutput send()
	// This synth does not yet support timestamps (05.11.2015)
	Sf2Synth1.prototype.send = function(message, ignoredTimestamp)
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
				console.warn("Command " + command.toString(10) + " (0x" + command.toString(16) + ") is not supported.");
			}
		}
		function handleNoteOff(channel, data1, data2)
		{
			checkCommandExport(CMD.NOTE_OFF);
			console.log("sf2Synth1 NoteOff: channel:" + channel + " note:" + data1 + " velocity:" + data2);
			that.noteOff(channel, data1, data2);
		}
		function handleNoteOn(channel, data1, data2)
		{
			checkCommandExport(CMD.NOTE_ON);
			console.log("sf2Synth1 NoteOn: channel:" + channel + " note:" + data1 + " velocity:" + data2);
			that.noteOn(channel, data1, data2);
		}
		function handleControl(channel, data1, data2)
		{
			function checkControlExport(control)
			{
				var index = controls.indexOf(control);
				if(index < 0)
				{
					console.warn("Controller " + control.toString(10) + " (0x" + control.toString(16) + ") is not supported.");
				}
			}
			function setBank(channel, value)
			{
				checkControlExport(CTL.BANK);
				console.log("sf2Synth1 Bank: channel:" + channel + " value:" + value);
				bankIndex = value; // this is the complete implementation!
			}
			function setVolume(channel, value)
			{
				checkControlExport(CTL.VOLUME);
				console.log("sf2Synth1 Volume: channel:" + channel + " value:" + value);
				that.volumeChange(channel, value);
			}
			function setPan(channel, value)
			{
				checkControlExport(CTL.PAN);
				console.log("sf2Synth1 Pan: channel:" + channel + " value:" + value);
				that.panpotChange(channel, value);
			}
			function setPitchWheelDeviation(channel, value)
			{
				checkControlExport(CTL.PITCHWHEEL_DEVIATION);
				console.log("sf2Synth1 PitchWheelDeviation: channel:" + channel + " value:" + value);
				that.pitchBendSensitivity(channel, value);
			}
			function setAllControllersOff(channel)
			{
				checkControlExport(CTL.ALL_CONTROLLERS_OFF);
				console.log("sf2Synth1 AllControllersOff: channel:" + channel);
				that.resetAllControl(channel);
			}
			function setAllSoundOff(channel)
			{
				checkControlExport(CTL.ALL_SOUND_OFF);
				console.log("sf2Synth1 AllSoundOff: channel:" + channel);
				that.allSoundOff(channel);
			}

			checkCommandExport(CMD.CONTROL_CHANGE);
			// If the controller is not present in the controllers info array, it is ignored here
			switch(data1)
			{
				case CTL.BANK:
					setBank(channel, data2);
					break;
				case CTL.PITCHWHEEL_DEVIATION:
					setPitchWheelDeviation(channel, data2);
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
				default:
					console.warn("Controller " + data1.toString(10) + " (0x" + data1.toString(16) + ") is not supported.");
			}
		}
		function handlePatchChange(channel, data1)
		{
			checkCommandExport(CMD.PATCH);
			console.log("sf2Synth1 Patch: channel:" + channel, " value:" + data1);
			that.programChange(channel, data1);
		}
		function handlePitchWheel(channel, data1)
		{
			checkCommandExport(CMD.PITCHWHEEL);
			console.log("sf2Synth1 PitchWheel: channel:" + channel, " value:" + data1);
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
			case CMD.PATCH:
				handlePatchChange(channel, data1);
				break;
			case CMD.PITCHWHEEL:
				handlePitchWheel(channel, data1, data2);
				break;
			default:
				console.warn("Command " + command.toString(10) + " (0x" + command.toString(16) + ") is not supported.");
		}
	};

	Sf2Synth1.prototype.setChannelControlDefaults = function(channel)
	{
		var commandDefaultValue = WebMIDI.constants.commandDefaultValue,
			controlDefaultValue = WebMIDI.constants.controlDefaultValue;

		this.pitchBend(channel, 0, commandDefaultValue(CMD.PITCHWHEEL)); // 0, 64 -- was 0x00, 0x40 (8192)

		this.volumeChange(channel, controlDefaultValue(CTL.VOLUME)); // 100 -- was 0x64
		this.panpotChange(channel, controlDefaultValue(CTL.PAN)); // 64 -- was 0x40
		this.pitchBendSensitivity(channel, controlDefaultValue(CTL.PITCHWHEEL_DEVIATION)); // 2 -- was 2
	};

	// The setSoundFont function should only be defined for synths that use soundFonts.
	// The argument is a SoundFont object having the appropriate attributes.
	// (The SoundFont constructor is in WebMIDI/soundFont.js)
	Sf2Synth1.prototype.setSoundFont = function(soundFont)
	{
		var i;

		bankSet = soundFont.banks;

		this.bankIndex = 0;

		for(i = 0; i < 16; ++i)
		{
			if(i !== 9)
			{
				this.programChange(i, soundFont.presets[0].presetIndex); // the first preset index in the bankSet
			}
			this.setChannelControlDefaults(i);
		}

		console.log("sf2Synth1 SoundFont set.");
	};

	// Call this immediately after the synth has been constructed.
	Sf2Synth1.prototype.init = function()
	{
		bufSrc.connect(gainMaster);
		gainMaster.connect(ctx.destination);
		bufSrc.start(0);

		// ji November 2015
		this.setMasterVolume(16383);

		console.log("sf2Synth1 initialised");
	};

	Sf2Synth1.prototype.setMasterVolume = function(volume)
	{
		// masterVolume = volume; -- masterVolume unused so commented out (ji November 2015)
		gainMaster.gain.value = baseVolume * (volume / 16384);
	};

	Sf2Synth1.prototype.disconnect = function()
	{
		bufSrc.disconnect(0);
		gainMaster.disconnect(0);

		/** ji begin compressor commented out because unused November 2015 */
		// compressor.disconnect(0);
		/** ji end compressor commented out because unused November 2015 */

	};

	Sf2Synth1.prototype.noteOn = function(channel, key, velocity)
	{
		var bank = bankSet[(channel === 9) ? 128 : bankIndex],
		instrument = bank[channelInstrument[channel]],
		instrumentKey,
		note,
		panpot = channelPanpot[channel] - 64,
		bnk, bankStr, instrStr, channelStr;

		if(!instrument)
		{
			bnk = (channel === 9) ? 128 : this.bank;
			bankStr = bnk.toString(10);
			instrStr = (channelInstrument[channel]).toString(10);
			channelStr = channel.toString(10);
			console.warn("instrument not found: bank=" + bankStr + " instrument=" + instrStr + " channel=" + channelStr);
		}

		instrumentKey = instrument[key];

		if(!instrumentKey)
		{
	  		bnk = (channel === 9) ? 128 : this.bank;
			bankStr = bnk.toString(10);
			instrStr = (channelInstrument[channel]).toString(10);
			channelStr = channel.toString(10);
			console.warn("instrument key not found: bank=" + bankStr + " instrument=" + instrStr + " channel=" + channelStr + " key=" + key);

		}

		panpot /= panpot < 0 ? 64 : 63;

		instrumentKey.channel = channel;
		instrumentKey.key = key;
		instrumentKey.velocity = velocity;
		instrumentKey.panpot = panpot;
		instrumentKey.volume = channelVolume[channel] / 127;
		instrumentKey.pitchBend = channelPitchBend[channel] - 8192;
		instrumentKey.pitchBendSensitivity = channelPitchBendSensitivity[channel];

		// note on
		note = new WebMIDI.soundFontSynthNote.SoundFontSynthNote(ctx, gainMaster, instrumentKey);
		note.noteOn();
		currentNoteOns[channel].push(note);
	};

	Sf2Synth1.prototype.noteOff = function(channel, key, velocity)
	{
		var bank = bankSet[channel === 9 ? 128 : bankIndex],
			instrument = bank[channelInstrument[channel]],
			i, il,
			currentNoteOn = currentNoteOns[channel],
			note;

		if(!instrument)
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

	Sf2Synth1.prototype.programChange = function(channel, instrument)
	{
		if(channel === 9)
		{
			return;
		}

		channelInstrument[channel] = instrument;
	};

	Sf2Synth1.prototype.volumeChange = function(channel, volume)
	{
		channelVolume[channel] = volume;
	};

	Sf2Synth1.prototype.panpotChange = function(channel, panpot)
	{
		channelPanpot[channel] = panpot;
	};

	Sf2Synth1.prototype.pitchBend = function(channel, lowerByte, higherByte)
	{
		var bend = (lowerByte & 0x7f) | ((higherByte & 0x7f) << 7),
		i, il,
		currentNoteOn = currentNoteOns[channel],
		calculated = bend - 8192;

		if(currentNoteOn !== undefined)
		{
			il = currentNoteOn.length;
			for(i = 0; i < il; ++i)
			{
				currentNoteOn[i].updatePitchBend(calculated);
			}
		}
		channelPitchBend[channel] = bend;
	};

	Sf2Synth1.prototype.pitchBendSensitivity = function(channel, sensitivity)
	{
		channelPitchBendSensitivity[channel] = sensitivity;
	};

	Sf2Synth1.prototype.allSoundOff = function(channel)
	{
		var currentNoteOn = currentNoteOns[channel];

		while(currentNoteOn.length > 0)
		{
			this.noteOff(channel, currentNoteOn[0].key, 0);
		}
	};

	Sf2Synth1.prototype.resetAllControl = function(channel)
	{
		this.setChannelControlDefaults(channel);
	};

	return API;

}(window));
