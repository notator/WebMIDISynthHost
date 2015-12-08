/*
 *  copyright 2015 James Ingram
 *  http://james-ingram-act-two.de/
 *
 *  Code licensed under MIT
 *
 *  The WebMIDI.constants namespace which defines read-only MIDI constants.
 *  ji: The CONTROL objects need to be extended to include other useful standard MIDI controls.
 *  (Not _all_ the standard MIDI controls are useful for software WebMIDISynths.)
 */

/*jslint bitwise, white */
/*global WebMIDI */

WebMIDI.namespace('WebMIDI.constants');

WebMIDI.constants = (function()
{
    "use strict";
    var
    COMMAND = {},
    CONTROL = {},
	// These GM_PATCH_NAMES are written here exactly as defined at MIDI.org: 
	// http://midi.org/techspecs/gm1sound.php
	GM_PATCH_NAMES =
	[
		// Piano (1-8)
		"Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano", "Electric Piano 1",
		"Electric Piano 2", "Harpsichord", "Clavi",
		// Chromatic Percussion (9-16)
		"Celesta", "Glockenspiel", "Music Box", "Vibraphone", "Marimba", "Xylophone", "Tubular Bells", "Dulcimer",
		// Organ (17-24)
		"Drawbar Organ", "Percussive Organ", "Rock Organ", "Church Organ", "Reed Organ", "Accordion", "Harmonica",
		"Tango Accordion",
		// Guitar (25-32)
		"Acoustic Guitar (nylon)", "Acoustic Guitar (steel)", "Electric Guitar (jazz)", "Electric Guitar (clean)",
		"Electric Guitar (muted)", "Overdriven Guitar", "Distortion Guitar", "Guitar harmonics",
		// Bass (33-40)
		"Acoustic Bass", "Electric Bass (finger)", "Electric Bass (pick)", "Fretless Bass", "Slap Bass 1", "Slap Bass 2",
		"Synth Bass 1", "Synth Bass 2",
		// Strings (41-48)
		"Violin", "Viola", "Cello", "Contrabass", "Tremolo Strings", "Pizzicato Strings", "Orchestral Harp", "Timpani",
		// Ensemble (49-56)
		"String Ensemble 1", "String Ensemble 2", "SynthStrings 1", "SynthStrings 2", "Choir Aahs", "Voice Oohs", "Synth Voice",
		"Orchestra Hit",
		// Brass (57-64)
		"Trumpet", "Trombone", "Tuba", "Muted Trumpet", "French Horn", "Brass Section", "SynthBrass 1", "SynthBrass 2",
		// Reed (65-72)
		"Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax", "Oboe", "English Horn", "Bassoon", "Clarinet",
		// Pipe (73-80)
		"Piccolo", "Flute", "Recorder", "Pan Flute", "Blown Bottle", "Shakuhachi", "Whistle", "Ocarina",
		// Synth Lead (81-88)
		"Lead 1 (square)", "Lead 2 (sawtooth)", "Lead 3 (calliope)", "Lead 4 (chiff)", "Lead 5 (charang)", "Lead 6 (voice)",
		"Lead 7 (fifths)", "Lead 8 (bass + lead)",
		// Synth Pad (89-96)
		"Pad 1 (new age)", "Pad 2 (warm)", "Pad 3 (polysynth)", "Pad 4 (choir)", "Pad 5 (bowed)", "Pad 6 (metallic)",
		"Pad 7 (halo)", "Pad 8 (sweep)",
		// Synth Effects (97-104)
		"FX 1 (rain)", "FX 2 (soundtrack)", "FX 3 (crystal)", "FX 4 (atmosphere)", "FX 5 (brightness)",  "FX 6 (goblins)",
		"FX 7 (echoes)", "FX 8 (sci-fi)",
		// Ethnic (105-112)
		"Sitar", "Banjo", "Shamisen", "Koto", "Kalimba", "Bag pipe", "Fiddle", "Shanai",
		// Percussive (113-120)
		"Tinkle Bell", "Agogo", "Steel Drums", "Woodblock", "Taiko Drum", "Melodic Tom", "Synth Drum", "Reverse Cymbal",
		// Sound Effects (121-128)
		"Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet", "Telephone Ring", "Helicopter", "Applause",
		"Gunshot"
	],

	// These GM_PERCUSSION_NAMES are written here exactly as defined at MIDI.org: 
	// http://midi.org/techspecs/gm1sound.php
	GM_PERCUSSION_NAMES =
	[
		"Acoustic Bass Drum",// noteIndex 34
		"Bass Drum 1",   // 35
		"Side Stick",    // 36
		"Acoustic Snare",// 37
		"Hand Clap",     // 38
		"Electric Snare",// 39
		"Low Floor Tom", // 40
		"Closed Hi Hat", // 41
		"High Floor Tom",// 42
		"Pedal Hi-Hat",  // 43
		"Low Tom",       // 44
		"Open Hi-Hat",   // 45
		"Low-Mid Tom",   // 46
		"Hi-Mid Tom",    // 47
		"Crash Cymbal 1",// 48
		"High Tom",      // 49
		"Ride Cymbal 1", // 50
		"Chinese Cymbal",// 51
		"Ride Bell",     // 52
		"Tambourine",    // 53
		"Splash Cymbal", // 54
		"Cowbell",       // 55
		"Crash Cymbal 2",// 56
		"Vibraslap",     // 57
		"Ride Cymbal 2", // 58
		"Hi Bongo",      // 59
		"Low Bongo",     // 60
		"Mute Hi Conga", // 61
		"Open Hi Conga", // 62
		"Low Conga",     // 63
		"High Timbale",  // 64
		"Low Timbale",   // 65
		"High Agogo",    // 66
		"Low Agogo",     // 67
		"Cabasa",        // 68
		"Maracas",       // 69
		"Short Whistle", // 70
		"Long Whistle",  // 71
		"Short Guiro",   // 72
		"Long Guiro",    // 73
		"Claves",        // 74
		"Hi Wood Block", // 75
		"Low Wood Block",// 76
		"Mute Cuica",    // 77
		"Open Cuica",    // 78
		"Mute Triangle", // 79
		"Open Triangle"  // 80	 
	],

	commandName = function(command)
	{
		switch(command)
		{
			case COMMAND.NOTE_OFF:
				return ("noteOff");
			case COMMAND.NOTE_ON:
				return ("noteOn");
			case COMMAND.AFTERTOUCH:
				return ("aftertouch");
			case COMMAND.CONTROL_CHANGE:
				return ("controlChange");
			case COMMAND.PATCH:
				return ("patch");
			case COMMAND.CHANNEL_PRESSURE:
				return ("channelPressure");
			case COMMAND.PITCHWHEEL:
				return ("pitchWheel");
			default:
				console.warn("Bad argument");
				break;
		}
	},
	// Only AFTERTOUCH, PATCH, CHANNEL_PRESSURE and PITCHWHEEL have default values.
	commandDefaultValue = function(command)
	{
		switch(command)
		{
			case COMMAND.AFTERTOUCH:
			case COMMAND.PATCH:
			case COMMAND.CHANNEL_PRESSURE:
				return (0);
			case COMMAND.PITCHWHEEL:
				return (64);
			default:
				console.warn("Bad argument.");
				break;
		}
	},
	
	controlName = function(control)
	{
		switch(control)
		{
			case CONTROL.BANK:
				return ("bank");
			case CONTROL.MODWHEEL:
				return ("modWheel");
			case CONTROL.PITCHWHEEL_DEVIATION:
				return ("pitchWheelDeviation");
			case CONTROL.VOLUME:
				return ("volume");
			case CONTROL.PAN:
				return ("pan");
			case CONTROL.ALL_SOUND_OFF:
				return ("allSoundOff");
			case CONTROL.ALL_CONTROLLERS_OFF:
				return ("allControllersOff");
			case CONTROL.ALL_NOTES_OFF:
				return ("allNotesOff");
		}
	},
	// Only 3-byte controls have default values.
	// The return value is undefined for 2-byte controls.
	controlDefaultValue = function(control)
	{
		switch(control)
		{
			case CONTROL.BANK:
			case CONTROL.MODWHEEL:
				return (0);
			case CONTROL.PITCHWHEEL_DEVIATION:
				return (2);
			case CONTROL.VOLUME:
				return (100);
			case CONTROL.PAN:
				return (64);
			default:
				break;	// return undefined
		}
	},

	generalMIDIPatchName = function(patchIndex)
	{
		var patchName;
		if(patchIndex >= 0 && patchIndex <= GM_PATCH_NAMES.length)
		{
			patchName = GM_PATCH_NAMES[patchIndex];
		}
		else
		{
			console.warn("Bad argument");
		}
		return patchName;
	},

	generalMIDIPercussionName = function(noteIndex)
	{
		var
		percussionName,
		indexOfFirstPercussionName = 34,
		index = noteIndex - indexOfFirstPercussionName;

		if(index >= 0 && index <= GM_PERCUSSION_NAMES.length)
		{
			percussionName = GM_PERCUSSION_NAMES[index];
		}
		else
		{
			console.warn("Bad argument");
		}
		return percussionName;
	},

    API =
    {
        COMMAND: COMMAND,
        CONTROL: CONTROL,
        commandName: commandName,
        commandDefaultValue: commandDefaultValue,
        controlName: controlName,
        controlDefaultValue: controlDefaultValue,
        generalMIDIPatchName: generalMIDIPatchName,
        generalMIDIPercussionName: generalMIDIPercussionName
    };

	// COMMAND
    Object.defineProperty(COMMAND, "NOTE_OFF", { value: 0x80, writable: false });
    Object.defineProperty(COMMAND, "NOTE_ON", { value: 0x90, writable: false });
    Object.defineProperty(COMMAND, "AFTERTOUCH", { value: 0xA0, writable: false });
    Object.defineProperty(COMMAND, "CONTROL_CHANGE", { value: 0xB0, writable: false });
    Object.defineProperty(COMMAND, "PATCH", { value: 0xC0, writable: false });
    Object.defineProperty(COMMAND, "CHANNEL_PRESSURE", { value: 0xD0, writable: false });
    Object.defineProperty(COMMAND, "PITCHWHEEL", { value: 0xE0, writable: false });

    // CONTROL
	// Note that I am currently only using the "coarse" versions of these controls.
	// I think the corresponding "fine" controls should be named with a "_LO" suffix
	// (e.g. MODWHEEL_LO).
    Object.defineProperty(CONTROL, "BANK", { value: 0, writable: false });
    Object.defineProperty(CONTROL, "MODWHEEL", { value: 1, writable: false });
	// ji: added PITCHWHEEL_DEVIATION for (software) WebMIDISynths only.
	// This file defines WebMIDI.constants, and many software synths will want to define
	// their own function for this control. I think it should have a standard value
	// for all WebMIDISynths. CC9 is not used in the MIDI standard.
    Object.defineProperty(CONTROL, "PITCHWHEEL_DEVIATION", { value: 9, writable: false });
    Object.defineProperty(CONTROL, "VOLUME", { value: 7, writable: false });
    Object.defineProperty(CONTROL, "PAN", { value: 10, writable: false });
    Object.defineProperty(CONTROL, "ALL_SOUND_OFF", { value: 120, writable: false });
    Object.defineProperty(CONTROL, "ALL_CONTROLLERS_OFF", { value: 121, writable: false });
    Object.defineProperty(CONTROL, "ALL_NOTES_OFF", { value: 123, writable: false });
    return API;

} ());

    
