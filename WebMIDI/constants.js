/*
 *  copyright 2015 James Ingram
 *  http://james-ingram-act-two.de/
 *
 *  Code licensed under MIT
 *
 *  The WebMIDI.constants namespace which defines read-only MIDI constants.
 *  I think this could be a standardized file. The CONTROL section needs to be completed.
 */

/*jslint bitwise: false, nomen: false, plusplus: false, white: true */
/*global WebMIDI: false,  window: false,  document: false, performance: false, console: false, alert: false, XMLHttpRequest: false */

WebMIDI.namespace('WebMIDI.constants');

WebMIDI.constants = (function()
{
    "use strict";
    var
    COMMAND = {},
    REAL_TIME = {},
    CONTROL = {},
	CUSTOMCONTROL = {},
    SYSTEM_EXCLUSIVE = {},
	DEFAULT = {},

    // True if constant is one of the REAL_TIME status bytes, otherwise false
    isRealTimeStatus = function(constant)
    {
        var result = false;

        if ((constant === REAL_TIME.MTC_QUARTER_FRAME)
        || (constant === REAL_TIME.SONG_POSITION_POINTER)
        || (constant === REAL_TIME.SONG_SELECT)
        || (constant === REAL_TIME.TUNE_REQUEST)
        || (constant === REAL_TIME.MIDI_CLOCK)
        || (constant === REAL_TIME.MIDI_TICK)
        || (constant === REAL_TIME.MIDI_START)
        || (constant === REAL_TIME.MIDI_CONTINUE)
        || (constant === REAL_TIME.MIDI_STOP)
        || (constant === REAL_TIME.ACTIVE_SENSE)
        || (constant === REAL_TIME.RESET))
        {
            result = true;
        }
        return result;
    },

	// These are written exactly as defined at MIDI.org: 
	// http://midi.org/techspecs/gm1sound.php
	// Also define all the percussion names (range 0..127) ??
	GeneralMIDIInstrumentNames =
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

    API =
    {
        COMMAND: COMMAND,
        REAL_TIME: REAL_TIME,
        CONTROL: CONTROL,
        CUSTOMCONTROL: CUSTOMCONTROL,
        SYSTEM_EXCLUSIVE: SYSTEM_EXCLUSIVE,
        DEFAULT: DEFAULT,
        isRealTimeStatus: isRealTimeStatus,
    	GeneralMIDIInstrumentNames: GeneralMIDIInstrumentNames
    };

    Object.defineProperty(COMMAND, "NOTE_OFF", { value: 0x80, writable: false });
    Object.defineProperty(COMMAND, "NOTE_ON", { value: 0x90, writable: false });
    Object.defineProperty(COMMAND, "CUSTOMCONTROL_CHANGE", { value: 0xA0, writable: false }); // was AFTERTOUCH -- see utilities.js
    Object.defineProperty(COMMAND, "CONTROL_CHANGE", { value: 0xB0, writable: false });
    Object.defineProperty(COMMAND, "PATCH_CHANGE", { value: 0xC0, writable: false });
    Object.defineProperty(COMMAND, "CHANNEL_PRESSURE", { value: 0xD0, writable: false });
    Object.defineProperty(COMMAND, "PITCHWHEEL", { value: 0xE0, writable: false });

    // REAL_TIME
    // These constants can be received or sent live during performances.
    // They are not stored in files.
    // The MIDI standard does not define 0xF4, 0xF5 or 0xFD.
    //
    // 0xF0 is SYSTEM_EXCLUSIVE.START (used in Standard MIDI Files)
    Object.defineProperty(REAL_TIME, "MTC_QUARTER_FRAME", { value: 0xF1, writable: false });
    Object.defineProperty(REAL_TIME, "SONG_POSITION_POINTER", { value: 0xF2, writable: false });
    Object.defineProperty(REAL_TIME, "SONG_SELECT", { value: 0xF3, writable: false });
    // 0xF4 is not defined by the MIDI standard
    // 0xF5 is not defined by the MIDI standard
    Object.defineProperty(REAL_TIME, "TUNE_REQUEST", { value: 0xF6, writable: false });
    // 0xF7 is SYSTEM_EXCLUSIVE.END (used in Standard MIDI Files) 
    Object.defineProperty(REAL_TIME, "MIDI_CLOCK", { value: 0xF8, writable: false });
    Object.defineProperty(REAL_TIME, "MIDI_TICK", { value: 0xF9, writable: false });
    Object.defineProperty(REAL_TIME, "MIDI_START", { value: 0xFA, writable: false });
    Object.defineProperty(REAL_TIME, "MIDI_CONTINUE", { value: 0xFB, writable: false });
    Object.defineProperty(REAL_TIME, "MIDI_STOP", { value: 0xFC, writable: false });
    // 0xFD is not defined by the MIDI standard
    Object.defineProperty(REAL_TIME, "ACTIVE_SENSE", { value: 0xFE, writable: false });
    Object.defineProperty(REAL_TIME, "RESET", { value: 0xFF, writable: false });

    // CONTROL
    // These are all I use for the moment (Feb. 2013).
    // This list could be easily be extended/completed.
	// Note that I am currently only using the "coarse" versions of these controls
    Object.defineProperty(CONTROL, "BANK_SELECT", { value: 0, writable: false });
    Object.defineProperty(CONTROL, "MODWHEEL", { value: 1, writable: false });
	/***********************************************************************************/
	// Proposal: new control. slots 3 and 35 are undefined in the MIDI standard,
	// so we could use them here for PITCHWHEEL_DEVIATION and PITCHWHEEL_DEVIATION_LO.
	// See WebMIDI/utilities.js
    Object.defineProperty(CONTROL, "PITCHWHEEL_DEVIATION", { value: 3, writable: false });
	/***********************************************************************************/
    Object.defineProperty(CONTROL, "DATA_ENTRY_COARSE", { value: 6, writable: false });
    Object.defineProperty(CONTROL, "VOLUME", { value: 7, writable: false });
    Object.defineProperty(CONTROL, "PAN", { value: 10, writable: false });
    Object.defineProperty(CONTROL, "EXPRESSION", { value: 11, writable: false });
    Object.defineProperty(CONTROL, "TIMBRE", { value: 71, writable: false });
    Object.defineProperty(CONTROL, "BRIGHTNESS", { value: 74, writable: false });
    Object.defineProperty(CONTROL, "EFFECTS", { value: 91, writable: false });
    Object.defineProperty(CONTROL, "TREMOLO", { value: 92, writable: false });
    Object.defineProperty(CONTROL, "CHORUS", { value: 93, writable: false });
    Object.defineProperty(CONTROL, "CELESTE", { value: 94, writable: false });
    Object.defineProperty(CONTROL, "PHASER", { value: 95, writable: false });
    Object.defineProperty(CONTROL, "REGISTERED_PARAMETER_FINE", { value: 100, writable: false });
    Object.defineProperty(CONTROL, "REGISTERED_PARAMETER_COARSE", { value: 101, writable: false });
    Object.defineProperty(CONTROL, "ALL_SOUND_OFF", { value: 120, writable: false });
    Object.defineProperty(CONTROL, "ALL_CONTROLLERS_OFF", { value: 121, writable: false });
    Object.defineProperty(CONTROL, "ALL_NOTES_OFF", { value: 123, writable: false });

	// CUSTOMCONTROL
	// These two values are reserved for custom controls that set Aftertouch (see utilities.js)
	// Other custom controls can be freely defined in the range [0..125].
    Object.defineProperty(CUSTOMCONTROL, "AFTERTOUCH_KEY", { value: 126, writable: false });
    Object.defineProperty(CUSTOMCONTROL, "AFTERTOUCH_PRESSURE", { value: 127, writable: false });

    // SYSTEM_EXCLUSIVE
    Object.defineProperty(SYSTEM_EXCLUSIVE, "START", { value: 0xF0, writable: false });
    Object.defineProperty(SYSTEM_EXCLUSIVE, "END", { value: 0xF7, writable: false });

	// DEFAULT
	// The values that should be set by an ALL_CONTROLLERS_OFF message.
	// Commands:
    Object.defineProperty(DEFAULT, "AFTERTOUCH", { value: 0, writable: false }); // all notes
    Object.defineProperty(DEFAULT, "CHANNEL_PRESSURE", { value: 0, writable: false });
    Object.defineProperty(DEFAULT, "PITCHWHEEL", { value: 64, writable: false });
	// Controllers:
	// All standard MIDI controllers use GENERIC_MIDI, except the others defined here.
	// These values should be set both in the HI-byte controller, and in the LO-byte
	// controller, if used.
    Object.defineProperty(DEFAULT, "GENERIC_MIDI", { value: 0, writable: false });
    Object.defineProperty(DEFAULT, "PITCHWHEEL_DEVIATION", { value: 2, writable: false });
    Object.defineProperty(DEFAULT, "VOLUME", { value: 100, writable: false });
    Object.defineProperty(DEFAULT, "PAN", { value: 64, writable: false });
    Object.defineProperty(DEFAULT, "EXPRESSION", { value: 127, writable: false });

    return API;

} ());

    
