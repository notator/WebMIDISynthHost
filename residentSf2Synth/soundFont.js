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

    createKeyInfo = function(parser, generator, preset)
    {
    	var
        sampleId,
        sampleHeader,
        loopMode,
        panAmount,
        tune,
        scale,
        freqVibLFO,
        keyIndex,
        keyLayers;

    	function getModGenAmount(generator, enumeratorType, defaultValue)
    	{
    	    if(defaultValue === undefined)
    	    {
    	        throw "The default value must be defined.";
    	    }

    	    return generator[enumeratorType] ? generator[enumeratorType].amount : defaultValue;
    	}

    	function volModParamValue(generator, enumeratorType, defaultValue)
    	{
    	    let rVal = getModGenAmount(generator, enumeratorType, defaultValue);
            
    	    rVal = (rVal === 0) ? 0 : Math.pow(2, rVal / 1200);

    	    return rVal;
    	}

    	function range0to1(generator, enumeratorType, defaultValue)
    	{
    	    let rVal = getModGenAmount(generator, enumeratorType, defaultValue);

    	    return (rVal > 1000 ? 1 : (rVal <= 0 ? 0 : rVal / 1000));
    	}

    	if(generator.keyRange === undefined || generator.sampleID === undefined)
    	{
    	    return;
    	}

    	// See sf2 spec §8.1.3 for the default values set in this function.
    	loopMode = getModGenAmount(generator, 'sampleModes', 0);
        panAmount = getModGenAmount(generator, 'pan', 0),
    	tune = (
            getModGenAmount(generator, 'coarseTune', 0) +
            getModGenAmount(generator, 'fineTune', 0) / 100
        );
    	scale = getModGenAmount(generator, 'scaleTuning', 100) / 100;
    	freqVibLFO = getModGenAmount(generator, 'freqVibLFO', 0);

    	for(keyIndex = generator.keyRange.lo; keyIndex <= generator.keyRange.hi; ++keyIndex)
    	{
    	    // ji - August 2017
    	    // The terms presetZone, layer and keylayer:
    	    // The sfspec says that a "presetZone" is "A subset of a preset containing generators, modulators, and an instrument."
    	    // The sfspec also says that "layer" is an obsolete term for a "presetZone".
    	    // The Awave soundfont editor says that a "layer" is "a set of regions with non-overlapping key ranges".
    	    // The Arachno soundFont contains two "presetZones" in the Grand Piano preset. The first has a pan
    	    // setting of -500, the second a pan setting of +500.
    	    // I am therefore assuming that a "presetZone" is a preset-level "channel", that is sent at the same time
            // as other "presetZones" in the same preset, so as to create a fuller sound.
    	    // I use the term "keyLayer" to mean the subsection of a presetZone associated with a single key.
    	    // A keyLayer contains a single audio sample and the parameters (generators) for playing it.
    	    // There will always be a single MIDI output channel, whose pan position is realised by combining the
    	    // channel's current pan value with the pan values of the key's (note's) "keyLayers".
    	    // The sfspec allows an unlimited number of "presetZones" in the pbag chunk, so the number of "keyLayers"
            // is also unlimted.
    	    keyLayers = preset[keyIndex];
    	    if(keyLayers === undefined)
    	    {
    	        keyLayers = [];
    	        preset[keyIndex] = keyLayers;
    	    }

    	    // the first channel for this key is always at keyLayers[0], i.e. preset[keyIndex][0].
    	    sampleId = getModGenAmount(generator, 'sampleID', 0);
    	    sampleHeader = parser.sampleHeader[sampleId];

    	    keyLayers.push({
    	        'sample': parser.sample[sampleId],
    	        'sampleRate': sampleHeader.sampleRate,
    	        'basePlaybackRate': Math.pow(
                    Math.pow(2, 1 / 12),
                    (
                    keyIndex -
                    getModGenAmount(generator, 'overridingRootKey', sampleHeader.originalPitch) +
                    tune + (sampleHeader.pitchCorrection / 100)
                    ) * scale
                ),
    	        'modEnvToPitch': volModParamValue(generator, 'modEnvToPitch', -12000) / 100,
    	        'scaleTuning': scale,
    	        'start':
                    getModGenAmount(generator, 'startAddrsCoarseOffset', 0) * 32768 +
                    getModGenAmount(generator, 'startAddrsOffset', 0),
    	        'end':
                    getModGenAmount(generator, 'endAddrsCoarseOffset', 0) * 32768 +
                    getModGenAmount(generator, 'endAddrsOffset', 0),
    	        'doLoop': (loopMode === 1 || loopMode === 3), // ji
    	        'loopStart': (
                    //(sampleHeader.startLoop - sampleHeader.start) +
                    (sampleHeader.startLoop) +
                    getModGenAmount(generator, 'startloopAddrsCoarseOffset', 0) * 32768 +
                    getModGenAmount(generator, 'startloopAddrsOffset', 0)
                    ),
    	        'loopEnd': (
                    //(sampleHeader.endLoop - sampleHeader.start) +
                    (sampleHeader.endLoop) +
                    getModGenAmount(generator, 'endloopAddrsCoarseOffset', 0) * 32768 +
                    getModGenAmount(generator, 'endloopAddrsOffset', 0)
                    ),

    	        'volDelay': volModParamValue(generator, 'delayVolEnv', -12000),
    	        'volAttack': volModParamValue(generator, 'attackVolEnv', -12000),
    	        'volHold': volModParamValue(generator, 'holdVolEnv', -12000),
    	        'volDecay': volModParamValue(generator, 'decayVolEnv', -12000),
    	        'volSustain': range0to1(generator, 'sustainVolEnv', 0), // see spec
    	        'volRelease': volModParamValue(generator, 'releaseVolEnv', -12000),

    	        'modDelay': volModParamValue(generator, 'delayModEnv', -12000),
    	        'modAttack': volModParamValue(generator, 'attackModEnv', -12000),
    	        'modHold': volModParamValue(generator, 'holdModEnv', -12000),
    	        'modDecay': volModParamValue(generator, 'decayModEnv', -12000),
    	        'modSustain': range0to1(generator, 'sustainModEnv', 0), // see spec
    	        'modRelease': volModParamValue(generator, 'releaseModEnv', -12000),

    	        'initialFilterFc': getModGenAmount(generator, 'initialFilterFc', 13500),
    	        'modEnvToFilterFc': getModGenAmount(generator, 'modEnvToFilterFc', 0) / 100,
    	        'initialFilterQ': getModGenAmount(generator, 'initialFilterQ', 0) / 100,
    	        'freqVibLFO': freqVibLFO ? Math.pow(2, freqVibLFO / 1200) * 8.176 : undefined,

    	        // the following were not set by gree
    	        'modLfoToPitch': volModParamValue(generator, 'modLfoToPitch', -12000) / 100,
    	        'vibLfoToPitch': volModParamValue(generator, 'vibLfoToPitch', -12000) / 100,
    	        'modLfoToFilterFc': getModGenAmount(generator, 'modLfoToFilterFc', 0) / 100,
    	        'modLfoToVolume': getModGenAmount(generator, 'modLfoToVolume', 0) / 100,   	        
    	        'chorusEffectsSend': range0to1(generator, 'chorusEffectsSend', 0) / 100,
    	        'reverbEffectsSend': range0to1(generator, 'reverbEffectsSend', 0) / 100,
    	        'pan' : (panAmount + 500) / 1000,
    	        'delayModLFO': volModParamValue(generator, 'delayModLFO', -12000), // in Arachno Grand Piano
    	        'freqModLFO': getModGenAmount(generator, 'freqModLFO', 0),
    	        'delayVibLFO': volModParamValue(generator, 'delayVibLFO', -12000), // in Arachno Grand Piano
    	        'keynumToModEnvHold': getModGenAmount(generator, 'keynumToModEnvHold', 0),
    	        'keynumToModEnvDecay': getModGenAmount(generator, 'keynumToModEnvDecay', 0),
    	        'keynumToVolEnvHold': getModGenAmount(generator, 'keynumToVolEnvHold', 0),
    	        'keynumToVolEnvDecay': getModGenAmount(generator, 'keynumToVolEnvDecay', 0),
    	        'velRange': generator['velRange'], // undefined, or an object like generator.keyRange having lo and hi values
    	        'keynum': getModGenAmount(generator, 'keynum', -1),
    	        'velocity': getModGenAmount(generator, 'velocity', -1),
    	        'initialAttenuation': getModGenAmount(generator, 'initialAttenuation', 0),
    	        'exclusiveClass': getModGenAmount(generator, 'exclusiveClass', 0)
    	    }); // end push
    	}
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

			// ji function:
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
						createKeyInfo(parser, instr.info[k].generator, bank[patchIndex]);
					}
				}
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
