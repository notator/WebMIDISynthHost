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
*        SoundFont(soundFontUrl, soundFontName, presetIndices, onLoad)
*/

/*global WebMIDI */

WebMIDI.namespace('WebMIDI.soundFont');

WebMIDI.soundFont = (function()
{
	"use strict";
	var
	name, // ji for host
	presetInfo, // ji for host
	banks, // export to synth

	createBagModGen_ = function(indexStart, indexEnd, zoneModGen)
	{
	    var modgenInfo = [],
			modgen = {
			    unknown: [],
			    keyRange: {
			        hi: 127,
			        lo: 0
			    }
			},
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

	getPresetModulator_ = function(parser, zone, index)
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

	getPresetGenerator_ = function(parser, zone, index)
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

	// Parses the Uin8Array to create this soundFont's banks.
	getBanks = function(uint8Array, nRequiredPresets)
	{
		var banks, sf2Parser = new WebMIDI.soundFontParser.SoundFontParser(uint8Array);

		function createBanks(parser, nRequiredPresets)
		{
			var i, j, k,
			presets, instruments,
			presetName, patchIndex, bankIndex, instrument,
			banks = [], bank, instr;

		    // Gets the preset level info that the parser has found in the phdr, pbag, pMod and pGen chunks
            // This is similar to the getInstrumentBags function (inside the getInstruments function below, but at the preset level.
			function getPresets(parser)
			{
				var i, j,
				preset = parser.presetHeader,
				zone = parser.presetZone,
				output = [],
				bagIndex,
				bagIndexEnd,
				zoneInfo,
				instrument,
				presetGenerator,
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
						presetGenerator = getPresetGenerator_(parser, zone, j);
						presetModulator = getPresetModulator_(parser, zone, j);

						zoneInfo.push({
							generator: presetGenerator.generator,
							generatorSequence: presetGenerator.generatorInfo,
							modulator: presetModulator.modulator,
							modulatorSequence: presetModulator.modulatorInfo
						});

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

			// This function returns an array containing one array per preset. Each preset array contains
			// a list of instrumentZones. The end of the list is marked by an empty entry.
			function getInstruments(parser)
			{
			    var i = 0, parsersInstrumentBags,
                instrIndex = -1, instruments = [], instrBagIndexString, instrBag, instrBagName;

			    // ji: This is the original gree "creatInstrument()" function, edited to comply with my programming style.
			    //
			    // Useful Definitions:
			    // A Zone has a single sample, and is associated with a contiguous set of MIDI keys.
			    // An instrumentBag is a list of (single-channel) Zones.
			    // The Arachno Grand Piano, for example, has two instrumentBags, each of which contains
			    // the 20 Zones, for two (mono, left and right) channels.
			    // The returned records therefore contain *two* entries for each (stereo) preset zone.
			    // For example: "Grand Piano0        " (left channel) and "GrandPiano1         " (right channel)
			    // for the Grand Piano preset.
			    //
			    // This function returns the instrument level info that the parser has found in the inst, ibag,
			    // iMod and iGen chunks as a list of records (one record per mono Zone -- see definitions above:
			    // {
			    //    name; // instrumentBag name
			    //    info[];
			    // }
			    // where info is a sub-list of records of the form:
			    // {
			    //    generator[],
			    //    generatorSequence[],
			    //    modulator[],
			    //    modulatorSequence[]
			    // }
			    // The generator[] and generatorSequence[] contain the values of the Generator Enumerators
			    // (delayModEnv etc. -- see spec) associated with each Zone in the instrumentBag
			    // The generator entry contains the same information as the generatorSequence entry, except that
			    // the generatorSequence consists of {string, value} objects, while the generator entry has
			    // named subentries: i.e.: The value of generator.decayModEnv is the generatorSequence.value.amount
			    // of the generatorSequence whose generatorSequence.type === "decayModEnv".
			    // Are both generator[] and generatorSequence[] returned because the order of the sequence in
			    // generatorSequence is important, while the values in generator[] are more accessible??
			    // All this is done similarly for modulator and modulatorSequence.
			    function getInstrumentBags(parser)
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

			    // The parser leaves instrBagName with invisible 0 charCodes beyond the end of the visible string
			    // (instrBagName always has 20 chars in the soundFont file), so the usual .length property does
			    // not work as expected.
			    // This getBagIndexString function takes account of this problem, and returns a
			    // normal string containing the numeric characters visible at the end of the instrBagName.
			    // The returned string can be empty if there are no visible numeric characters
			    // at the end of instrBagName. Numeric characters _inside_ instrBagName are _not_ returned.
			    function getBagIndexString(instrBagName)
			    {
			        var i, char, charCode, rval = "", lastNumCharIndex = -1, lastAlphaCharIndex = -1;

			        // instrBagName is an unusual string... (unicode?)
			        // console.log("instrBagName=", instrBagName);
			        for(i = instrBagName.length - 1; i >= 0; --i)
			        {
			            charCode = instrBagName.charCodeAt(i);
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
			                char = (instrBagName.charCodeAt(i) - 48).toString();
			                // console.log("char=", char);
			                rval = rval.concat(char);
			                // console.log("rval=", rval);
			            }
			        }
			        return rval;
			    }

			    // See comment at top of the getInstrumentBags function.
			    parsersInstrumentBags = getInstrumentBags(parser);
			    // See comment at top of the getInstruments function

				for(i = 0; i < parsersInstrumentBags.length; ++i)
				{
					instrBag = parsersInstrumentBags[i];
					instrBagName = instrBag.name.toString();

					if(i === parsersInstrumentBags.length - 1)
					{
						break;
					}

					instrBagIndexString = getBagIndexString(instrBagName);
					// instrBagIndexString contains only the visible, trailing numeric characters, if any.
					if(instrBagIndexString.length === 0 || parseInt(instrBagIndexString, 10) === 0)
					{
						instrIndex++;
						instruments[instrIndex] = [];
					}
					instruments[instrIndex].push(instrBag);
				}

				return instruments;
			}

		    // Creates a keyLayer for each key in the generator's keyRange, and adds it to the key's keyLayers array in the preset.
		    // Each key's keyLayers array is at preset[keyIndex], and contains an array of keyLayer objects.
		    // Each keyLayer has attributes that are either raw integer amounts retrieved from the soundFont or default values.
			// The attribute names are the official names of the generators in the sf2spec (see §8.1.2 and §8.1.3).
		    function getPresetAmounts(generatorTable, generator, preset)
		    {
		        // The terms presetZone, layer and keyLayer:
		        // The sfspec says that a "presetZone" is "A subset of a preset containing generators, modulators, and an instrument."
		        // The sfspec also says that "layer" is an obsolete term for a "presetZone".
		        // The Awave soundfont editor says that a "layer" is "a set of regions with non-overlapping key ranges".
		        // The Arachno soundFont contains two "presetZones" in the Grand Piano preset. The first has a pan
		        // setting of -500, the second a pan setting of +500.
		        // I therefore assume that a "presetZone" is a preset-level "channel", that is sent at the same time
		        // as other "presetZones" in the same preset, so as to create a fuller sound.
		        // I use the term "keyLayer" to mean the subsection of a presetZone associated with a single key.
		        // A keyLayer contains a single audio sample and the parameters (generators) for playing it.
		        // There will always be a single MIDI output channel, whose pan position is realised by combining the
		        // channel's current pan value with the pan values of the key's (note's) "keyLayers".
		        // The sfspec allows an unlimited number of "presetZones" in the pbag chunk, so the number of "keyLayers"
		        // is also unlimted.

		        let keyIndex = 0, keyLayer, keyLayers;

		        function getKeyLayer(generatorTable, generator)
		        {
		            let genIndex = 0, nGens = generatorTable.length, gen, amount, keyLayer = {};

		            for(genIndex = 0; genIndex < nGens; ++genIndex)
		            {
                        // unused or reserved generators
		                if(genIndex === 14 || genIndex === 18 || genIndex === 19 || genIndex === 20 || genIndex === 42 || genIndex === 49 || genIndex === 55)
		                {
		                    continue;
		                }
		                gen = generatorTable[genIndex];
		                if(generator[gen.name] === undefined)
		                {
		                    amount = gen.default;
		                }
		                else
		                {
		                    amount = (generator[gen.name].amount) ? generator[gen.name].amount : gen.default;
		                }		                    
		                keyLayer[gen.name] = amount;
		            }
		            return keyLayer;
		        }

		        if(generator.keyRange === undefined || generator.sampleID === undefined)
		        {
		            throw "invalid soundFont";
		        }

		        for(keyIndex = generator.keyRange.lo; keyIndex <= generator.keyRange.hi; ++keyIndex)
		        {
		            keyLayers = preset[keyIndex];
		            if(keyLayers === undefined)
		            {
		                keyLayers = [];
		                preset[keyIndex] = keyLayers;
		            }

		            keyLayer = getKeyLayer(generatorTable, generator);
		            keyLayers.push(keyLayer);
		        }
		    }

		    // This function replaces the (usually integer) amounts that have been retrieved from the soundFont
		    // by (possibly floating-point) values that are more convenient/efficient to use at runtime.
		    // Some of the new values are the result of combining more than one of the original amounts.
		    // The newly created attributes are given names that reflect their use, and include their
		    // unit of measurement (if any) e.g. volDelayDuration_sec, modLfoFreq_Hz, chorusEffectsSend_factor etc.
		    function setPresetRuntimeValues(parser, preset)
		    {
		        let keyIndex, keyLayers, layerIndex, nLayers, keyLayer, runtimeValues;

		        // The attributes required at runtime are calculated from the amounts that have been
		        // parsed into the keyLayer from the soundFont.
		        function getKeyLayerRuntimeValues(parser, keyIndex, keyLayer)
		        {
		            let rt = {}, // attributes that will be used at runtime
                        kl = keyLayer,
                        sampleHeader = parser.sampleHeader[kl.sampleID],
                        tune = kl.coarseTune + kl.fineTune / 100, // semitones              
                        rootKey = (kl.overridingRootKey === -1) ? sampleHeader.originalPitch : kl.overridingRootKey,
                        scaleTuning = kl.scaleTuning / 100; // original is in in range [0..100]

		            function centsToHz(amount)
		            {
		                return Math.pow(2, (amount - 6900) / 1200) * 440;
		            }

		            function tcentsToSec(amount)
		            {
		                return (amount === 0) ? 0 : Math.pow(2, amount / 1200);
		            }

		            function hundredthsToFloat(amount)
		            {
		                return amount / 100;
		            }

		            function thousandthsToFloat(amount)
		            {
		                return amount / 1000;
		            }

		            // ji Sept 2017: This formula needs verifying.
		            // It does, however, satisfy the descriptions of the keynumTo... amounts in the spec.
		            // Simply multiply the corresponding duration by this factor to get the final value.
		            // The argument is keynumToVolEnvHold, keynumToVolEnvDecay, keynumToModEnvHold, keynumToModEnvDecay
		            // The argument's default amount in the soundFont file is 0, which retuns a default factor 1 here.
		            function tcentsPerKeyToFactor(amount, keyIndex)
		            {
		                return Math.pow(2, ((60 - keyIndex) * amount) / 1200);
		            }

		            rt.velocityMax = kl.velRange.hi;
		            rt.velocityMin = kl.velRange.lo;

		            rt.sample = parser.sample[kl.sampleID];
		            rt.sampleRate = sampleHeader.sampleRate;
		            rt.basePlaybackRate = Math.pow(Math.pow(2, 1 / 12), (keyIndex - rootKey + tune + (sampleHeader.pitchCorrection / 100)) * scaleTuning);
		            rt.modEnvToPitch_scaled = kl.modEnvToPitch * scaleTuning;
		            rt.scaleTuning_factor = scaleTuning;

		            // set vol values
		            rt.initialAttenuation_factor = 1 - hundredthsToFloat(kl.initialAttenuation);
		            rt.volDelayDuration_sec = tcentsToSec(kl.delayVolEnv);
		            rt.volAttackDuration_sec = tcentsToSec(kl.attackVolEnv);
		            rt.volHoldDuration_sec = tcentsToSec(kl.holdVolEnv) * tcentsPerKeyToFactor(kl.keynumToVolEnvHold, keyIndex);
		            // The spec says about sustainVolEnv: "conventionally 1000 indicates full attenuation", but I think that must be wrong...
                    // Compare with the spec's description of sustainModEnv.
		            rt.volSustainLevel_factor = 1 - thousandthsToFloat(kl.sustainVolEnv);
		            rt.volSustainLevel_factor = (rt.volSustainLevel_factor < 0) ? 0 : rt.volSustainLevel_factor;
		            rt.volSustainLevel_factor = (rt.volSustainLevel_factor > 1) ? 1 : rt.volSustainLevel_factor;
		            rt.volDecayDuration_sec = tcentsToSec(kl.decayVolEnv) * thousandthsToFloat(kl.sustainVolEnv) * tcentsPerKeyToFactor(kl.keynumToVolEnvDecay, keyIndex); // see spec!
		            rt.volReleaseDuration_sec = tcentsToSec(kl.releaseVolEnv);
		            // end

		            // set mod values
		            rt.modDelayDuration_sec = tcentsToSec(kl.delayModEnv);
		            rt.modAttackDuration_sec = tcentsToSec(kl.attackModEnv);
		            rt.modHoldDuration_sec = tcentsToSec(kl.holdModEnv) * tcentsPerKeyToFactor(kl.keynumToModEnvHold, keyIndex);
		            rt.modSustainLevel_factor = 1 - thousandthsToFloat(kl.sustainModEnv);
		            rt.modSustainLevel_factor = (rt.modSustainLevel_factor < 0) ? 0 : rt.modSustainLevel_factor;
		            rt.modSustainLevel_factor = (rt.modSustainLevel_factor > 1) ? 1 : rt.modSustainLevel_factor;
		            rt.modDecayDuration_sec = tcentsToSec(kl.decayModEnv) * thousandthsToFloat(kl.sustainModEnv) * tcentsPerKeyToFactor(kl.keynumToModEnvDecay, keyIndex); // see spec!
		            rt.modReleaseDuration_sec = tcentsToSec(kl.releaseModEnv);
		            // end

		            // set LFO values
		            rt.modLfoDelayDuration_sec = tcentsToSec(kl.delayModLFO);
		            rt.modLfoFreq_Hz = centsToHz(kl.freqModLFO);
		            rt.modLfoToPitch_semitones = hundredthsToFloat(kl.modLfoToPitch);
		            rt.modLfoToFilterFc_factor = hundredthsToFloat(kl.modLfoToFilterFc); // currently unused in soundFontSynthNote.js
		            rt.modLfoToVolume_factor = hundredthsToFloat(kl.modLfoToVolume); // currently unused in soundFontSynthNote.js
		            rt.vibLfoDelayDuration_sec = tcentsToSec(kl.delayVibLFO);
		            rt.vibLfoFreq_Hz = centsToHz(kl.freqVibLFO);
		            rt.vibLfoToPitch_semitones = hundredthsToFloat(kl.vibLfoToPitch);
                    // end

		            // set filter values
		            rt.initialFilterQ_dB = hundredthsToFloat(kl.initialFilterQ); // ??
		            rt.filterBaseFreq_Hz = centsToHz(kl.initialFilterFc);
		            rt.filterPeakFreq_Hz = centsToHz(kl.initialFilterFc + kl.modEnvToFilterFc);
		            rt.filterSustainFreq_Hz = rt.filterBaseFreq_Hz + ((rt.filterPeakFreq_Hz - rt.filterBaseFreq_Hz) * rt.modSustainLevel_factor);
		            // end

		            rt.chorusEffectsSend_factor = thousandthsToFloat(kl.chorusEffectsSend);
		            rt.reverbEffectsSend_factor = thousandthsToFloat(kl.reverbEffectsSend);
		            rt.pan_pos = thousandthsToFloat(kl.pan); // pan_pos is a number in range [-0.5..+0.5] corresponding to the left-right pan position.

                    // set buffer values
		            rt.bufferStartTime_sec = ((kl.startAddrsCoarseOffset * 32768) + kl.startAddrsOffset) / rt.sampleRate;
		            rt.loopFlags = kl.sampleModes & 3;
		            if(rt.loopFlags === 1 || rt.loopFlags === 3)
		            {
		                rt.loopStart_sec = (sampleHeader.startLoop + (kl.startloopAddrsCoarseOffset * 32768) + kl.startloopAddrsOffset) / rt.sampleRate;
		                rt.loopEnd_sec = (sampleHeader.endLoop + (kl.endloopAddrsCoarseOffset * 32768) + kl.endloopAddrsOffset) / rt.sampleRate;
		            }
		            rt.endAddressOffset = (kl.endAddrsCoarseOffset * 32768) + kl.endAddrsOffset;
		            // end

                    // miscellaneous values
		            rt.exclusiveClass_ID = kl.exclusiveClass;
		            // end

		            return rt;
		        }

		        for(keyIndex = 0; keyIndex < preset.length; ++keyIndex)
		        {
		            keyLayers = preset[keyIndex];
		            if(keyLayers === undefined)
		            {
		                continue;
		            }
		            nLayers = keyLayers.length;
		            for(layerIndex = 0; layerIndex < nLayers; ++layerIndex)
		            {
		                keyLayer = keyLayers[layerIndex];

		                runtimeValues = getKeyLayerRuntimeValues(parser, keyIndex, keyLayer);

		                keyLayers[layerIndex] = runtimeValues; // forget the original soundFont amounts
                    }
		        }
		    }

		    // Get the preset level info that the parser has found in the phdr, pbag, pMod and pGen chunks
			presets = getPresets(parser);

		    // Get the instrument level info that the parser has found in the inst, ibag, iMod and iGen chunks
            // Each instrument now contains an array containing its instrumenBags (stereo).
			instruments = getInstruments(parser);

			// the final entry in presets is 'EOP'
			if(nRequiredPresets !== (presets.length - 1))
			{
				throw "Error: the expected number of presets does not match the number of presets in the sf2 file.";
			}

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
					    getPresetAmounts(parser.GeneratorEnumeratorTable, instr.info[k].generator, bank[patchIndex]);
					}
				}
				setPresetRuntimeValues(parser, bank[patchIndex]);
			}

			return banks;
		}

		sf2Parser.parse();

		banks = createBanks(sf2Parser, nRequiredPresets);

		return banks;
	},

	// The SoundFont is constructed asychronously (using XmlHttpRequest).
	// When ready, the callback function is invoked.
	// Note that XMLHttpRequest does not work with local files (localhost:).
	// To make it work, run the app from the web (http:).
	SoundFont = function(soundFontUrl, soundFontName, presetIndices, callback)
	{
		var xhr = new XMLHttpRequest();

		if(!(this instanceof SoundFont))
		{
			return new SoundFont(soundFontUrl, soundFontName, presetIndices, callback);
		}

		function getPresetInfo(presetIndices)
		{
			var i, name, presetIndex, soundFontPresets = [];
			for(i = 0; i < presetIndices.length; ++i)
			{
				presetIndex = presetIndices[i];
				name = WebMIDI.constants.generalMIDIPatchName(presetIndex);
				soundFontPresets.push({ name: name, presetIndex: presetIndex });
			}
			return soundFontPresets;
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
					banks = getBanks(uint8Array, presetInfo.length);
					callback();
				}
			}
			else
			{
				alert("Error in XMLHttpRequest: status =" + xhr.status);
			}
		}

		name = soundFontName;
		presetInfo = getPresetInfo(presetIndices);

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
	SoundFont.prototype.init = function()
	{
		Object.defineProperty(this, "name", { value: name, writable: false });
		Object.defineProperty(this, "presets", { value: presetInfo, writable: false });
		Object.defineProperty(this, "banks", { value: banks, writable: false });
	};

	return API;

}());
