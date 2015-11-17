/*
*  copyright 2015 James Ingram
*  http://james-ingram-act-two.de/
*
*  Code licensed under MIT
*
*  The WebMIDI.utilities namespace which defines generally useful functions.   
*/

/*jslint bitwise: true, nomen: true, plusplus: true, white: true */
/*global WebMIDI: false,  window: false,  document: false, performance: false, console: false, alert: false, XMLHttpRequest: false */

WebMIDI.namespace('WebMIDI.utilities');

WebMIDI.utilities = (function()
{
    "use strict";

    var
	CMD = WebMIDI.constants.COMMAND,
	CTL = WebMIDI.constants.CONTROL,
	CUSTOMCONTROL = WebMIDI.constants.CUSTOMCONTROL,

	// This function is standard MIDI for setting the pitchWheel deviation.
	// arg1: the output synth (hardware or WebMIDISynth) 
	// arg2: the channel
	// arg3: the number of semitones by which the pitch will deviate from its default
	//       value when the pitchWheel value changes. In other words, after calling
	//       this function:
	//         If the pitchWheel is set to its maximum value, the pitch will be	raised
	//         by deviation semitones.
	//         If the pitchWheel is set to its minimum value, the pitch will be lowered
	//         by deviation semitones.
	// arg4: If this argument is omitted, or is not true, a hardware synth is assumed.
	//       If set to true, the PITCHWHEEL_DEVIATION control will be used.
	//       The PITCHWHEEL_DEVIATION control is only defined for MebMIDISynths.
	//       See WebMIDI/constants.js
    setPitchWheelDeviation = function(synth, channel, deviation, isWebMIDISynth)
    {
    	var msg;

    	if(isWebMIDISynth !== undefined && isWebMIDISynth === true)
    	{
    		msg = new Uint8Array([CMD.CONTROL_CHANGE + channel, CTL.PITCHWHEEL_DEVIATION, deviation]);
    		synth.send(msg, performance.now());
    	}
    	else // a hardware synth
    	{
    		// Both REGISTERED_PARAMETER controls MUST be set, otherwise DATA_ENTRY_COARSE has no effect!
    		// A DATA_ENTRY_FINE message is not set here. Setting it seems to have no effect.
    		msg = new Uint8Array([CMD.CONTROL_CHANGE + channel, CTL.REGISTERED_PARAMETER_COARSE, 0]);
    		synth.send(msg, performance.now());
    		msg = new Uint8Array([CMD.CONTROL_CHANGE + channel, CTL.REGISTERED_PARAMETER_FINE, 0]);
    		synth.send(msg, performance.now());
    		msg = new Uint8Array([CMD.CONTROL_CHANGE + channel, CTL.DATA_ENTRY_COARSE, deviation]);
    		synth.send(msg, performance.now());
    	}
    },

	// ji: I have changed the CMD.AFTERTOUCH constant to CMD.CUSTOMCONTROL_CHANGE for WebMIDI synths.
	// Hosts can set Aftertouch for both hard- and software synths, by defining the following
	// two custom controls in their WebMIDI synth(s), and calling the following function.
	//     { name: "aftertouchKey", index: CUSTOMCONTROL.AFTERTOUCH_KEY, defaultValue:0 }
	//     { name: "aftertouchPressure", index: CUSTOMCONTROL.AFTERTOUCH_PRESSURE, defaultValue:0 }
	// (AFTERTOUCH_KEY and AFTERTOUCH_PRESSURE are reserved indices 126 and 127.)
	// Using this scheme, custom control indices do not conflict with the Standard MIDI control indices,
	// and can be chosen freely in the range [0..125].
	setAftertouch = function(synth, channel, key, pressure, isWebMIDISynth)
	{
		var msg;

		if(isWebMIDISynth !== undefined && isWebMIDISynth === true)
		{
			msg = new Uint8Array([CMD.CUSTOMCONTROL_CHANGE + channel, CUSTOMCONTROL.AFTERTOUCH_NOTE, key]);
			synth.send(msg, performance.now());
			msg = new Uint8Array([CMD.CUSTOMCONTROL_CHANGE + channel, CUSTOMCONTROL.AFTERTOUCH_PRESSURE, pressure]);
			synth.send(msg, performance.now());
		}
		else // a hardware synth (sends a Standard MIDI Aftertouch message)
		{
			msg = new Uint8Array([CMD.CUSTOMCONTROL_CHANGE + channel, key, pressure]);
			synth.send(msg, performance.now());
		}
	},

    publicAPI =
    {
    	setPitchWheelDeviation: setPitchWheelDeviation,
    	setAftertouch: setAftertouch
    };

    return publicAPI;

}());
