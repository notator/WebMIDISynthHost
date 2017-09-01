/*
* Copyright 2015 James Ingram
* http://james-ingram-act-two.de/
* 
* This code is based on the gree soundFont synthesizer at
* https://github.com/gree/sf2synth.js
*
* All this code is licensed under MIT.
*
* The WebMIDI.soundFontParser namespace containing:
* 
*        // SoundFontParser constructor
*        SoundFontParser(soundFontUrl, callback)
*/

/*jshint elision:true */
/*global WebMIDI */

WebMIDI.namespace('WebMIDI.soundFontParser');

WebMIDI.soundFontParser = (function()
{
	"use strict";
	var
	SoundFontParser = function(input, optParams) // input is a Uint8Array
	{
		optParams = optParams || {};
		this.input = input;
		this.parserOption = optParams.parserOption;
		this.presetHeader;
		this.presetZone;
		this.presetZoneModulator;
		this.presetZoneGenerator;
		this.instrument;
		this.instrumentZone;
		this.instrumentZoneModulator;
		this.instrumentZoneGenerator;
		this.sampleHeader;
	},

	API =
	{
		SoundFontParser: SoundFontParser
	};
	// end var

	SoundFontParser.prototype.parse = function()
	{
		var
		chunk,
		parser = new WebMIDI.riffParser.RiffParser(this.input, this.parserOption);

		// parse RIFF chunk
		parser.parse();
		if(parser.chunkList.length !== 1)
		{
			throw new Error('wrong chunk length');
		}

		chunk = parser.getChunk(0);
		if(chunk === null)
		{
			throw new Error('chunk not found');
		}

		this.parseRiffChunk(chunk);

		this.input = null;
	};

	SoundFontParser.prototype.parseRiffChunk = function(chunk)
	{
		var parser, data = this.input, ip = chunk.offset, signature;

		if(chunk.type !== 'RIFF')
		{
			throw new Error('invalid chunk type:' + chunk.type);
		}

		signature = String.fromCharCode(data[ip++], data[ip++], data[ip++], data[ip++]);
		if(signature !== 'sfbk')
		{
			throw new Error('invalid signature:' + signature);
		}

		parser = new WebMIDI.riffParser.RiffParser(data, { index: ip, length: chunk.size - 4 });
		parser.parse();
		if(parser.getNumberOfChunks() !== 3)
		{
			throw new Error('invalid sfbk structure');
		}

	    // INFO-list (metadata)
		this.parseInfoList(parser.getChunk(0));

	    // sdta-list (audio sample data)
		this.parseSdtaList(parser.getChunk(1));

		// pdta-list (preset data -- generators, modulators etc.)
		this.parsePdtaList(parser.getChunk(2));
	};

	SoundFontParser.prototype.parseInfoList = function(chunk)
	{
		var parser, data = this.input, ip = chunk.offset, signature;

		if(chunk.type !== 'LIST')
		{
			throw new Error('invalid chunk type:' + chunk.type);
		}

		signature = String.fromCharCode(data[ip++], data[ip++], data[ip++], data[ip++]);
		if(signature !== 'INFO')
		{
			throw new Error('invalid signature:' + signature);
		}

		parser = new WebMIDI.riffParser.RiffParser(data, { index: ip, length: chunk.size - 4 });
		parser.parse();
	};

	SoundFontParser.prototype.parseSdtaList = function(chunk)
	{
		var parser, data = this.input, ip = chunk.offset, signature;

		if(chunk.type !== 'LIST')
		{
			throw new Error('invalid chunk type:' + chunk.type);
		}

		signature = String.fromCharCode(data[ip++], data[ip++], data[ip++], data[ip++]);
		if(signature !== 'sdta')
		{
			throw new Error('invalid signature:' + signature);
		}

		parser = new WebMIDI.riffParser.RiffParser(data, { index: ip, length: chunk.size - 4 });
		parser.parse();
		if(parser.chunkList.length !== 1)
		{
			throw new Error('TODO');
		}

		this.samplingData = parser.getChunk(0);
	};

	SoundFontParser.prototype.parsePdtaList = function(chunk)
	{
		var parser, data = this.input, ip = chunk.offset, signature;

		if(chunk.type !== 'LIST')
		{
			throw new Error('invalid chunk type:' + chunk.type);
		}

		signature = String.fromCharCode(data[ip++], data[ip++], data[ip++], data[ip++]);
		if(signature !== 'pdta')
		{
			throw new Error('invalid signature:' + signature);
		}

		parser = new WebMIDI.riffParser.RiffParser(data, { index: ip, length: chunk.size - 4 });
		parser.parse();

		if(parser.getNumberOfChunks() !== 9)
		{
			throw new Error('invalid pdta chunk');
		}

		this.parsePhdr(parser.getChunk(0)); // the preset headers chunk
		this.parsePbag(parser.getChunk(1)); // the preset index list chunk
		this.parsePmod(parser.getChunk(2)); // the preset modulator list chunk
		this.parsePgen(parser.getChunk(3)); // the preset generator list chunk
		this.parseInst(parser.getChunk(4)); // the instrument names and indices chunk
		this.parseIbag(parser.getChunk(5)); // the instrument index list chunk
		this.parseImod(parser.getChunk(6)); // the instrument modulator list chunk
		this.parseIgen(parser.getChunk(7)); // the instrument generator list chunk
		this.parseShdr(parser.getChunk(8)); // the sample headers chunk
	};

	SoundFontParser.prototype.parsePhdr = function(chunk)
	{
		var
		data = this.input,
		ip = chunk.offset,
		presetHeader = this.presetHeader = [],
		size = chunk.offset + chunk.size;

		if(chunk.type !== 'phdr')
		{
			throw new Error('invalid chunk type:' + chunk.type);
		}

		while(ip < size)
		{
			presetHeader.push({
				presetName: String.fromCharCode.apply(null, data.subarray(ip, ip += 20)),
				preset: data[ip++] | (data[ip++] << 8),
				bank: data[ip++] | (data[ip++] << 8),
				presetBagIndex: data[ip++] | (data[ip++] << 8),
				library: (data[ip++] | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0,
				genre: (data[ip++] | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0,
				morphology: (data[ip++] | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)) >>> 0
			});
		}
	};

	SoundFontParser.prototype.parsePbag = function(chunk)
	{
		var
		data = this.input,
		ip = chunk.offset,
		presetZone = this.presetZone = [],
		size = chunk.offset + chunk.size;

		if(chunk.type !== 'pbag')
		{
			throw new Error('invalid chunk type:' + chunk.type);
		}

		while(ip < size)
		{
			presetZone.push({
				presetGeneratorIndex: data[ip++] | (data[ip++] << 8),
				presetModulatorIndex: data[ip++] | (data[ip++] << 8)
			});
		}
	};

	SoundFontParser.prototype.parsePmod = function(chunk)
	{
		if(chunk.type !== 'pmod')
		{
			throw new Error('invalid chunk type:' + chunk.type);
		}

		this.presetZoneModulator = this.parseGenorModChunk(chunk, 1);
	};

	SoundFontParser.prototype.parsePgen = function(chunk)
	{
		if(chunk.type !== 'pgen')
		{
			throw new Error('invalid chunk type:' + chunk.type);
		}
		this.presetZoneGenerator = this.parseGenorModChunk(chunk, 0);
	};

	SoundFontParser.prototype.parseInst = function(chunk)
	{
		var
		data = this.input,
		ip = chunk.offset,
		instrument = this.instrument = [],
		size = chunk.offset + chunk.size;

		if(chunk.type !== 'inst')
		{
			throw new Error('invalid chunk type:' + chunk.type);
		}

		while(ip < size)
		{
			instrument.push({
				instrumentName: String.fromCharCode.apply(null, data.subarray(ip, ip += 20)),
				instrumentBagIndex: data[ip++] | (data[ip++] << 8)
			});
		}
	};

	SoundFontParser.prototype.parseIbag = function(chunk)
	{
		var
		data = this.input,
		ip = chunk.offset,
		instrumentZone = this.instrumentZone = [],
		size = chunk.offset + chunk.size;

		if(chunk.type !== 'ibag')
		{
			throw new Error('invalid chunk type:' + chunk.type);
		}

		while(ip < size)
		{
			instrumentZone.push({
				instrumentGeneratorIndex: data[ip++] | (data[ip++] << 8),
				instrumentModulatorIndex: data[ip++] | (data[ip++] << 8)
			});
		}
	};

	SoundFontParser.prototype.parseImod = function(chunk)
	{
		if(chunk.type !== 'imod')
		{
			throw new Error('invalid chunk type:' + chunk.type);
		}

		this.instrumentZoneModulator = this.parseGenorModChunk(chunk, 1);
	};

	SoundFontParser.prototype.parseIgen = function(chunk)
	{
		if(chunk.type !== 'igen')
		{
			throw new Error('invalid chunk type:' + chunk.type);
		}

		this.instrumentZoneGenerator = this.parseGenorModChunk(chunk, 0);
	};

	SoundFontParser.prototype.parseShdr = function(chunk)
	{
		var
		sampleName, start, end, startLoop, endLoop, sampleRate, originalPitch,
		pitchCorrection, sampleLink, sampleType, uint8Array, buffer, sample, adjust,
		data = this.input,
		ip = chunk.offset,
		samples = this.sample = [],
		sampleHeader = this.sampleHeader = [],
		size = chunk.offset + chunk.size;

		if(chunk.type !== 'shdr')
		{
			throw new Error('invalid chunk type:' + chunk.type);
		}

		while(ip < size)
		{
			sampleName = String.fromCharCode.apply(null, data.subarray(ip, ip += 20));
			start = (
			  (data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)
			) >>> 0;
			end = (
			  (data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)
			) >>> 0;
			startLoop = (
			  (data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)
			) >>> 0;
			endLoop = (
			  (data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)
			) >>> 0;
			sampleRate = (
			  (data[ip++] << 0) | (data[ip++] << 8) | (data[ip++] << 16) | (data[ip++] << 24)
			) >>> 0;
			originalPitch = data[ip++];
			pitchCorrection = (data[ip++] << 24) >> 24;
			sampleLink = data[ip++] | (data[ip++] << 8);
			sampleType = data[ip++] | (data[ip++] << 8);

			uint8Array = new Uint8Array(data.subarray(this.samplingData.offset + start * 2, this.samplingData.offset + end * 2));
			buffer = uint8Array.buffer;
			sample = new Int16Array(buffer);

			startLoop -= start;
			endLoop -= start;

			if(sampleRate > 0)
			{
				adjust = this.adjustSampleData(sample, sampleRate);
				sample = adjust.sample;
				sampleRate *= adjust.multiply;
				startLoop *= adjust.multiply;
				endLoop *= adjust.multiply;
			}

			samples.push(sample);

			sampleHeader.push({
				sampleName: sampleName,
				/* commented out by gree
				start: start,
				end: end,
				*/
				startLoop: startLoop,
				endLoop: endLoop,
				sampleRate: sampleRate,
				originalPitch: originalPitch,
				pitchCorrection: pitchCorrection,
				sampleLink: sampleLink,
				sampleType: sampleType
			});
		}
	};

	SoundFontParser.prototype.adjustSampleData = function(sample, sampleRate)
	{
		var newSample, i, il, j, multiply = 1;

		while(sampleRate < 22050)
		{
			newSample = new Int16Array(sample.length * 2);
			il = sample.length;
			j = 0;
			for(i = 0; i < il; ++i)
			{
				newSample[j++] = sample[i];
				newSample[j++] = sample[i];
			}
			sample = newSample;
			multiply *= 2;
			sampleRate *= 2;
		}

		return {
			sample: sample,
			multiply: multiply
		};
	};

	SoundFontParser.prototype.parseGenorModChunk = function(chunk, doParseModChunk)
	{
		var code, key, output = [],
		data = this.input,
		ip = chunk.offset,
		size = chunk.offset + chunk.size;

		while(ip < size)
		{
		    if(doParseModChunk > 0)
		    {

		        // get sfModSrcOper (a 16-bit SFModulator value)
                // begin gree
		        //   // TODO
		        //   ip += 2;
		        // end gree

		        // begin ji
		        // See sf2 spec §8.2 for how to interpret the bits in an SFModulator
		        code = data[ip++] | (data[ip++] << 8);
		        key = "sfModSrcOper";
		        output.push({ type: key, value: code });
                // end ji
		    }

		    // sfModDestOper or sfGenOper
            // and the following 2-byte value (modAmount or genAmount)
			code = data[ip++] | (data[ip++] << 8);
			key = SoundFontParser.GeneratorEnumeratorTable[code];
			if(key === undefined)
			{
			    // ji comment August 2017
			    // code is one of the following generator indices: 14, 18,19,20, 42, 49, 55, 59
			    // The spec says these should be ignored if encountered.

			    // modAmount or genAmount
				output.push({
					type: key,
					value: {
						code: code,
						amount: data[ip] | (data[ip + 1] << 8) << 16 >> 16,
						lo: data[ip++],
						hi: data[ip++]
					}
				});
			}
			else
			{
			    // modAmount or genAmount
				switch(key)
			    {
				    case 'keyRange': // generator index 43, optional, lo is highest valid key, hi is lowest valid key
				    case 'velRange': // generator index 44, optional, lo is highest valid velocity, hi is lowest valid velocity
				    // begin original gree
				    // ji -- I've commented these out, because according to the spec, they are ordinary values (in range 0..127).
				    // These generators are not used by the rest of the gree code.
				    //   case 'keynum': // generator index 46 (range 0..127)
				    //   case 'velocity': // generator index 47 (range 0..127)
				    // end original gree
						output.push({
							type: key,
							value: {
								lo: data[ip++],
								hi: data[ip++]
							}
						});
						break;
					default:
						output.push({
							type: key,
							value: {
								amount: data[ip++] | (data[ip++] << 8) << 16 >> 16
							}
						});
						break;
				}
			}

			if(doParseModChunk > 0)
			{
			    // get sfModAmtSrcOper (a 16-bit SFModulator value)
                // begin gree
			    //   // TODO
			    //   ip += 2;
			    // end gree
			    // begin ji
			    // See sf2 spec §8.2 for how to interpret the bits in an SFModulator
			    code = data[ip++] | (data[ip++] << 8);
			    key = "sfModAmtSrcOper";
			    output.push({ type: key, value: code });
			    // end ji

			    // get sfModTransOper (a 16-bit SFTransform value)
			    // begin gree
			    //   // TODO
			    //   ip += 2;
			    // end gree
			    // begin ji
			    // See sf2 spec §8.3 for how to interpret this value. 
			    // The value must be either either 0 (=linear) or 2 (=absolute value).
			    code = data[ip++] | (data[ip++] << 8);
			    key = "sfModTransOper";
			    output.push({ type: key, value: code });
			    // end ji
			}
		}

		return output;
	};

	SoundFontParser.prototype.createInstrument = function()
	{
		var	bagIndex, bagIndexEnd, zoneInfo, instrumentGenerator, instrumentModulator,
		i, il, j, jl, output = [],
		instrument = this.instrument,
		zone = this.instrumentZone;

		// instrument -> instrument bag -> generator / modulator
		il = instrument.length;
		for(i = 0; i < il; ++i)
		{
			bagIndex = instrument[i].instrumentBagIndex;
			bagIndexEnd = instrument[i + 1] ? instrument[i + 1].instrumentBagIndex : zone.length;
			zoneInfo = [];

			// instrument bag
			jl = bagIndexEnd;
			for(j = bagIndex; j < jl; ++j)
			{
				instrumentGenerator = this.createInstrumentGenerator_(zone, j);
				instrumentModulator = this.createInstrumentModulator_(zone, j);

				zoneInfo.push({
					generator: instrumentGenerator.generator,
					generatorSequence: instrumentGenerator.generatorInfo,
					modulator: instrumentModulator.modulator,
					modulatorSequence: instrumentModulator.modulatorInfo
				});
			}

			output.push({
				name: instrument[i].instrumentName,
				info: zoneInfo
			});
		}

		return output;
	};

	SoundFontParser.prototype.createPreset = function()
	{
		var
		bagIndex, bagIndexEnd, zoneInfo, instrument, presetGenerator, presetModulator,
		i, il, j, jl,
		preset = this.presetHeader,
		zone = this.presetZone,
		output = [];

		// preset -> preset bag -> generator / modulator
		il = preset.length;
		for(i = 0; i < il; ++i)
		{
			bagIndex = preset[i].presetBagIndex;
			bagIndexEnd = preset[i + 1] ? preset[i + 1].presetBagIndex : zone.length;
			zoneInfo = [];

			// preset bag
			jl = bagIndexEnd;
			for(j = bagIndex; j < jl; ++j)
			{
				presetGenerator = this.createPresetGenerator_(zone, j);
				presetModulator = this.createPresetModulator_(zone, j);

				zoneInfo.push({
					generator: presetGenerator.generator,
					generatorSequence: presetGenerator.generatorInfo,
					modulator: presetModulator.modulator,
					modulatorSequence: presetModulator.modulatorInfo
				});

				instrument =
				  presetGenerator.generator.instrument !== undefined ?
					presetGenerator.generator.instrument.amount :
				  presetModulator.modulator.instrument !== undefined ?
					presetModulator.modulator.instrument.amount :
				  null;
			}

			output.push({
				name: preset[i].presetName,
				info: zoneInfo,
				header: preset[i],
				instrument: instrument
			});
		}

		return output;
	};

	SoundFontParser.prototype.createInstrumentGenerator_ = function(zone, index)
	{
		var modgen = this.createBagModGen_(
		  zone,
		  zone[index].instrumentGeneratorIndex,
		  zone[index + 1] ? zone[index + 1].instrumentGeneratorIndex : this.instrumentZoneGenerator.length,
		  this.instrumentZoneGenerator
		);

		return {
			generator: modgen.modgen,
			generatorInfo: modgen.modgenInfo
		};
	};

	SoundFontParser.prototype.createInstrumentModulator_ = function(zone, index)
	{
		var modgen = this.createBagModGen_(
		  zone,
		  zone[index].presetModulatorIndex,
		  zone[index + 1] ? zone[index + 1].instrumentModulatorIndex : this.instrumentZoneModulator.length,
		  this.instrumentZoneModulator
		);

		return {
			modulator: modgen.modgen,
			modulatorInfo: modgen.modgenInfo
		};
	};

	SoundFontParser.prototype.createPresetGenerator_ = function(zone, index)
	{
		var modgen = this.createBagModGen_(
		  zone,
		  zone[index].presetGeneratorIndex,
		  zone[index + 1] ? zone[index + 1].presetGeneratorIndex : this.presetZoneGenerator.length,
		  this.presetZoneGenerator
		);

		return {
			generator: modgen.modgen,
			generatorInfo: modgen.modgenInfo
		};
	};

	SoundFontParser.prototype.createPresetModulator_ = function(zone, index)
	{
		var modgen = this.createBagModGen_(
		  zone,
		  zone[index].presetModulatorIndex,
		  zone[index + 1] ? zone[index + 1].presetModulatorIndex : this.presetZoneModulator.length,
		  this.presetZoneModulator
		);

		return {
			modulator: modgen.modgen,
			modulatorInfo: modgen.modgenInfo
		};
	};

	SoundFontParser.prototype.createBagModGen_ = function(zone, indexStart, indexEnd, zoneModGen)
	{
		var info, i,
		modgenInfo = [],
		modgen =
		{
			unknown: [],
			keyRange: {hi: 127, lo: 0}
		};

		for(i = indexStart; i < indexEnd; ++i)
		{
			info = zoneModGen[i];
			modgenInfo.push(info);

			if(info.type === 'unknown')
			{
				modgen.unknown.push(info.value);
			}
			else
			{
				modgen[info.type] = info.value;
			}
		}

		return {
			modgen: modgen,
			modgenInfo: modgenInfo
		};
	};

	SoundFontParser.GeneratorEnumeratorTable = [
	  'startAddrsOffset',
	  'endAddrsOffset',
	  'startloopAddrsOffset',
	  'endloopAddrsOffset',
	  'startAddrsCoarseOffset',
	  'modLfoToPitch',
	  'vibLfoToPitch',
	  'modEnvToPitch',
	  'initialFilterFc',
	  'initialFilterQ',
	  'modLfoToFilterFc',
	  'modEnvToFilterFc',
	  'endAddrsCoarseOffset',
	  'modLfoToVolume',
	  , // 14
	  'chorusEffectsSend',
	  'reverbEffectsSend',
	  'pan',
	  , , , // 18,19,20
	  'delayModLFO',
	  'freqModLFO',
	  'delayVibLFO',
	  'freqVibLFO',
	  'delayModEnv',
	  'attackModEnv',
	  'holdModEnv',
	  'decayModEnv',
	  'sustainModEnv',
	  'releaseModEnv',
	  'keynumToModEnvHold',
	  'keynumToModEnvDecay',
	  'delayVolEnv',
	  'attackVolEnv',
	  'holdVolEnv',
	  'decayVolEnv',
	  'sustainVolEnv',
	  'releaseVolEnv',
	  'keynumToVolEnvHold',
	  'keynumToVolEnvDecay',
	  'instrument',
	  , // 42
	  'keyRange',
	  'velRange',
	  'startloopAddrsCoarseOffset',
	  'keynum',
	  'velocity',
	  'initialAttenuation',
	  , // 49
	  'endloopAddrsCoarseOffset',
	  'coarseTune',
	  'fineTune',
	  'sampleID',
	  'sampleModes',
	  , // 55
	  'scaleTuning',
	  'exclusiveClass',
	  'overridingRootKey'
	];

	return API;

}(window));




