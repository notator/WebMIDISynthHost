/*
* Copyright 2015 James Ingram
* https://james-ingram-act-two.de/
*
* This code is based on the gree soundFont synthesizer at
* https://github.com/gree/sf2synth.js
*
* All this code is licensed under MIT
*
* The WebMIDI.residentWAFSynthNote namespace containing the following constructor:
*
*        ResidentWAFSynthNote(ctx, gainMaster, keyLayers) 
*/

WebMIDI.namespace('WebMIDI.residentWAFSynthNote');

WebMIDI.residentWAFSynthNote = (function()
{
    "use strict";

	var
		ResidentWAFSynthNote = function(audioContext, noteGainNode, zone, midi)
		{
			if(!(this instanceof ResidentWAFSynthNote))
			{
				return new ResidentWAFSynthNote(audioContext, noteGainNode, envelopeType, zone, midi);
			}

			this.audioContext = audioContext;
			this.noteGainNode = noteGainNode; // this node has been connected to a channel inputNode
			this.zone = zone;

			this.key = midi.key;
			this.velocityFactor = midi.velocity / 127;
            this.pitchBend14bit = midi.pitchBend14bit;  // a value in range [-8192..+8191]
			this.pitchBendSensitivity = midi.pitchBendSensitivity;
		},

	API =
	{
		ResidentWAFSynthNote: ResidentWAFSynthNote // constructor
	};

	ResidentWAFSynthNote.prototype.noteOn = function()
	{
		function setNoteEnvelope(gain, now, velocityFactor, vEnvData)
		{
			// Surikov's WebAudioFontPlayer only uses volumes greater than 0.000001.
			// I think this may be to compensate for an old Web Audio bug that
			// produced clicks in the output, but that has since been corrected.
			// Using zero volume no longer seems to be a problem.
			// Note too, that I am using a basic attack-hold-decay envelope, without
			// Surikov's custom envelope capability.

			let volume = velocityFactor, // volume is always 1 * velocityFactor
				attackEndTime = now + vEnvData.attack, // attack max volume time
				holdEndTime = attackEndTime + vEnvData.hold,
				decayEndTime = holdEndTime + vEnvData.decay;				

			gain.cancelScheduledValues(now);
			gain.setValueAtTime(0, now); // initialise volume
			gain.linearRampToValueAtTime(volume, attackEndTime); // attack
			gain.linearRampToValueAtTime(volume, holdEndTime); // hold
			gain.linearRampToValueAtTime(0, decayEndTime); // decay
		}

		function getBufferSourceNode(audioContext, key, zone)
		{
			let doLoop = (zone.loopStart < 1 || zone.loopStart >= zone.loopEnd) ? false : true,
				baseDetune = zone.originalPitch - 100.0 * zone.coarseTune - zone.fineTune,
				bufferSourceNode = audioContext.createBufferSource();

			bufferSourceNode.buffer = zone.buffer;
			if(doLoop === true)
			{
				bufferSourceNode.loop = true;
				bufferSourceNode.loopStart = zone.loopStart / zone.sampleRate + zone.delay;
				bufferSourceNode.loopEnd = zone.loopEnd / zone.sampleRate + zone.delay;
			}
			else
			{
				bufferSourceNode.loop = false;
			}

			bufferSourceNode.standardPlaybackRate = Math.pow(2, (100.0 * key - baseDetune) / 1200.0);

			return bufferSourceNode;
		}

		let	audioContext = this.audioContext,
			zone = this.zone,
			noteGainNode = this.noteGainNode,
			now = this.audioContext.currentTime;

		this.startTime = now; // used in updatePlaybackRate

		this.envelopeDuration = zone.vEnvData.envelopeDuration; // used in setTimeout below, and in updatePlaybackRate()
		this.noteOffReleaseDuration = zone.vEnvData.noteOffReleaseDuration; 
		setNoteEnvelope(noteGainNode.gain, now, this.velocityFactor, zone.vEnvData);

		this.bufferSourceNode = getBufferSourceNode(audioContext, this.key, zone);
		this.updatePlaybackRate(this.pitchBend14bit);		
		this.bufferSourceNode.onended = function()
		{
			// see https://stackoverflow.com/questions/46203191/should-i-disconnect-nodes-that-cant-be-used-anymore
			noteGainNode.disconnect();
			console.log("The note's bufferSourceNode has stopped, and its noteGainNode has been disconnected.");
		};
		this.bufferSourceNode.connect(noteGainNode);

		// see https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start
		// N.B. zone.delay is defined/set to 0 when loading/adjusting the zone, and never changes.
		this.bufferSourceNode.start(now, zone.delay, this.envelopeDuration + 0.5);
	};

	ResidentWAFSynthNote.prototype.noteOff = function()
	{
		let
			noteGainNode = this.noteGainNode,
			stopTime = this.audioContext.currentTime + this.noteOffReleaseDuration;

		noteGainNode.gain.cancelScheduledValues(0);
		noteGainNode.gain.linearRampToValueAtTime(0, stopTime);

		this.bufferSourceNode.stop(stopTime + 0.5);
	};

	// This function is called when the bufferSourceNode has just been created, and
	// can be called again to shift the pitch while the note is still playing.
	// The pitchBend argument is a 14-bit int value (in range [-8192..+8191]). 
	ResidentWAFSynthNote.prototype.updatePlaybackRate = function(pitchBend14bit)
	{
		if(pitchBend14bit < -8192 || pitchBend14bit > 8191)
		{
			throw "Illegal pitchBend value.";
		}

		if((this.startTime + this.envelopeDuration) > this.audioContext.currentTime)
		{
			let factor = Math.pow(Math.pow(2, 1 / 12), (this.pitchBendSensitivity * (pitchBend14bit / (pitchBend14bit < 0 ? 8192 : 8191)))),
				bufferSourceNode = this.bufferSourceNode,
				newPlaybackRate = bufferSourceNode.standardPlaybackRate * factor;

			bufferSourceNode.playbackRate.setValueAtTime(newPlaybackRate, 0);
		}
	};

	return API;

}());
