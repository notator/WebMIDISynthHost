/*
*  copyright 2015 Chris Wilson, James Ingram
*  https://github.com/cwilso
*  https://james-ingram-act-two.de/
*
*  Code licensed under MIT
*
*  WebMIDI.cwMonosynth contains a CWMonosynth constructor.
* 
*  This encapsulates Chris Wilson's monosynth synthesizer from
*  https://github.com/cwilso/monosynth
*  making it usable on the web without having any attached MIDI hardware.
*/

/*jslint bitwise, white */
/*global WebMIDI, window */

WebMIDI.namespace('WebMIDI.cwMonosynth');

WebMIDI.cwMonosynth = (function()
{
	"use strict";

	var
	CMD = WebMIDI.constants.COMMAND,

	// cwMonosynth (private)
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

	CWMonosynth = function()
	{
		if(!(this instanceof CWMonosynth))
		{
			return new CWMonosynth();
		}

		/** WebMIDIAPI §10 -- MIDIPort interface **/
		Object.defineProperty(this, "id", { value: "monosynth1", writable: false });
		Object.defineProperty(this, "manufacturer", { value: "chris wilson", writable: false });
		Object.defineProperty(this, "name", { value: "monosynth (Chris Wilson)", writable: false });
		Object.defineProperty(this, "type", { value: "output", writable: false });
		Object.defineProperty(this, "version", { value: "1", writable: false });
		Object.defineProperty(this, "ondisconnect", { value: null, writable: false }); // Do we need this at all? Is it correct to set it to null?

		/*** Is this necessary? See https://github.com/WebAudio/web-midi-api/issues/110 ***/
		Object.defineProperty(this, "removable", { value: true, writable: false });

		/*** Extensions for software synths ***/	
		Object.defineProperty(this, "url", { value: "http://webaudiodemos.appspot.com/monosynth/", writable: false }); // The synth author's webpage hosting the synth.		
		Object.defineProperty(this, "commands", { value: commands, writable: false }); // The commands supported by this synth (see above).		
		Object.defineProperty(this, "controls", { value: controls, writable: false }); // The controls supported by this synth (see above).		
		Object.defineProperty(this, "isMultiChannel", { value: false, writable: false }); // If isMultiChannel is false, the synth ignores the channel nibble in MIDI messages
		Object.defineProperty(this, "isPolyphonic", { value: false, writable: false }); // If isPolyphonic is false, the synth can only play one note at a time
	},

	API =
    {
    	CWMonosynth: CWMonosynth // constructor
    };
	// end var

	// WebMIDIAPI §4.6 -- MIDIPort interface
	// See https://github.com/notator/WebMIDISynthHost/issues/24
	CWMonosynth.prototype.open = function()
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
		console.log("cwMonosynth opened.");
	};

	// WebMIDIAPI §4.6 -- MIDIPort interface
	// See https://github.com/notator/WebMIDISynthHost/issues/24
	CWMonosynth.prototype.close = function()
	{
		console.log("cwMonosynth closed.");
	};

	// WebMIDIAPI MIDIOutput send()
	// This synth does not support timestamps.
	// It also ignores both channel info and velocity.
	CWMonosynth.prototype.send = function(message, ignoredTimestamp)
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
				console.warn("Command " + command.toString(10) + " (0x" + command.toString(16) + ") is not being exported.");
			}
		}
		function handleNoteOff(channel, data1, data2)
		{
			checkCommandExport(CMD.NOTE_OFF);
			that.noteOff(data1);
			console.log("cwMonosynth NoteOff: channel:" + channel + " note:" + data1 + " velocity:" + data2 + " (This synth ignores channel and velocity info.)");
		}
		function handleNoteOn(channel, data1, data2)
		{
			checkCommandExport(CMD.NOTE_ON);
			that.noteOn(data1);
			console.log("cwMonosynth NoteOn: channel:" + channel + " note:" + data1 + " velocity:" + data2 + " (This synth ignores channel and velocity info.)");
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
				console.log("cwMonosynth: this synth has no controls!");
				break;
			default:
				console.warn("Command " + command.toString(10) + " (0x" + command.toString(16) + ") is not defined.");
		}
	};

	CWMonosynth.prototype.noteOn = function(noteNumber)
	{
		activeNotes.push(noteNumber);
		oscillator.frequency.cancelScheduledValues(0);
		oscillator.frequency.setTargetAtTime(frequencyFromNoteNumber(noteNumber), 0, portamento);
		envelope.gain.cancelScheduledValues(0);
		envelope.gain.setTargetAtTime(1.0, 0, attack);
	};

	CWMonosynth.prototype.noteOff = function(noteNumber)
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
