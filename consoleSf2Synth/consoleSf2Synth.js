/*
*  copyright 2015 James Ingram
*  https://james-ingram-act-two.de/
*
*  Code licensed under MIT
*
*  WebMIDI.consoleSf2Synth contains a ConsoleSf2Synth constructor.
* 
*  This skeleton synth just logs MIDI messages to the console, but it is
*  intended to be easily adaptable for use by software synths that produce sound.
*  The object of having this code is to be able to discuss and improve the interface.
*/

/*jslint bitwise, white: true */
/*global WebMIDI */

WebMIDI.namespace('WebMIDI.consoleSf2Synth');

WebMIDI.consoleSf2Synth = (function()
{
	"use strict";

	var
	bank = 0, // CTL.BANK implementation.

	CMD = WebMIDI.constants.COMMAND,
	CTL = WebMIDI.constants.CONTROL,

	commands =
	[
		CMD.NOTE_OFF,
		CMD.NOTE_ON, 
		CMD.CONTROL_CHANGE,
		CMD.PATCH,
		CMD.CHANNEL_PRESSURE,
		CMD.PITCHWHEEL
	],
	controls =
	[
		CTL.BANK,
		CTL.MODWHEEL,
		CTL.PAN,

		CTL.REGISTERED_PARAMETER_COARSE, // coarse parameter is coarse pitchWheelDeviation (=semitones)
		CTL.DATA_ENTRY_COARSE, // default coarse pitchWheelDeviation is 2 semitones

        CTL.ALL_CONTROLLERS_OFF,
		CTL.ALL_NOTES_OFF,
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

	// WebMIDIAPI §4.6 -- MIDIPort interface
	// See https://github.com/notator/WebMIDISynthHost/issues/24
	ConsoleSf2Synth.prototype.open = function()
	{
		console.log("consoleSf2Synth opened.");
	};

	// WebMIDIAPI §4.6 -- MIDIPort interface
	// See https://github.com/notator/WebMIDISynthHost/issues/24
	ConsoleSf2Synth.prototype.close = function()
	{
		console.log("consoleSf2Synth closed.");
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
				console.warn("Command " + command.toString(10) + " (0x" + command.toString(16) + ") is not being exported.");
			}
		}
		function handleNoteOff(channel, data1, data2)
		{
			console.log("consoleSf2Synth NoteOff: channel:" + channel + " note:" + data1 + " velocity:" + data2);
		}
		function handleNoteOn(channel, data1, data2)
		{
			console.log("consoleSf2Synth NoteOn: channel:" + channel + " note:" + data1 + " velocity:" + data2);
		}

		function handleControl(channel, data1, data2)
		{
			function checkControlExport(control)
			{
				var index = controls.indexOf(control);
				if(index < 0)
				{
					console.warn("Controller " + control.toString(10) + " (0x" + control.toString(16) + ") is not being exported.");
				}
			}
			function setBank(channel, value)
			{
				bank = value; // this is the complete implementation!
				console.log("consoleSf2Synth Bank: channel:" + channel.toString(10) + " value:" + value.toString(10));
			}
			function setModWheel(channel, value)
			{
				console.log("consoleSf2Synth ModWheel: channel:" + channel.toString(10) + " value:" + value.toString(10));
			}

			function setPan(channel, value)
			{
				console.log("consoleSf2Synth Pan: channel:" + channel.toString(10) + " value:" + value.toString(10));
			}
			function setAllControllersOff(channel)
			{
				console.log("consoleSf2Synth AllControllersOff: channel:" + channel.toString(10));
			}
			function setAllNotesOff(channel)
			{
				console.log("consoleSf2Synth AllNotesOff: channel:" + channel.toString(10));
			}
			function setRegisteredParameterCoarse(channel, value)
			{
			    console.log("consoleSf2Synth RegisteredParameterCoarse: channel:" + channel.toString(10) + " value:" + value.toString(10));
			}
			function setDataEntryCoarse(channel, value)
			{
			    console.log("consoleSf2Synth DataEntryCoarse: channel:" + channel.toString(10) + " value:" + value.toString(10));
			}
			// If the controller is not present in the controllers info array, it is ignored here
			switch(data1)
			{
				case CTL.BANK:
					checkControlExport(CTL.BANK);
					setBank(channel, data2);
					break;
				case CTL.MODWHEEL:
					checkControlExport(CTL.MODWHEEL);
					setModWheel(channel, data2);
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
			    case CTL.REGISTERED_PARAMETER_COARSE: // coarse parameter is coarse pitchWheelDeviation (=semitones)
			        checkControlExport(CTL.REGISTERED_PARAMETER_COARSE);
			        setRegisteredParameterCoarse(channel, data2);
			        break;
			    case CTL.DATA_ENTRY_COARSE: // default coarse pitchWheelDeviation is 2 semitones
			        checkControlExport(CTL.DATA_ENTRY_COARSE);
			        setDataEntryCoarse(channel, data2);
			        break;

				default:
					console.warn("Controller " + data1.toString(10) + " (0x" + data1.toString(16) + ") is not defined.");
			}
		}
		function handlePatchChange(channel, data1)
		{
			console.log("consoleSf2Synth Patch: channel:" + channel + " value:" + data1);
		}
		// CHANNEL_PRESSURE.data[1] is the amount of pressure 0..127.
		function handleChannelPressure(channel, data1)
		{
			console.log("consoleSf2Synth ChannelPressure: channel:" + channel + " value:" + data1);
		}
		function handlePitchWheel(channel, data1)
		{
			console.log("consoleSf2Synth PitchWheel: channel:" + channel + " value:" + data1);
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
			case CMD.PATCH:
				checkCommandExport(CMD.PATCH);
				handlePatchChange(channel, data1);
				break;
			case CMD.CHANNEL_PRESSURE:
				checkCommandExport(CMD.CHANNEL_PRESSURE);
				// CHANNEL_PRESSURE.data[1] is the amount of pressure 0..127.
				handleChannelPressure(channel, data1);
				break;
			case CMD.PITCHWHEEL:
				checkCommandExport(CMD.PITCHWHEEL);
				handlePitchWheel(channel, data1);
				break;

			default:
				console.warn("Error: Command "+ command.toString(10) + " (0x" + command.toString(16) + ") is not defined.");
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
