/*
* Copyright 2015 James Ingram
* http://james-ingram-act-two.de/
*
* This code is based on the gree soundFont synthesizer at
* https://github.com/gree/sf2synth.js
*
* All this code is licensed under MIT
*
* The WebMIDI.soundFontSynthNote namespace containing the following constructor:
*
*        SoundFontSynthNote(ctx, gainMaster, keyLayers) 
*/

WebMIDI.namespace('WebMIDI.soundFontSynthNote');

WebMIDI.soundFontSynthNote = (function()
{
    "use strict";

	var
	SoundFontSynthNote = function(ctx, gainMaster, keyLayers, midi)
	{
		this.ctx = ctx;
		this.gainMaster = gainMaster;
		this.keyLayers = keyLayers;

		this.channel = midi.channel;
		this.key = midi.key;
		this.velocity = midi.velocity;
		this.pan = midi.pan;
		this.volume = midi.volume;
		this.pitchBend = midi.pitchBend;
		this.pitchBendSensitivity = midi.pitchBendSensitivity;

		this.buffer = keyLayers[0].sample;
		this.playbackRate = keyLayers[0].basePlaybackRate;
		this.sampleRate = keyLayers[0].sampleRate;
		this.modEnvToPitch = keyLayers[0].modEnvToPitch;

		// state
		this.startTime = ctx.currentTime;
		this.computedPlaybackRate = this.playbackRate;

		// audio node
		this.audioBuffer = null;
		this.bufferSource = null;
		this.panner = null;
		this.gainOutput = null;	
	},

	API =
	{
		SoundFontSynthNote: SoundFontSynthNote // constructor
	};

	SoundFontSynthNote.prototype.noteOn = function()
	{
	    // KeyLayers are "subChannels" associated with a particular key in this preset,
	    // i.e. they are "subChannels" associated with this particular Note.
	    // All the keyLayers have been read correctly (as far as I know) from the SoundFont file,
	    // but this file ignores all but the first (keyLayers[0]).
	    // (The Arachno SoundFont's preset 0 -- Grand Piano -- has two layers, in which
	    // keyLayer[0].pan is always -500 and keylayer[1].pan is always 500.)
	    // This version of soundFontSynthNote.js:
	    //    1) ignores all but the first keyLayer, and
	    //    2) ignores the first keyLayer's *pan* attribute.
	    //    3) plays the layer at the position set by the value of *this.pan* (see midi.pan above).
	    // TODO 1: Implement the playing of stereo samples, using stereo Web Audio buffers.
	    // 
	    // Each keyLayer has an entry for every soundFont "generator" in the spec, except those
	    // whose value has been used to calculate the values of the other "generator"s and should
	    // no longer be needed.
	    // If a soundFont "generator" was not present in the soundFont, it will have its default
	    // value in the keyLayer.
	    //
	    // The following "generator"s are present in the Arachno Grand Piano preset, and are
	    // the same for every key in the preset, but are not used by this file:
	    //    chorusEffectsSend (soundfile amount: 50, value here: 0.05)
	    //    reverbEffectsSend (soundfile amount: 200, value here: 0.20)
	    //    pan (layer 0 (left) soundfile amount: -500, value here: 0 -- completely left
	    //         layer 1 (right)soundfile amount: 500,  value here: 1 -- completely right)
	    //    delayModLFO (soundfile amount: -7973, value here: 0.01)
	    //    delayVibLFO (soundfile amount: -7973, value here: 0.01)
	    // TODO 2: Implement the playing of *all* the soundFont "generator"s, especially these five.
	    // N.B. the returned value of such unused generators is probably correct, but should be checked
	    // in soundFont.js. The position of the decimal point should be specially carefully checked.

	    var
		buffer, channelData, bufferSource, filter, panner,
		output, outputGain, baseFreq, peekFreq, sustainFreq,
		ctx = this.ctx,
		keyLayers = this.keyLayers,
		sample = this.buffer,
		now = this.ctx.currentTime,
        // The following keylayers[0] attributes are the *durations* of their respective envelope phases in seconds:
        //   volDelay, volAttack, volHold, volDelay, volRelease,
        //   modDelay, modAttack, modHold, modDelay, modRelease,
        // The volSustain and modSustain attributes are *factors* in the range [1.00 .. 0.00] (inclusive).
        // In general, all keyLayer attributes have directly usable values here in this file.
        // The conversions from the integer amounts in the soundFont have been done earlier.
        volDelay = now + keyLayers[0].volDelay,
		volAttack = volDelay + keyLayers[0].volAttack,
        volHold = volAttack + keyLayers[0].volHold,
        volDecay = volHold + (keyLayers[0].volDecay * keyLayers[0].volSustain), // see spec! ji

        modDelay = now + keyLayers[0].modDelay,
		modAttack = modDelay + keyLayers[0].modAttack,
        modHold = modAttack + keyLayers[0].modHold,
        modDecay = modHold + (keyLayers[0].modDecay * keyLayers[0].modSustain), // see spec! ji

        volLevel = this.volume * Math.pow((this.velocity / 127), 2), // ji 21.08.2017

		loopStart = 0,
		loopEnd = 0,
		startTime = keyLayers[0].start / this.sampleRate;

		function amountToFreq(val)
		{
			return Math.pow(2, (val - 6900) / 1200) * 440;
		}

		if(keyLayers[0].doLoop === true)
		{
			loopStart = keyLayers[0].loopStart / this.sampleRate;
			loopEnd = keyLayers[0].loopEnd / this.sampleRate;
		}
		sample = sample.subarray(0, sample.length + keyLayers[0].end);
		this.audioBuffer = ctx.createBuffer(1, sample.length, this.sampleRate);
		buffer = this.audioBuffer;
		channelData = buffer.getChannelData(0);
		channelData.set(sample);

		// buffer source
		this.bufferSource = ctx.createBufferSource();
		bufferSource = this.bufferSource;
		bufferSource.buffer = buffer;
		/* ji begin changes December 2015 */
		// This line was originally:
		//    bufferSource.loop = (this.channel !== 9);
		bufferSource.loop = (this.channel !== 9) && (keyLayers[0].doLoop === true);
		/* ji end changes December 2015 */
		bufferSource.loopStart = loopStart;
		bufferSource.loopEnd = loopEnd;
		this.updatePitchBend(this.pitchBend);

		// audio node
		this.panner = ctx.createPanner();
		panner = this.panner;
		this.gainOutput = ctx.createGain();
		output = this.gainOutput;
		outputGain = output.gain;

		// filter
		this.filter = ctx.createBiquadFilter();
		filter = this.filter;
		filter.type = 'lowpass';

		// pan
		panner.panningModel = 'HRTF';
		panner.setPosition(
		  Math.sin(this.pan * Math.PI / 2),
		  0,
		  Math.cos(this.pan * Math.PI / 2)
		);

		//---------------------------------------------------------------------------
		// Attack, Decay, Sustain
		//---------------------------------------------------------------------------

		outputGain.setValueAtTime(0, now);
		if(volDelay > now)
		{
		    outputGain.linearRampToValueAtTime(0, volDelay);
		}
		outputGain.linearRampToValueAtTime(volLevel, volAttack);
	    outputGain.linearRampToValueAtTime(volLevel, volHold);
	    outputGain.linearRampToValueAtTime(volLevel * (1 - keyLayers[0].volSustain), volDecay);

		// begin ji changes November 2015.
		// The following original line was a (deliberate, forgotten?) gree bug that threw an out-of-range
		// exception when keyLayers[0]['initialFilterQ'] > 0:
		//     filter.Q.setValueAtTime(keyLayers[0]['initialFilterQ'] * Math.pow(10, 200), now);
		// The following line seems to work, but is it realy correct?
		filter.Q.setValueAtTime(keyLayers[0].initialFilterQ, now);
		// end ji ji changes November 2015

		baseFreq = amountToFreq(keyLayers[0].initialFilterFc);
		peekFreq = amountToFreq(keyLayers[0].initialFilterFc + keyLayers[0].modEnvToFilterFc);
		sustainFreq = baseFreq + ((peekFreq - baseFreq) * (1 - keyLayers[0].modSustain));

		filter.frequency.setValueAtTime(baseFreq, now);
		if(modDelay > now)
		{
		    filter.frequency.linearRampToValueAtTime(baseFreq, modDelay);
		}
		filter.frequency.linearRampToValueAtTime(peekFreq, modAttack);
		filter.frequency.linearRampToValueAtTime(peekFreq, modHold);
		filter.frequency.linearRampToValueAtTime(sustainFreq, modDecay);

		// connect
		bufferSource.connect(filter);
		filter.connect(panner);
		panner.connect(output);
		output.connect(this.gainMaster);

		// fire
		bufferSource.start(0, startTime);
	};

    // current ji noteOff function
	SoundFontSynthNote.prototype.noteOff = function()
	{
	    var
		keyLayers = this.keyLayers,
		bufferSource = this.bufferSource,
		output = this.gainOutput,
		now = this.ctx.currentTime,
        volRelease = keyLayers[0].volRelease,
        modRelease = keyLayers[0].modRelease,
		volEndTime = now + volRelease,
		modEndTime = now + modRelease;

		if(!this.audioBuffer)
		{
			return;
		}

		//---------------------------------------------------------------------------
		// Release
		//---------------------------------------------------------------------------
		// begin original gree
		//output.gain.cancelScheduledValues(0);
		//output.gain.linearRampToValueAtTime(0, volEndTime);
		//bufferSource.playbackRate.cancelScheduledValues(0);
		//bufferSource.playbackRate.linearRampToValueAtTime(this.computedPlaybackRate, modEndTime);
		// end original gree

		// begin ji
	    // 1. use setTargetAtTime() instead of linearRampToValueAtTime(0, volEndTime). (Suggested by Timothée Jourde on GitHub).
	    // 2. call cancelScheduledValues(...) _after_ setting the envelopes, not before.
		output.gain.setTargetAtTime(0, now, volRelease);
		output.gain.cancelScheduledValues(volEndTime);
		bufferSource.playbackRate.linearRampToValueAtTime(this.computedPlaybackRate, modEndTime);
		bufferSource.playbackRate.cancelScheduledValues(modEndTime);
		// end ji

		bufferSource.loop = false;
		bufferSource.stop(volEndTime);

		// disconnect
		setTimeout(
		  (function(note)
			{
		  		return function()
		  		{
		  			note.bufferSource.disconnect(0);
		  			note.panner.disconnect(0);
		  			note.gainOutput.disconnect(0);
		  		};
			}(this)),
		  keyLayers[0].volRelease
		);
	};

	SoundFontSynthNote.prototype.schedulePlaybackRate = function()
	{
		var
		playbackRate = this.bufferSource.playbackRate,
		computed = this.computedPlaybackRate,
		start = this.startTime,
		keyLayers = this.keyLayers,
		modAttack = start + keyLayers[0].modAttack,
		modDecay = modAttack + keyLayers[0].modDecay,
		peekPitch = computed * Math.pow(Math.pow(2, 1 / 12), this.modEnvToPitch * keyLayers[0].scaleTuning);

		playbackRate.cancelScheduledValues(0);
		playbackRate.setValueAtTime(computed, start);
		playbackRate.linearRampToValueAtTime(peekPitch, modAttack);
		playbackRate.linearRampToValueAtTime(computed + (peekPitch - computed) * (1 - keyLayers[0].modSustain), modDecay);
	};

	SoundFontSynthNote.prototype.updatePitchBend = function(pitchBend)
	{
		this.computedPlaybackRate = this.playbackRate * Math.pow(
		  Math.pow(2, 1 / 12),
		  (
			this.pitchBendSensitivity * (
			  pitchBend / (pitchBend < 0 ? 8192 : 8191)
			)
		  ) * this.keyLayers[0].scaleTuning
		);
		this.schedulePlaybackRate();
	};

	return API;

}());
