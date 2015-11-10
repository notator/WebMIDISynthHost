/*
* Copyright 2015 James Ingram
* http://james-ingram-act-two.de/
* 
* This code is based on the gree soundFont synthesizer at
* https://github.com/gree/sf2synth.js
*
* All this code is licensed under MIT
*
*  WebMIDI.jigSf2Synth namespace containing a JIGSf2Synth constructor.
* 
*  This soundFont WebMIDISynth plays soundFonts loaded using its setSoundFont(soundFont)
*  function. It also logs MIDI messages to the console.
*  The object of having this code is to be able to discuss and improve the interface.
*  It would, however, be nice if this synth could be optimised and improved by real
*  Web Audio programmers. See the Web MIDI Synth Host issues.
*/

/*jslint bitwise: false, nomen: true, plusplus: true, white: true */
/*global WebMIDI: false,  window: false,  document: false, performance: false, console: false, alert: false, XMLHttpRequest: false */

WebMIDI.namespace('WebMIDI.jigSf2Synth');

WebMIDI.jigSf2Synth = (function()
{
	"use strict";

	var
    /********************************************************************************
	 * These variables were originally in the gree code.
	 * I have removed all references to the original gree GUI (i.e. the HTML <table>).
	 * (ji 05.11.2015)
	 ********************************************************************************/
	/** @type {number} */
	bankIndex = 0,
	/** @type {Array.<Array.<Object>>} */
	bankSet,
	/** @type {number} */
	bufferSize = 1024,
	/** @type {AudioContext} */
	ctx, // set in constructor
	/** @type {AudioGainNode} */
	gainMaster,  // set in constructor (ji)
	/** @type {DynamicsCompressorNode} */
	compressor,  // set in constructor (ji)
	/** @type {AudioBufferSourceNode} */
	bufSrc,  // set in constructor (ji)
	/** @type {Array.<number>} */
	channelInstrument =
	  [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 10, 11, 12, 13, 14, 15],
	/** @type {Array.<number>} */
	channelVolume =
	  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	/** @type {Array.<number>} */
	channelPanpot =
	  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	/** @type {Array.<number>} */
	channelPitchBend =
	  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	channelPitchBendSensitivity =
	  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	/** @type {Array.<Array.<SoundFont.SynthesizerNote>>} */
	currentNoteOns = [],
	/** @type {number} */
	baseVolume = 1 / 0x8000,
	/** @type {number} */
	masterVolume = 16384,
	/*  end of gree code  *********************************************/
	/******************************************************************/

	getAudioContext = function()
	{
		var AudioContext = (window.AudioContext || window.webkitAudioContext);

		return new AudioContext();
	},

	CMD = WebMIDI.constants.COMMAND,
	CTL = WebMIDI.constants.CONTROL,
	// The commands and controls arrays are part of a standard WebMIDI synth's interface.
	// They tell the host which messages are implemented.
	// Proposal: If CMD.PATCH_CHANGE is implemented, then CTL.BANK_SELECT MUST be implemented (its trivial to implement).
	// If WebMIDISynth.prototype.setSoundFont(...) is undefined, then custom controls could be defined.
	// Proposal: define a custom controls array for MIDI-controlled synths that don't use soundFonts:
	// customControls =
	// [
	//    { name: "lowPassFilter1", index: 0, defaultValue: 0 },
	//    { name: "lowPassFilter1_Lo", index: 1, defaultValue: 0 },
	//    { name: "reverb", index: 2, defaultValue: 0 },
	//    { name: "volume", index: 3, defaultValue: 100 },
	//    { name: "transpose", index: 4, defaultValue: 0 }
	//    // etc.
	// ]
	commands =
	[
		CMD.NOTE_OFF,
		CMD.NOTE_ON, 
		CMD.CONTROL_CHANGE,
		CMD.PATCH_CHANGE,
		CMD.PITCHWHEEL
	],
	controls =
	[
		CTL.BANK_SELECT,
		CTL.PITCHWHEEL_DEVIATION, /** Proposal: see WebMIDI/constants.js and WebMIDI/utilities.js **/
		CTL.VOLUME,
		CTL.PAN,
		CTL.ALL_CONTROLLERS_OFF,
		CTL.ALL_SOUND_OFF
	],

	JIGSf2Synth = function()
	{
		var i;

		if(!(this instanceof JIGSf2Synth))
		{
			return new JIGSf2Synth();
		}

		/** WebMIDIAPI §10 -- MIDIPort interface **/
		Object.defineProperty(this, "id", { value: "jigSf2Synth01", writable: false });
		Object.defineProperty(this, "manufacturer", { value: "ji and gree", writable: false });
		Object.defineProperty(this, "name", { value: "jigSf2Synth", writable: false });
		Object.defineProperty(this, "type", { value: "output", writable: false });
		Object.defineProperty(this, "version", { value: "1", writable: false });
		Object.defineProperty(this, "ondisconnect", { value: null, writable: false }); // Do we need this at all? Is it correct to set it to null?

		/*** Is this necessary? See https://github.com/WebAudio/web-midi-api/issues/110 ***/
		/*** See also: disconnect() function below ***/
		Object.defineProperty(this, "removable", { value: true, writable: false });

		/*** Extensions for software synths ***/	
		Object.defineProperty(this, "url", { value: "http://james-ingram-act-two.de/open-source/WebMIDISynthHost/host.html", writable: false }); // The synth author's webpage hosting the synth.		
		Object.defineProperty(this, "commands", { value: commands, writable: false }); // The commands supported by this synth (see above).		
		Object.defineProperty(this, "controls", { value: controls, writable: false }); // The controls supported by this synth (see above).		
		Object.defineProperty(this, "isPolyphonic", { value: true, writable: false }); // If isPolyphonic is false, the synth ignores the channel nibble in MIDI messages

		ctx = getAudioContext();
		gainMaster = ctx.createGain();
		/** @type {DynamicsCompressorNode} */
		compressor = ctx.createDynamicsCompressor();
		/** @type {AudioBufferSourceNode} */
		bufSrc = ctx.createBufferSource();

		for(i = 0; i < 16; ++i)
		{
			currentNoteOns.push([]);
		}
	},

	API =
    {
    	JIGSf2Synth: JIGSf2Synth // constructor
    };
	// end var

	// WebMIDIAPI MIDIOutput send()
	// This synth does not yet support timestamps (05.11.2015)
	JIGSf2Synth.prototype.send = function(message, ignoredTimestamp)
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
				throw "Error: ".concat("Command ", command.toString(10), " (0x", command.toString(16), ") is not being exported.");
			}
		}
		function handleNoteOff(channel, data1, data2)
		{
			checkCommandExport(CMD.NOTE_OFF);
			console.log("jigSf2Synth NoteOff:".concat(" channel:", channel, " note:", data1, " velocity:", data2));
			that.noteOff(channel, data1, data2);
		}
		function handleNoteOn(channel, data1, data2)
		{
			checkCommandExport(CMD.NOTE_ON);
			console.log("jigSf2Synth NoteOn:".concat(" channel:", channel, " note:", data1, " velocity:", data2));
			that.noteOn(channel, data1, data2);
		}
		function handleControl(channel, data1, data2)
		{
			function checkControlExport(control)
			{
				var index = controls.indexOf(control);
				if(index < 0)
				{
					throw "Error: ".concat("Controller ", control.toString(10), " (0x", control.toString(16), ") is not being exported.");
				}
			}
			function setBank(channel, value)
			{
				checkControlExport(CTL.BANK_SELECT);
				console.log("jigSf2Synth Bank:".concat(" channel:", channel, " value:", value));
				bankIndex = value; // this is the complete implementation!
			}
			function setPitchWheelDeviation(channel, value)
			{
				checkControlExport(CTL.PITCHWHEEL_DEVIATION);
				console.log("jigSf2Synth PitchWheelDeviation:".concat(" channel:", channel, " value:", value));
				that.pitchBendSensitivity(channel, value);
			}
			function setVolume(channel, value)
			{
				checkControlExport(CTL.VOLUME);
				console.log("jigSf2Synth Volume:".concat(" channel:", channel, " value:", value));
				that.volumeChange(channel, value);
			}
			function setPan(channel, value)
			{
				checkControlExport(CTL.PAN);
				console.log("jigSf2Synth Pan:".concat(" channel:", channel, " value:", value));
				that.panpotChange(channel, value);
			}
			function setAllControllersOff(channel)
			{
				checkControlExport(CTL.ALL_CONTROLLERS_OFF);
				console.log("jigSf2Synth AllControllersOff: channel:".concat(channel));
				that.resetAllControl(channel);	
			}
			function setAllSoundOff(channel)
			{
				checkControlExport(CTL.ALL_SOUND_OFF);
				console.log("jigSf2Synth AllSoundOff: channel:".concat(channel));
				that.allSoundOff(channel);
			}

			checkCommandExport(CMD.CONTROL_CHANGE);
			// If the controller is not present in the controllers info array, it is ignored here
			switch(data1)
			{
				case CTL.BANK_SELECT:
					setBank(channel, data2);
					break;
				case CTL.PITCHWHEEL_DEVIATION: /** Proposal: see WebMIDI/constants.js and WebMIDI/utilities.js*/
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
					throw "Error: ".concat("Controller ", data1.toString(10), " (", data1.toString(16), ") is not defined.");
			}
		}
		function handlePatchChange(channel, data1)
		{
			checkCommandExport(CMD.PATCH_CHANGE);
			console.log("jigSf2Synth Patch:".concat(" channel:", channel, " value:", data1));
			that.programChange(channel, data1);
		}
		function handlePitchWheel(channel, data1)
		{
			checkCommandExport(CMD.PITCHWHEEL);
			console.log("jigSf2Synth PitchWheel:".concat(" channel:", channel, " value:", data1));
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
			case CMD.PATCH_CHANGE:			
				handlePatchChange(channel, data1);
				break;
			case CMD.PITCHWHEEL:
				handlePitchWheel(channel, data1, data2);
				break;
			default:
				throw "Error: ".concat("Command ", command.toString(10), " (", command.toString(16), ") is not defined.");
		}
	};

	// The setSoundFont function should only be defined for synths that use soundFonts.
	// The argument is a SoundFont object having the appropriate attributes.
	// (The SoundFont constructor is in WebMIDI/soundFont.js)
	JIGSf2Synth.prototype.setSoundFont = function(soundFont)
	{
		var i, DEFAULT = WebMIDI.constants.DEFAULT;

		bankSet = soundFont.banks;

		this.bankIndex = 0;

		for(i = 0; i < 16; ++i)
		{
			if(i !== 9)
			{
				this.programChange(i, soundFont.presets[0].presetIndex); // the first preset index in the bankSet
			}
			this.volumeChange(i, DEFAULT.VOLUME); // 100 -- was 0x64
			this.panpotChange(i, DEFAULT.PAN); // 64 -- was 0x40
			this.pitchBend(i, 0, DEFAULT.PITCHWHEEL); // 0, 64 -- was 0x00, 0x40 (8192)
			this.pitchBendSensitivity(i, DEFAULT.PITCHWHEEL_DEVIATION); // 2 -- was 2
		}

		console.log("jigSf2Synth SoundFont set.");
	};

	// Call this immediately after the synth has been constructed.
	JIGSf2Synth.prototype.init = function()
	{
		bufSrc.connect(gainMaster);
		gainMaster.connect(ctx.destination);
		bufSrc.start(0);

		this.setMasterVolume(16383);

		console.log("jigSf2Synth initialised");
	};

	JIGSf2Synth.prototype.setMasterVolume = function(volume)
	{
		masterVolume = volume;
		gainMaster.gain.value = baseVolume * (volume / 16384);
	};

	JIGSf2Synth.prototype.disconnect = function()
	{
		bufSrc.disconnect(0);
		gainMaster.disconnect(0);
		compressor.disconnect(0);
	};

	JIGSf2Synth.prototype.noteOn = function(channel, key, velocity)
	{
		var bank = bankSet[(channel === 9) ? 128 : bankIndex],
		instrument = bank[channelInstrument[channel]],
		instrumentKey,
		note,
		panpot = channelPanpot[channel] - 64;

		if(!instrument)
		{
			throw "instrument not found: channel=".concat(channel, " bankIndex=", bankIndex);
		}

		instrumentKey = instrument[key];

		if(!instrumentKey)
		{
			throw "instrument key not found: channel=".concat(channel, " key=", key);
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

	JIGSf2Synth.prototype.noteOff = function(channel, key, velocity)
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

		for(i = 0, il = currentNoteOn.length; i < il; ++i)
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

	JIGSf2Synth.prototype.programChange = function(channel, instrument)
	{
		if(channel === 9)
		{
			return;
		}

		channelInstrument[channel] = instrument;
	};

	JIGSf2Synth.prototype.volumeChange = function(channel, volume)
	{
		channelVolume[channel] = volume;
	};

	JIGSf2Synth.prototype.panpotChange = function(channel, panpot)
	{
		channelPanpot[channel] = panpot;
	};

	JIGSf2Synth.prototype.pitchBend = function(channel, lowerByte, higherByte)
	{
		var bend = (lowerByte & 0x7f) | ((higherByte & 0x7f) << 7),
		i, il,
		currentNoteOn = currentNoteOns[channel],
		calculated = bend - 8192;

		if(currentNoteOn !== undefined)
		{
			for(i = 0, il = currentNoteOn.length; i < il; ++i)
			{
				currentNoteOn[i].updatePitchBend(calculated);
			}
		}
		channelPitchBend[channel] = bend;
	};

	JIGSf2Synth.prototype.pitchBendSensitivity = function(channel, sensitivity)
	{
		channelPitchBendSensitivity[channel] = sensitivity;
	};

	JIGSf2Synth.prototype.allSoundOff = function(channel)
	{
		var currentNoteOn = currentNoteOns[channel];

		while(currentNoteOn.length > 0)
		{
			this.noteOff(channel, currentNoteOn[0].key, 0);
		}
	};

	JIGSf2Synth.prototype.resetAllControl = function(channel)
	{
		this.pitchBend(channel, 0x00, 0x40); // 8192
	};

	return API;

}());
