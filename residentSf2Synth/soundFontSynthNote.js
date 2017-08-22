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
        volLevel = this.volume * Math.pow((this.velocity / 127), 2), // ji 21.08.2017
		volDecay = volAttack + instrument.volDecay,
		modDecay = modAttack + instrument.modDecay,
		loopStart = 0,
		loopEnd = 0,
		startTime = instrument.start / this.sampleRate;

        function amountToFreq(val)
        {
            return Math.pow(2, (val - 6900) / 1200) * 440;
        }

        if(instrument.doLoop === true)
        {
            loopStart = instrument.loopStart / this.sampleRate;
            loopEnd = instrument.loopEnd / this.sampleRate;
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
        /* ji begin changes December 2015 */
        // This line was originally:
        //    bufferSource.loop = (this.channel !== 9);
        bufferSource.loop = (this.channel !== 9) && (instrument.doLoop === true);
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

        // begin original gree
        //outputGain.linearRampToValueAtTime(this.volume * (this.velocity / 127), volAttack);
        //outputGain.linearRampToValueAtTime(this.volume * (1 - instrument.volSustain), volDecay);
        // end original gree

        // begin ji changes August 2017
        // volLevel is a new variable, defined in the vars above.
        outputGain.linearRampToValueAtTime(volLevel, volAttack);
        // For the following line see https://github.com/notator/WebMIDISynthHost/issues/29
        // Thanks @timjrd !
        // ji -- the instrument.volSustain attribute is a level parameter, not like the other
        // instrument.vol... attributes (which are time values).
        outputGain.linearRampToValueAtTime(volLevel * (1 - instrument.volSustain), volDecay);
        // end ji changes August 2017

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
		now = this.ctx.currentTime,

		// begin gree
		//   volEndTime = now + instrument.volRelease,
		//   modEndTime = now + instrument.modRelease;
		// end gree

		// begin ji
		// instrument.volRelease is 3.08 in preset 0 (grand piano) in the Arachno font.   
		// It cannot be the case that a piano note only stops 3.08 seconds after a
		// noteOff arrives.
        // The following line limits the value to 0.05 seconds.
        // This is a temporary kludge, pending the proper solution to the problem...
        volRelease = (instrument.volRelease > 0.05) ? 0.05 : instrument.volRelease,
        modRelease = (instrument.modRelease > 0.05) ? 0.05 : instrument.modRelease,
		volEndTime = now + volRelease,
		modEndTime = now + modRelease;
        // end ji

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
        // latest changes:
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
