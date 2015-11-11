﻿/*
*  copyright 2015 James Ingram
*  http://james-ingram-act-two.de/
*
*  Code licensed under MIT
*
*  WebMIDI.monosynth contains a Monosynth constructor.
* 
*  This encapsulates Chris Wilson's monosynth synthesizer from
*  https://github.com/cwilso/monosynth
*  making it usable on the web without having any attached MIDI hardware.
*/

/*jslint bitwise: false, nomen: true, plusplus: true, white: true */
/*global WebMIDI: false,  window: false,  document: false, performance: false, console: false, alert: false, XMLHttpRequest: false */

WebMIDI.namespace('WebMIDI.monosynth');

WebMIDI.monosynth = (function(document)
{
	"use strict";

	var
	CMD = WebMIDI.constants.COMMAND,

	// monosynth (private)
	context=null,		// the Web Audio "context" object
	//midiAccess=null,	// the MIDIAccess object.
	oscillator=null,	// the single oscillator
	envelope=null,		// the envelope for the single oscillator
	attack=0.05,		// attack speed
	release=0.05,		// release speed
	portamento=0.05,	// portamento/glide speed
	activeNotes = [],	// the stack of actively-pressed keys
	frequencyFromNoteNumber = function(note)
	{
		return 440 * Math.pow(2, (note - 69) / 12);
	},

	// for host
	commands =
	[
		CMD.NOTE_OFF,
		CMD.NOTE_ON 
	],
	controls =
	[
	],

	Monosynth = function()
	{
		if(!(this instanceof Monosynth))
		{
			return new Monosynth();
		}

		/** WebMIDIAPI §10 -- MIDIPort interface **/
		Object.defineProperty(this, "id", { value: "monosynth1", writable: false });
		Object.defineProperty(this, "manufacturer", { value: "chris wilson", writable: false });
		Object.defineProperty(this, "name", { value: "monosynth", writable: false });
		Object.defineProperty(this, "type", { value: "output", writable: false });
		Object.defineProperty(this, "version", { value: "1", writable: false });
		Object.defineProperty(this, "ondisconnect", { value: null, writable: false }); // Do we need this at all? Is it correct to set it to null?

		/*** Is this necessary? See https://github.com/WebAudio/web-midi-api/issues/110 ***/
		Object.defineProperty(this, "removable", { value: true, writable: false });

		/*** Extensions for software synths ***/	
		Object.defineProperty(this, "url", { value: "http://webaudiodemos.appspot.com/monosynth/", writable: false }); // The synth author's webpage hosting the synth.		
		Object.defineProperty(this, "commands", { value: commands, writable: false }); // The commands supported by this synth (see above).		
		Object.defineProperty(this, "controls", { value: controls, writable: false }); // The controls supported by this synth (see above).		
		Object.defineProperty(this, "isPolyphonic", { value: false, writable: false }); // If isPolyphonic is false, the synth ignores the channel nibble in MIDI messages
	},

	API =
    {
    	Monosynth: Monosynth // constructor
    };
	// end var

	// The init function should be called immediately after the synth has been constructed.
	Monosynth.prototype.init = function()
	{
		window.AudioContext = window.AudioContext || window.webkitAudioContext;

		context = new window.AudioContext();

		// set up the basic oscillator chain, muted to begin with.
		oscillator = context.createOscillator();
		oscillator.frequency.setValueAtTime(110, 0);
		envelope = context.createGain();
		oscillator.connect(envelope);
		envelope.connect(context.destination);
		envelope.gain.value = 0.0;  // Mute the sound
		oscillator.start(0);  // Go ahead and start up the oscillator
		console.log("monosynth initialised.");
	};

	// WebMIDIAPI MIDIOutput send()
	// This synth does not support timestamps.
	// It also ignores both channel info and velocity.
	Monosynth.prototype.send = function(message, ignoredTimestamp)
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
			that.noteOff(data1);
			console.log("monosynth NoteOff:".concat(" channel:", channel, " note:", data1, " velocity:", data2, " (This synth ignores channel and velocity info.)"));
		}
		function handleNoteOn(channel, data1, data2)
		{
			checkCommandExport(CMD.NOTE_ON);
			that.noteOn(data1);
			console.log("monosynth NoteOn:".concat(" channel:", channel, " note:", data1, " velocity:", data2, " (This synth ignores channel and velocity info.)"));
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

			default:
				throw "Error: ".concat("Command ", command.toString(10), " (", command.toString(16), ") is not defined.");
		}
	};

	Monosynth.prototype.noteOn = function(noteNumber)
	{
		activeNotes.push(noteNumber);
		oscillator.frequency.cancelScheduledValues(0);
		oscillator.frequency.setTargetAtTime(frequencyFromNoteNumber(noteNumber), 0, portamento);
		envelope.gain.cancelScheduledValues(0);
		envelope.gain.setTargetAtTime(1.0, 0, attack);
	};

	Monosynth.prototype.noteOff = function(noteNumber)
	{
		var position = activeNotes.indexOf(noteNumber);
		if(position !== -1)
		{
			activeNotes.splice(position, 1);
		}
		if(activeNotes.length === 0)
		{	// shut off the envelope
			envelope.gain.cancelScheduledValues(0);
			envelope.gain.setTargetAtTime(0.0, 0, release);
		} else
		{
			oscillator.frequency.cancelScheduledValues(0);
			oscillator.frequency.setTargetAtTime(frequencyFromNoteNumber(activeNotes[activeNotes.length - 1]), 0, portamento);
		}
	};

	return API;

}(document));