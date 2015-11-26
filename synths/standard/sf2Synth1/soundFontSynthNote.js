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
*        SoundFontSynthNote(ctx, gainMaster, instrument)
* 
*/

/*global WebMIDI */

WebMIDI.namespace('WebMIDI.soundFontSynthNote');

WebMIDI.soundFontSynthNote = (function()
{
	"use strict";
	var
	SoundFontSynthNote = function(ctx, gainMaster, instrument)
	{
		this.ctx = ctx;
		this.gainMaster = gainMaster;
		this.instrument = instrument;
		this.channel = instrument.channel;
		this.key = instrument.key;
		this.velocity = instrument.velocity;
		this.buffer = instrument.sample;
		this.playbackRate = instrument.basePlaybackRate;
		this.sampleRate = instrument.sampleRate;
		this.volume = instrument.volume;
		this.panpot = instrument.panpot;
		this.pitchBend = instrument.pitchBend;
		this.pitchBendSensitivity = instrument.pitchBendSensitivity;
		this.modEnvToPitch = instrument.modEnvToPitch;

		// state
		this.startTime = ctx.currentTime;
		this.computedPlaybackRate = this.playbackRate;

		// audio node
		this.audioBuffer = null;
		this.bufferSource = null;
		this.panner = null;
		this.gainOutput = null;

		//console.log(instrument.modAttack, instrument.modDecay, instrument.modSustain, instrument.modRelease);	
	},

	API =
	{
		SoundFontSynthNote: SoundFontSynthNote // constructor
	};

	SoundFontSynthNote.prototype.noteOn = function()
	{
		var
		buffer, channelData, bufferSource, filter, panner,
		output, outputGain, baseFreq, peekFreq, sustainFreq,
		ctx = this.ctx,
		instrument = this.instrument,
		sample = this.buffer,
		now = this.ctx.currentTime,
		volAttack = now + instrument.volAttack,
		modAttack = now + instrument.modAttack,
		volDecay = volAttack + instrument.volDecay,
		modDecay = modAttack + instrument.modDecay,
		loopStart = instrument.loopStart / this.sampleRate,
		loopEnd = instrument.loopEnd / this.sampleRate,
		startTime = instrument.start / this.sampleRate;

		function amountToFreq(val)
		{
			return Math.pow(2, (val - 6900) / 1200) * 440;
		}

		sample = sample.subarray(0, sample.length + instrument.end);
		this.audioBuffer = ctx.createBuffer(1, sample.length, this.sampleRate);
		buffer = this.audioBuffer;
		channelData = buffer.getChannelData(0);
		channelData.set(sample);

		// buffer source
		this.bufferSource = ctx.createBufferSource();
		bufferSource = this.bufferSource;
		bufferSource.buffer = buffer;
		/* ji begin changes November 2015 */
		// This line was originally:
		//    bufferSource.loop = (this.channel !== 9);
		// This means that all presets in channels other than 9 should loop, and
		// assumes that they all have valid loop parameters.
		// In the Arachno soundFont, the presets Marimba, Banjo and Melodic Tom
		// use samples that have loops that start at 0 or 8. These must be bugs
		// in the soundFont.
		// The Sf2 spec says that loops should start at at least position 8.
		// If the loop starts too close to the attack, the attack is of course
		// played again.
		bufferSource.loop = (this.channel !== 9) && (instrument.loopStart > 8);
		/* ji end changes November 2015 */
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

		// panpot
		panner.panningModel = 'HRTF';
		panner.setPosition(
		  Math.sin(this.panpot * Math.PI / 2),
		  0,
		  Math.cos(this.panpot * Math.PI / 2)
		);

		//---------------------------------------------------------------------------
		// Attack, Decay, Sustain
		//---------------------------------------------------------------------------
		outputGain.setValueAtTime(0, now);
		outputGain.linearRampToValueAtTime(this.volume * (this.velocity / 127), volAttack);
		outputGain.linearRampToValueAtTime(this.volume * (1 - instrument.volSustain), volDecay);

		// begin ji changes November 2015.
		// The following original line was a (deliberate, forgotten?) bug that threw an out-of-range
		// exception when instrument['initialFilterQ'] > 0:
		//     filter.Q.setValueAtTime(instrument['initialFilterQ'] * Math.pow(10, 200), now);
		// The following line seems to work, but is it realy correct?
		filter.Q.setValueAtTime(instrument.initialFilterQ, now);
		// end ji ji changes November 2015

		baseFreq = amountToFreq(instrument.initialFilterFc);
		peekFreq = amountToFreq(instrument.initialFilterFc + instrument.modEnvToFilterFc);
		sustainFreq = baseFreq + (peekFreq - baseFreq) * (1 - instrument.modSustain);
		filter.frequency.setValueAtTime(baseFreq, now);
		filter.frequency.linearRampToValueAtTime(peekFreq, modAttack);
		filter.frequency.linearRampToValueAtTime(sustainFreq, modDecay);

		// connect
		bufferSource.connect(filter);
		filter.connect(panner);
		panner.connect(output);
		output.connect(this.gainMaster);

		// fire
		bufferSource.start(0, startTime);
	};

	SoundFontSynthNote.prototype.noteOff = function()
	{
		var
		instrument = this.instrument,
		bufferSource = this.bufferSource,
		output = this.gainOutput,
		now = this.ctx.currentTime;
		// begin original gree
		//var volEndTime = now + instrument.volRelease;
		//var modEndTime = now + instrument.modRelease;
		// end original gree

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

		//bufferSource.loop = false;
		//bufferSource.stop(volEndTime);
		// end original gree

		output.gain.cancelScheduledValues(now);
		output.gain.linearRampToValueAtTime(0, now);
		bufferSource.playbackRate.cancelScheduledValues(now);
		bufferSource.playbackRate.linearRampToValueAtTime(0, now);

		bufferSource.loop = false;
		bufferSource.stop(now);

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
		  instrument.volRelease * 1000
		);
	};

	SoundFontSynthNote.prototype.schedulePlaybackRate = function()
	{
		var
		playbackRate = this.bufferSource.playbackRate,
		computed = this.computedPlaybackRate,
		start = this.startTime,
		instrument = this.instrument,
		modAttack = start + instrument.modAttack,
		modDecay = modAttack + instrument.modDecay,
		peekPitch = computed * Math.pow(Math.pow(2, 1 / 12), this.modEnvToPitch * this.instrument.scaleTuning);

		playbackRate.cancelScheduledValues(0);
		playbackRate.setValueAtTime(computed, start);
		playbackRate.linearRampToValueAtTime(peekPitch, modAttack);
		playbackRate.linearRampToValueAtTime(computed + (peekPitch - computed) * (1 - instrument.modSustain), modDecay);
	};

	SoundFontSynthNote.prototype.updatePitchBend = function(pitchBend)
	{
		this.computedPlaybackRate = this.playbackRate * Math.pow(
		  Math.pow(2, 1 / 12),
		  (
			this.pitchBendSensitivity * (
			  pitchBend / (pitchBend < 0 ? 8192 : 8191)
			)
		  ) * this.instrument.scaleTuning
		);
		this.schedulePlaybackRate();
	};

	return API;

}());
