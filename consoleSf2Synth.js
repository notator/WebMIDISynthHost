/*
*  copyright 2015 James Ingram
*  http://james-ingram-act-two.de/
*
*  Code licensed under MIT
*
*  WebMIDI.consoleSf2Synth contains a ConsoleSf2Synth constructor.
* 
*  This skeleton synth just logs MIDI messages to the console, but it is
*  intended to be easily adaptable for use by software synths that produce sound.
*  The object of having this code is to be able to discuss and improve the interface.
*/

/*jslint bitwise: false, nomen: true, plusplus: true, white: true */
/*global WebMIDI: false,  window: false,  document: false, performance: false, console: false, alert: false, XMLHttpRequest: false */

WebMIDI.namespace('WebMIDI.consoleSf2Synth');

WebMIDI.consoleSf2Synth = (function(document)
{
	"use strict";

	var
	bank = 0, // CTL.BANK_SELECT implementation.

	CMD = WebMIDI.constants.COMMAND,
	CTL = WebMIDI.constants.CONTROL,

	commands =
	[
		CMD.NOTE_OFF,
		CMD.NOTE_ON, 
		CMD.CUSTOMCONTROL_CHANGE, /** Proposal: see GitHub issues, WebMIDI/constants.js and WebMIDI/utilities.js **/
		CMD.CONTROL_CHANGE,
		CMD.PATCH_CHANGE,
		CMD.CHANNEL_PRESSURE,
		CMD.PITCHWHEEL
	],
	controls =
	[
		CTL.BANK_SELECT,
		CTL.MODWHEEL,
		CTL.PITCHWHEEL_DEVIATION, /** Proposal: see GitHub issues, WebMIDI/constants.js and WebMIDI/utilities.js **/
		CTL.PAN,
		CTL.ALL_CONTROLLERS_OFF,
		CTL.ALL_NOTES_OFF
	],

	ConsoleSf2Synth = function()
	{
		if(!(this instanceof ConsoleSf2Synth))
		{
			return new ConsoleSf2Synth();
		}

		/** WebMIDIAPI §10 -- MIDIPort interface **/
		Object.defineProperty(this, "id", { value: "consoleSf2Synth1", writable: false });
		Object.defineProperty(this, "manufacturer", { value: "james ingram", writable: false });
		Object.defineProperty(this, "name", { value: "consoleSf2Synth (ji)", writable: false });
		Object.defineProperty(this, "type", { value: "output", writable: false });
		Object.defineProperty(this, "version", { value: "1", writable: false });
		Object.defineProperty(this, "ondisconnect", { value: null, writable: false }); // Do we need this at all? Is it correct to set it to null?

		/*** Is this necessary? See https://github.com/WebAudio/web-midi-api/issues/110 ***/
		Object.defineProperty(this, "removable", { value: true, writable: false });

		/*** Extensions for software synths ***/	
		Object.defineProperty(this, "url", { value: "https://github.com/notator/WebMIDISynthHost", writable: false }); // The synth author's webpage hosting the synth.		
		Object.defineProperty(this, "commands", { value: commands, writable: false }); // The commands supported by this synth (see above).		
		Object.defineProperty(this, "controls", { value: controls, writable: false }); // The controls supported by this synth (see above).		
		Object.defineProperty(this, "isMultiChannel", { value: true, writable: false }); // If isMultiChannel is false, the synth ignores the channel nibble in MIDI messages
		Object.defineProperty(this, "isPolyphonic", { value: true, writable: false }); // If isPolyphonic is false, the synth can only play one note at a time
	},

	API =
    {
    	ConsoleSf2Synth: ConsoleSf2Synth // constructor
    };
	// end var

	// The init function should be called immediately after the synth has been constructed.
	// In this case it does nothing, but see jigSf2Synth.
	ConsoleSf2Synth.prototype.init = function()
	{
		console.log("consoleSf2Synth initialised.");
	};

	// This synth does not support timestamps
	ConsoleSf2Synth.prototype.send = function(message, ignoredTimestamp)
	{
		var	    
		command = message[0] & 0xF0,
		channel = message[0] & 0xF,
		data1 = message[1],
		data2 = message[2];

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
			console.log("consoleSf2Synth NoteOff:".concat(" channel:", channel, " note:", data1, " velocity:", data2));
		}
		function handleNoteOn(channel, data1, data2)
		{
			console.log("consoleSf2Synth NoteOn:".concat(" channel:", channel, " note:", data1, " velocity:", data2));
		}
		// CUSTOMCONTROL_CHANGE.data[1] is the MIDIpitch to which to apply the aftertouch
		// CUSTOMCONTROL_CHANGE.data[2] is the amount of pressure 0..127.
		function handleCustomControlChange(channel, data1, data2)
		{
			console.log("consoleSf2Synth Aftertouch:".concat(" channel:", channel, " note:", data1, " value:", data2));
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
				bank = value; // this is the complete implementation!
				console.log("consoleSf2Synth Bank:".concat(" channel:", channel, " value:", value));
			}
			function setModWheel(channel, value)
			{
				console.log("consoleSf2Synth ModWheel:".concat(" channel:", channel, " value:", value));
			}
			function setPitchWheelDeviation(channel, value)
			{
				console.log("consoleSf2Synth PitchWheelDeviation:".concat(" channel:", channel, " value:", value));
			}
			function setPan(channel, value)
			{
				console.log("consoleSf2Synth Pan:".concat(" channel:", channel, " value:", value));
			}
			function setAllControllersOff(channel)
			{
				console.log("consoleSf2Synth AllControllersOff: channel:".concat(channel));
			}
			function setAllNotesOff(channel)
			{
				console.log("consoleSf2Synth AllNotesOff: channel:".concat(channel));
			}
			// If the controller is not present in the controllers info array, it is ignored here
			switch(data1)
			{
				case CTL.BANK_SELECT:
					checkControlExport(CTL.BANK_SELECT);
					setBank(channel, data2);
					break;
				case CTL.MODWHEEL:
					checkControlExport(CTL.MODWHEEL);
					setModWheel(channel, data2);
					break;
				case CTL.PITCHWHEEL_DEVIATION: /** Proposal: see WebMIDI/constants.js and WebMIDI/utilities.js*/
					checkControlExport(CTL.PITCHWHEEL_DEVIATION);
					setPitchWheelDeviation(channel, data2);
					break;
				case CTL.PAN:
					checkControlExport(CTL.PAN);
					setPan(channel, data2);
					break;
				case CTL.ALL_CONTROLLERS_OFF:
					checkControlExport(CTL.ALL_CONTROLLERS_OFF);
					setAllControllersOff(channel);
					break;
				case CTL.ALL_NOTES_OFF:
					checkControlExport(CTL.ALL_NOTES_OFF);
					setAllNotesOff(channel);
					break;
				default:
					throw "Error: ".concat("Controller ", data1.toString(10), " (0x", data1.toString(16), ") is not defined.");
			}
		}
		function handlePatchChange(channel, data1)
		{
			console.log("consoleSf2Synth Patch:".concat(" channel:", channel, " value:", data1));
		}
		// CHANNEL_PRESSURE.data[1] is the amount of pressure 0..127.
		function handleChannelPressure(channel, data1)
		{
			console.log("consoleSf2Synth ChannelPressure:".concat(" channel:", channel, " value:", data1));
		}
		function handlePitchWheel(channel, data1, data2)
		{
			console.log("consoleSf2Synth PitchWheel:".concat(" channel:", channel, " value:", data1));
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
			case CMD.CUSTOMCONTROL_CHANGE:
				checkCommandExport(CMD.CUSTOMCONTROL_CHANGE);
				// CUSTOMCONTROL_CHANGE.data[1] is the MIDIpitch to which to apply the aftertouch
				// CUSTOMCONTROL_CHANGE.data[2] is the amount of pressure 0..127.
				handleCustomControlChange(channel, data1, data2);
				break;
			case CMD.CONTROL_CHANGE:
				checkCommandExport(CMD.CONTROL_CHANGE);
				handleControl(channel, data1, data2);
				break;
			case CMD.PATCH_CHANGE:
				checkCommandExport(CMD.PATCH_CHANGE);
				handlePatchChange(channel, data1);
				break;
			case CMD.CHANNEL_PRESSURE:
				checkCommandExport(CMD.CHANNEL_PRESSURE);
				// CHANNEL_PRESSURE.data[1] is the amount of pressure 0..127.
				handleChannelPressure(channel, data1);
				break;
			case CMD.PITCHWHEEL:
				checkCommandExport(CMD.PITCHWHEEL);
				handlePitchWheel(channel, data1, data2);
				break;

			default:
				throw "Error: ".concat("Command ", command.toString(10), " (0x", command.toString(16), ") is not defined.");
		}
	};

	// The setSoundFont function should only be defined for synths that use soundFonts.
	// The argument is a SoundFont object having the appropriate attributes.
	// (The SoundFont constructor is in WebMIDI/WebMIDISoundFont.js)
	ConsoleSf2Synth.prototype.setSoundFont = function(soundFont)
	{
		console.log("consoleSf2Synth soundFont set.");
	};

	return API;

}(document));
