/*
* Copyright 2015 James Ingram
* http://james-ingram-act-two.de/
* 
* This code is based on the gree soundFont synthesizer at
* https://github.com/gree/sf2synth.js
*
* All this code is licensed under MIT
*
* The WebMIDI.soundFont namespace containing:
* 
*        // SoundFont constructor
*        SoundFont(soundFontUrl, callback)
*/

/*jslint bitwise: false, nomen: true, plusplus: true, white: true */
/*global WebMIDI: false,  window: false,  document: false, performance: false, console: false, alert: false, XMLHttpRequest: false */


WebMIDI.namespace('WebMIDI.soundFont');

WebMIDI.soundFont = (function()
{
	"use strict";
	var
	name, // ji for host
	requiredPresets, // ji for host
	banks, // export to synth

	createBagModGen_ = function(indexStart, indexEnd, zoneModGen)
	{
		var modgenInfo = [],
			modgen = {
				unknown: [],
				'keyRange': {
					hi: 127,
					lo: 0
				}},
			info,
			i;

		for(i = indexStart; i < indexEnd; ++i)
		{
			info = zoneModGen[i];
			modgenInfo.push(info);

			if(info.type === 'unknown')
			{
				modgen.unknown.push(info.value);
			} else
			{
				modgen[info.type] = info.value;
			}
		}

		return {
			modgen: modgen,
			modgenInfo: modgenInfo
		};
	},

	createPresetModulator_ = function(parser, zone, index)
	{
		var modgen = createBagModGen_(
		  zone[index].presetModulatorIndex,
		  zone[index + 1] ? zone[index + 1].presetModulatorIndex : parser.presetZoneModulator.length,
		  parser.presetZoneModulator
		);

		return {
			modulator: modgen.modgen,
			modulatorInfo: modgen.modgenInfo
		};
	},
	
	createPresetGenerator_ = function(parser, zone, index)
	{
		var modgen = parser.createBagModGen_(
		  zone,
		  zone[index].presetGeneratorIndex,
		  zone[index + 1] ? zone[index + 1].presetGeneratorIndex : parser.presetZoneGenerator.length,
		  parser.presetZoneGenerator
		);

		return {
			generator: modgen.modgen,
			generatorInfo: modgen.modgenInfo
		};
	},

	createInstrumentModulator_ = function(parser, zone, index)
	{
		var modgen = parser.createBagModGen_(
		  zone,
		  zone[index].presetModulatorIndex,
		  zone[index + 1] ? zone[index + 1].instrumentModulatorIndex : parser.instrumentZoneModulator.length,
		  parser.instrumentZoneModulator
		);

		return {
			modulator: modgen.modgen,
			modulatorInfo: modgen.modgenInfo
		};
	},

	createInstrumentGenerator_ = function(parser, zone, index)
	{
		var modgen = parser.createBagModGen_(
		  zone,
		  zone[index].instrumentGeneratorIndex,
		  zone[index + 1] ? zone[index + 1].instrumentGeneratorIndex : parser.instrumentZoneGenerator.length,
		  parser.instrumentZoneGenerator
		);

		return {
			generator: modgen.modgen,
			generatorInfo: modgen.modgenInfo
		};
	},

	getModGenAmount = function(generator, enumeratorType, opt_default)
	{
		if (opt_default === undefined) {
			opt_default = 0;
		}

		return generator[enumeratorType] ? generator[enumeratorType].amount : opt_default;
	},

	createNoteInfo = function(parser, generator, preset) {

		/** @type {number} */
		var sampleId,
		/** @type {Object} */
		sampleHeader,
		/** @type {number} */
		volAttack,
		/** @type {number} */
		volDecay,
		/** @type {number} */
		volSustain,
		/** @type {number} */
		volRelease,
		/** @type {number} */
		modAttack,
		/** @type {number} */
		modDecay,
		/** @type {number} */
		modSustain,
		/** @type {number} */
		modRelease,
		/** @type {number} */
		tune,
		/** @type {number} */
		scale,
		/** @type {number} */
		freqVibLFO,
		/** @type {number} */
		i;

		if (generator.keyRange === undefined || generator.sampleID === undefined) {
			return;
		}

		volAttack  = getModGenAmount(generator, 'attackVolEnv',  -12000);
		volDecay   = getModGenAmount(generator, 'decayVolEnv',   -12000);
		volSustain = getModGenAmount(generator, 'sustainVolEnv');
		volRelease = getModGenAmount(generator, 'releaseVolEnv', -12000);
		modAttack  = getModGenAmount(generator, 'attackModEnv',  -12000);
		modDecay   = getModGenAmount(generator, 'decayModEnv',   -12000);
		modSustain = getModGenAmount(generator, 'sustainModEnv');
		modRelease = getModGenAmount(generator, 'releaseModEnv', -12000);

		tune = (
		  getModGenAmount(generator, 'coarseTune') +
		  getModGenAmount(generator, 'fineTune') / 100
		);
		scale = getModGenAmount(generator, 'scaleTuning', 100) / 100;
		freqVibLFO = getModGenAmount(generator, 'freqVibLFO');

		for(i = generator.keyRange.lo; i <= generator.keyRange.hi; ++i)
		{
			if(preset[i] === undefined)
			{
				sampleId = getModGenAmount(generator, 'sampleID');
				sampleHeader = parser.sampleHeader[sampleId];
				preset[i] = {
					'sample': parser.sample[sampleId],
					'sampleRate': sampleHeader.sampleRate,
					'basePlaybackRate': Math.pow(
					  Math.pow(2, 1 / 12),
					  (
						i -
						getModGenAmount(generator, 'overridingRootKey', sampleHeader.originalPitch) +
						tune + (sampleHeader.pitchCorrection / 100)
					  ) * scale
					),
					'modEnvToPitch': getModGenAmount(generator, 'modEnvToPitch') / 100,
					'scaleTuning': scale,
					'start':
					  getModGenAmount(generator, 'startAddrsCoarseOffset') * 32768 +
						getModGenAmount(generator, 'startAddrsOffset'),
					'end':
					  getModGenAmount(generator, 'endAddrsCoarseOffset') * 32768 +
						getModGenAmount(generator, 'endAddrsOffset'),
					'loopStart': (
					  //(sampleHeader.startLoop - sampleHeader.start) +
					  (sampleHeader.startLoop) +
						getModGenAmount(generator, 'startloopAddrsCoarseOffset') * 32768 +
						getModGenAmount(generator, 'startloopAddrsOffset')
					  ),
					'loopEnd': (
					  //(sampleHeader.endLoop - sampleHeader.start) +
					  (sampleHeader.endLoop) +
						getModGenAmount(generator, 'endloopAddrsCoarseOffset') * 32768 +
						getModGenAmount(generator, 'endloopAddrsOffset')
					  ),
					'volAttack': Math.pow(2, volAttack / 1200),
					'volDecay': Math.pow(2, volDecay / 1200),
					'volSustain': volSustain / 1000,
					'volRelease': Math.pow(2, volRelease / 1200),
					'modAttack': Math.pow(2, modAttack / 1200),
					'modDecay': Math.pow(2, modDecay / 1200),
					'modSustain': modSustain / 1000,
					'modRelease': Math.pow(2, modRelease / 1200),
					'initialFilterFc': getModGenAmount(generator, 'initialFilterFc', 13500),
					'modEnvToFilterFc': getModGenAmount(generator, 'modEnvToFilterFc'),
					'initialFilterQ': getModGenAmount(generator, 'initialFilterQ'),
					'freqVibLFO': freqVibLFO ? Math.pow(2, freqVibLFO / 1200) * 8.176 : undefined
				};
			}
		}
	},

	// Parses the Uin8Array to create this soundFont's banks.
	getBanks = function(uint8Array)
	{
		var sf2Parser = new WebMIDI.soundFontParser.SoundFontParser(uint8Array);

		function createBanks(parser)
		{
			var i, j, k,
			presets, parsersInstruments, instruments,
			presetName, patchIndex, bankIndex, instrument,
			banks = [], bank, instr;

			function createPreset(parser)
			{
				/** @type {Array.<Object>} */
				var i, j,
				preset = parser.presetHeader,
				/** @type {Array.<Object>} */
				zone = parser.presetZone,
				/** @type {Array.<Object>} */
				output = [],
				/** @type {number} */
				bagIndex,
				/** @type {number} */
				bagIndexEnd,
				/** @type {Array.<Object>} */
				zoneInfo,
				/** @type {number} */
				instrument,
				/** @type {{generator: Object, generatorInfo: Array.<Object>}} */
				presetGenerator,
				/** @type {{modulator: Object, modulatorInfo: Array.<Object>}} */
				presetModulator;

				// preset -> preset bag -> generator / modulator
				for(i = 0; i < preset.length; ++i)
				{
					bagIndex = preset[i].presetBagIndex;
					bagIndexEnd = preset[i + 1] ? preset[i + 1].presetBagIndex : zone.length;
					zoneInfo = [];

					// preset bag
					for(j = bagIndex; j < bagIndexEnd; ++j)
					{
						presetGenerator = createPresetGenerator_(parser, zone, j);
						presetModulator = createPresetModulator_(parser, zone, j);

						zoneInfo.push({
							generator: presetGenerator.generator,
							generatorSequence: presetGenerator.generatorInfo,
							modulator: presetModulator.modulator,
							modulatorSequence: presetModulator.modulatorInfo
						});

						//instrument =
						//	presetGenerator.generator['instrument'] !== void 0 ?
						//	presetGenerator.generator['instrument'].amount :
						//	presetModulator.modulator['instrument'] !== void 0 ?
						//	presetModulator.modulator['instrument'].amount :
						//	null;

						if(presetGenerator.generator.instrument !== undefined)
						{
							instrument = presetGenerator.generator.instrument.amount;
						}
						else if(presetModulator.modulator.instrument !== undefined)
						{
							instrument = presetGenerator.modulator.instrument.amount;
						}
						else
						{
							instrument = null;
						}
					}

					output.push({
						name: preset[i].presetName,
						info: zoneInfo,
						header: preset[i],
						instrument: instrument
					});
				}

				return output;
			}

			// ji: This is the original gree function, edited to comply with my programming style (old JSLint).
			// I don't know why it returns all the instrument zones as a single instrument.
			// It seems to work okay, but needs checking to see that nothing irregular is happening.
			// Maybe its because the parser is expecting to be given a full set of presets, and only geting a
			// selection.
			function createInstrument(parser)
			{
				var i, j,
				instrument = parser.instrument,
				zone = parser.instrumentZone,
				output = [],
				bagIndex,
				bagIndexEnd,
				zoneInfo,
				instrumentGenerator,
				instrumentModulator;

				// instrument -> instrument bag -> generator / modulator
				for(i = 0; i < instrument.length; ++i)
				{
					bagIndex = instrument[i].instrumentBagIndex;
					bagIndexEnd = instrument[i + 1] ? instrument[i + 1].instrumentBagIndex : zone.length;
					zoneInfo = [];

					// instrument bag
					for(j = bagIndex; j < bagIndexEnd; ++j)
					{
						instrumentGenerator = createInstrumentGenerator_(parser, zone, j);
						instrumentModulator = createInstrumentModulator_(parser, zone, j);

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
			}

			// ji function:
			// This function returns an array containing one array per preset. Each preset array contains
			// a list of instrumentZones, but without a terminating 'EOI' entry. I don't think the terminating
			// 'EOI' entry is important here, but I may be wrong.
			function getInstruments(parsersInstruments)
			{
				var i = 0, instrIndex = -1, instruments = [], zoneIndexStr, instrZone, zoneName;

				// zoneName has invisible 0 charCodes beyond the end of the visible string, so the usual
				// .length property does not work as expected. Is this unicode, or is the parser simply
				// setting the name wrongly?
				// This getZoneIndexString function takes account of the above problem, and returns a
				// normal string containing the numeric characters visible at the end of the zoneName
				// argument. The returned string can be empty if there are no visible numeric characters
				// at the end of zoneName. Numeric characters _inside_ zoneName are _not_ returned.
				function getZoneIndexString(zoneName)
				{
					var i, char, charCode, rval = "", lastNumCharIndex = -1, lastAlphaCharIndex = -1;

					// zoneName is an unusual string... (unicode?)
					// console.log("zoneName=", zoneName);
					for(i = zoneName.length - 1; i >= 0; --i)
					{
						charCode = zoneName.charCodeAt(i);
						// console.log("i=", i, " charCode=", charCode);
						// ignore trailing 0 charCodes
						if(charCode !== 0)
						{
							if(lastNumCharIndex === -1)
							{
								lastNumCharIndex = i;
							}
							if(!(charCode >= 48 && charCode <= 57)) // chars '0' to '9'
							{
								lastAlphaCharIndex = i;
								break;
							}
						}
					}

					if(lastAlphaCharIndex < lastNumCharIndex)
					{
						for(i = lastAlphaCharIndex + 1; i <= lastNumCharIndex; ++i)
						{
							char = (zoneName.charCodeAt(i) - 48).toString();
							// console.log("char=", char);
							rval = rval.concat(char);
							// console.log("rval=", rval);
						}
					}
					return rval;
				}

				for(i = 0; i < parsersInstruments.length; ++i)
				{
					instrZone = parsersInstruments[i];
					zoneName = instrZone.name.toString();

					if(i === parsersInstruments.length - 1)
					{
						break;
					}

					zoneIndexStr = getZoneIndexString(zoneName);
					// zoneIndexStr contains only the visible, trailing numeric characters, if any.
					if(zoneIndexStr.length === 0 || parseInt(zoneIndexStr, 10) === 0)
					{
						instrIndex++;
						instruments[instrIndex] = [];
					}
					instruments[instrIndex].push(instrZone);
				}

				return instruments;
			}

			presets = createPreset(parser);
			// ji: I'm unsure about this function. See comment on function.
			parsersInstruments = createInstrument(parser);
			// ji: I'm unsure about this function. See comment on function.  
			instruments = getInstruments(parsersInstruments);

			console.assert(instruments.length === requiredPresets.length, "Error: the expected number of presets does not match the number of presets in the sf2 file.");
			// the final entry in presets is 'EOP'
			console.assert(instruments.length === (presets.length - 1), "Error: wrong number of instruments in sf2 file.");

			for(i = 0; i < instruments.length; ++i)
			{
				presetName = presets[i].header.presetName;
				patchIndex = presets[i].header.preset;
				bankIndex = presets[i].header.bank;
				instrument = instruments[i];

				if(banks[bankIndex] === undefined)
				{
					banks[bankIndex] = [];
				}
				bank = banks[bankIndex];
				if(bank[patchIndex] === undefined)
				{
					bank[patchIndex] = [];
				}
				bank[patchIndex].name = presetName;
				for(j = 0; j < instrument.length; ++j)
				{
					instr = instrument[j];
					for(k = 0; k < instr.info.length; ++k)
					{
						createNoteInfo(parser, instr.info[k].generator, bank[patchIndex]);
					}
				}
			}

			return banks;
		}

		sf2Parser.parse();

		banks = createBanks(sf2Parser);
	},

	// The SoundFont is constructed asychronously (using XmlHttpRequest).
	// When ready, the callback function is invoked.
	// Note that XMLHttpRequest does not work with local files (localhost:).
	// To make it work, run the app from the web (http:).
	SoundFont = function(soundFontUrl, soundFontName, neededPresets, callback)
	{
		var xhr = new XMLHttpRequest();

		if(!(this instanceof SoundFont))
		{
			return new SoundFont(soundFontUrl, callback);
		}

		function onLoad()
		{
			var arrayBuffer, uint8Array;

			if(xhr.status === 200)
			{
				arrayBuffer = xhr.response;
				if(arrayBuffer)
				{
					uint8Array = new Uint8Array(arrayBuffer);
					getBanks(uint8Array);
					callback();
				}
			}
			else
			{
				alert("Error in XMLHttpRequest: status =" + xhr.status);
			}
		}

		name = soundFontName;

		requiredPresets = neededPresets;

		xhr.open('GET', soundFontUrl);
		xhr.addEventListener('load', onLoad, false);
		xhr.responseType = 'arraybuffer';
		xhr.send();
	},

	API =
	{
		SoundFont: SoundFont // constructor
	};
	// end var

	// Call this function immediately after the SoundFont has been constructed.
	SoundFont.prototype.getAttributes = function()
	{
		Object.defineProperty(this, "name", { value: name, writable: false });
		Object.defineProperty(this, "presets", { value: requiredPresets, writable: false });
		Object.defineProperty(this, "banks", { value: banks, writable: false });
	};

	return API;

}(window));
