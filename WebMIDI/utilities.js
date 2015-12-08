/*
*  copyright 2015 James Ingram
*  http://james-ingram-act-two.de/
*
*  Code licensed under MIT
*
*  The WebMIDI.utilities namespace which defines generally useful functions.   
*/

/*jslint bitwise, white */
/*global WebMIDI, performance */

WebMIDI.namespace('WebMIDI.utilities');

WebMIDI.utilities = (function()
{
    "use strict";

    var
	CMD = WebMIDI.constants.COMMAND,
	CTL = WebMIDI.constants.CONTROL,

	// This function can be used to set the pitchWheel deviation when the host is
	// using both hardware synths and WebMIDISynths.
	// arg1: the output synth (hardware or WebMIDISynth) 
	// arg2: the channel
	// arg3: the number of semitones by which the pitch will deviate from its default
	//       value when the pitchWheel value changes. In other words, after calling
	//       this function:
	//         If the pitchWheel is set to its maximum value, the pitch will be	raised
	//         by deviation semitones.
	//         If the pitchWheel is set to its minimum value, the pitch will be lowered
	//         by deviation semitones.
	// arg4: If this argument is omitted, a hardware synth is assumed.
	//       If set, this is the CC index used by the synth to set pitchWheel deviation.
    setPitchWheelDeviation = function(synth, channel, deviation, synthPitchWheelCCIndex)
    {
    	var msg;

    	if(synthPitchWheelCCIndex !== undefined)
    	{
    		msg = new Uint8Array([CMD.CONTROL_CHANGE + channel, synthPitchWheelCCIndex, deviation]);
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

    return publicAPI;

}());
