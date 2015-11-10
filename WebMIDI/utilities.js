/*
*  copyright 2014 James Ingram
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

    // begin var
    var
	CMD = WebMIDI.constants.COMMAND,
	CTL = WebMIDI.constants.CONTROL,

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

    publicAPI =
    {
    	setPitchWheelDeviation: setPitchWheelDeviation
    };
    // end var

    return publicAPI;

}());
