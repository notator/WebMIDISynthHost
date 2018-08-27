/*
* Copyright 2015 James Ingram
* https://james-ingram-act-two.de/
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
		size = chunk.offset + chunk.size,
		generatorTable = SoundFontParser.prototype.GeneratorEnumeratorTable;

		while(ip < size)
		{
		    if(doParseModChunk > 0)
		    {
		        // See sf2 spec §8.2 for how to interpret the bits in an SFModulator
		        code = data[ip++] | (data[ip++] << 8);
		        key = "sfModSrcOper";
		        output.push({ type: key, value: code });
		    }

		    // sfModDestOper or sfGenOper
            // and the following 2-byte value (modAmount or genAmount)
			code = data[ip++] | (data[ip++] << 8);
			key = generatorTable[code].name;
			// modAmount or genAmount
			switch(key)
			{
				case 'keyRange': // generator index 43, optional, lo is highest valid key, hi is lowest valid key
				case 'velRange': // generator index 44, optional, lo is highest valid velocity, hi is lowest valid velocity
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

			if(doParseModChunk > 0)
			{
			    // get sfModAmtSrcOper (a 16-bit SFModulator value)
			    // See sf2 spec §8.2 for how to interpret the bits in an SFModulator
			    code = data[ip++] | (data[ip++] << 8);
			    key = "sfModAmtSrcOper";
			    output.push({ type: key, value: code });

			    // get sfModTransOper (a 16-bit SFTransform value)
			    // See sf2 spec §8.3 for how to interpret this value. 
			    // The value must be either either 0 (=linear) or 2 (=absolute value).
			    code = data[ip++] | (data[ip++] << 8);
			    key = "sfModTransOper";
			    output.push({ type: key, value: code });
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

    // 'default' is the default amount for the raw, integer value of the generator.      
	SoundFontParser.prototype.GeneratorEnumeratorTable = [
	  { 'name': 'startAddrsOffset', 'default': 0 },
	  { 'name': 'endAddrsOffset', 'default': 0 },
	  { 'name': 'startloopAddrsOffset', 'default': 0 },
	  { 'name': 'endloopAddrsOffset', 'default': 0 },
	  { 'name': 'startAddrsCoarseOffset', 'default': 0 },
	  { 'name': 'modLfoToPitch', 'default': 0 },
	  { 'name': 'vibLfoToPitch', 'default': 0 },
	  { 'name': 'modEnvToPitch', 'default': 0 },
	  { 'name': 'initialFilterFc', 'default': 13500 },
	  { 'name': 'initialFilterQ', 'default': 0 },
	  { 'name': 'modLfoToFilterFc', 'default': 0 },
	  { 'name': 'modEnvToFilterFc', 'default': 0 },	
	  { 'name': 'endAddrsCoarseOffset', 'default': 0 },
	  { 'name': 'modLfoToVolume', 'default': 0 },
	  { 'name': 'unused1', 'default': 0}, // 14
	  { 'name': 'chorusEffectsSend', 'default': 0 },
	  { 'name': 'reverbEffectsSend', 'default': 0 },
	  { 'name': 'pan', 'default': 0 },
      { 'name': 'unused2', 'default': 0 }, // 18
      { 'name': 'unused3', 'default': 0 }, // 19
      { 'name': 'unused4', 'default': 0 }, // 20
	  { 'name': 'delayModLFO', 'default': -12000 },
	  { 'name': 'freqModLFO', 'default': 0 },
	  { 'name': 'delayVibLFO', 'default': -12000 },
	  { 'name': 'freqVibLFO', 'default': 0 },
	  { 'name': 'delayModEnv', 'default': -12000 },
	  { 'name': 'attackModEnv', 'default': -12000 },
	  { 'name': 'holdModEnv', 'default': -12000 },
	  { 'name': 'decayModEnv', 'default': -12000 },
	  { 'name': 'sustainModEnv', 'default': 0 },
	  { 'name': 'releaseModEnv', 'default': -12000 },
	  { 'name': 'keynumToModEnvHold', 'default': 0 },
	  { 'name': 'keynumToModEnvDecay', 'default': 0 },
	  { 'name': 'delayVolEnv', 'default': -12000 },
	  { 'name': 'attackVolEnv', 'default': -12000 },
	  { 'name': 'holdVolEnv', 'default': -12000 },
	  { 'name': 'decayVolEnv', 'default': -12000 },
	  { 'name': 'sustainVolEnv', 'default': 0 },
	  { 'name': 'releaseVolEnv', 'default': -12000 },
	  { 'name': 'keynumToVolEnvHold', 'default': 0 },
	  { 'name': 'keynumToVolEnvDecay', 'default': 0 },
	  { 'name': 'instrument', 'default': 0 },
	  { 'name': 'reserved1', 'default': 0 }, // 42
	  { 'name': 'keyRange', 'default': { 'lo': 0, 'hi': 127 } },
	  { 'name': 'velRange', 'default': { 'lo': 0, 'hi': 127 } },
	  { 'name': 'startloopAddrsCoarseOffset', 'default': 0 },
	  { 'name': 'keynum', 'default': -1 },
	  { 'name': 'velocity', 'default': -1 },
	  { 'name': 'initialAttenuation', 'default': 0 },
	  { 'name': 'reserved2', 'default': 0 }, // 49
	  { 'name': 'endloopAddrsCoarseOffset', 'default': 0 },
	  { 'name': 'coarseTune', 'default': 0 },
	  { 'name': 'fineTune', 'default': 0 },
	  { 'name': 'sampleID', 'default': 0 },
	  { 'name': 'sampleModes', 'default': 0 }, 
	  { 'name': 'reserved3', 'default': 0 }, // 55
	  { 'name': 'scaleTuning', 'default': 100 },
	  { 'name': 'exclusiveClass', 'default': 0 },
	  { 'name': 'overridingRootKey', 'default': -1 } // 58
      // generators with index 59 and 60 are always ignored, so dont exist here.
	];

	return API;

}(window));




