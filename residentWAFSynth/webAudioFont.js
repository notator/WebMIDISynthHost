/* Copyright 2020 James Ingram
 * https://james-ingram-act-two.de/
 * This code has been developed from the code for my original ResidentSf2Synth:
 * https://github.com/notator/WebMIDISynthHost/residentSf2Synth/residentSf2Synth.js.
 * It uses both javascript preset files, cloned from
 * https://surikov.github.io/webaudiofontdata/sound/, and
 * other code that originated in the following repository:
 * https://github.com/surikov/webaudiofont
 * 
 * All the code in this project is covered by an MIT license.
 * https://github.com/surikov/webaudiofont/blob/master/LICENSE.md
 * https://github.com/notator/WebMIDISynthHost/blob/master/License.md
 */

/* 
 * WebMIDI.webAudioFont namespace containing a WebAudioFont constructor.
 */

/*global WebMIDI */

WebMIDI.namespace('WebMIDI.webAudioFont');

WebMIDI.webAudioFont = (function()
{
	"use strict";

	let
		// Returns a banks array.
		// Each bank is an array of presets.
		// Each preset has a 'zones' attribute that is an array of 'zone'.
		// A 'zone' is an object that has attributes used to when processing a single sample.
		getBanks = function(allPresetsPerBank, presetNamesPerBank)
		{
			// This function just corrrects errors in the WebAudioFont preset files.
			function correctWebAudioPresetErrors(presetIndex, zones)
			{
				function removeRedundantWebAudioFontGeneralUserGSGrandPianoZones(zones)
				{
					let zoneIndex = zones.findIndex(z => (z.keyRangeLow === 88 && z.keyRangeHigh === 90)),
						corrected = false;

					if(zoneIndex > -1)
					{
						zones.splice(zoneIndex, 1);
						corrected = true;
					}
					zoneIndex = zones.findIndex(z => (z.keyRangeLow === 61 && z.keyRangeHigh === 61));
					if(zoneIndex > -1)
					{
						zones.splice(zoneIndex, 1);
						corrected = true;
					}
					if(corrected)
					{
                        console.warn("WebAudioFont: corrected GeneralUserGS GrandPiano zones.");
					}
				}
				function removeRedundantWebAudioFontGeneralUserGSMusicBoxZones(zones)
				{
					let zoneIndex = zones.findIndex(z => (z.keyRangeLow === 0 && z.keyRangeHigh === 80)),
						corrected = false;

					if(zoneIndex > -1)
					{
						zones.splice(zoneIndex, 1);
						corrected = true;
					}
					zoneIndex = zones.findIndex(z => (z.keyRangeLow === 81 && z.keyRangeHigh === 113));
					if(zoneIndex > -1)
					{
						zones.splice(zoneIndex, 1);
						corrected = true;
					}
					if(corrected)
					{
                        console.warn("WebAudioFont: corrected GeneralUserGS MusicBox zones.");
					}
				}
				function resetHighFluidPadZone(zones, padNumber)
				{
					if(zones.length === 2 && zones[1].keyRangeLow === 0)
					{
						zones[1].keyRangeLow = zones[0].keyRangeHigh + 1;
						zones[1].keyRangeHigh = 127;
						console.warn("WebAudioFont: corrected Fluid Pad " + padNumber + " (top zone).");
					}
				}
				function correctFluidPad5Zones(zones)
				{
					// remove the middle zone, and make the others contiguous
					if(zones.length === 3 && zones[1].keyRangeLow === 0)
					{
						zones.splice(1, 1);
						zones[1].keyRangeLow = zones[0].keyRangeHigh + 1;
						zones[1].keyRangeHigh = 127;
                        console.warn("WebAudioFont: corrected Fluid Pad 5 zones.");
					}
				}

				switch(presetIndex)
				{
					case 0:
						removeRedundantWebAudioFontGeneralUserGSGrandPianoZones(zones);
						break;
					case 10:
						removeRedundantWebAudioFontGeneralUserGSMusicBoxZones(zones);
						break;
					case 89:
						resetHighFluidPadZone(zones, 2);
						break;
					case 92:
						correctFluidPad5Zones(zones);
						break;
					case 93:
						resetHighFluidPadZone(zones, 6);
						break;
				}
			}

			function checkZoneContiguity(presetName, presetIndex, zones)
			{
				for(var zoneIndex = 1; zoneIndex < zones.length; zoneIndex++)
				{
					if(zones[zoneIndex].keyRangeLow !== (zones[zoneIndex - 1].keyRangeHigh + 1))
					{
						throw presetName + " (presetIndex:" + presetIndex + "): zoneIndex " + zoneIndex + " is not contiguous!";
					}
				}
			}

			let banks = [];

			for(let bankIndex = 0; bankIndex < presetNamesPerBank.length; ++bankIndex)
			{
				let bank = [],
					presetNames = presetNamesPerBank[bankIndex],
					presetsPerBank = allPresetsPerBank[bankIndex];

				for(let i = 0; i < presetNames.length; ++i)
				{
					let presetName = presetNames[i],
						presetIndex,
						presetVariable = window[presetName];
					
					if(presetVariable !== undefined)
					{
						presetIndex = presetVariable.zones[0].midi; // Surikov's midi attribute
					}
					else // percussion preset
					{
						presetIndex = presetsPerBank[i].presetIndex;
					}

					let preset = presetsPerBank.find(obj => obj.presetIndex === presetIndex);

					if(preset === undefined)
					{
						throw "can't find preset";
					}

					correctWebAudioPresetErrors(presetIndex, preset.zones);

					if(!presetName.includes("percussion"))
					{
						checkZoneContiguity(presetName, presetIndex, preset.zones);
					}

					preset.bankIndex = bankIndex;

					bank.push(preset);
				}
				banks.push(bank);
			}

			return banks;
		},

		// Returns true if all the contained zones have a buffer attribute.
		// Otherwise false.
		isReady = function()
		{
			for(var bankIndex = 0; bankIndex < this.banks.length; bankIndex++)
			{
				let bank = this.banks[bankIndex];
				for(var presetIndex = 0; presetIndex < bank.length; presetIndex++)
				{
					let zones = bank[presetIndex].zones;
					for(var zoneIndex = 0; zoneIndex < zones.length; zoneIndex++)
					{
						if(zones[zoneIndex].buffer === undefined)
						{
							return false;
						}
					}
				}
			}

			return true;
		},

        // This constructor checks for (and if necesary corrects) errors in the WebAudioFont preset files,
        // and then returns a WebAudioFont containing presets whose format and attributes are the same as
        // those returned by Surikov's decodeAfterLoading() function (e.g. zone.ahdsr).
        // Enhancements are done later (in the ResidentWAFSynth code).
        WebAudioFont = function(name, allPresetsPerBank, presetNamesPerBank)
		{
			if(!(this instanceof WebAudioFont))
			{
				return new WebAudioFont(name, allPresetsPerBank, presetNamesPerBank);
			}

			Object.defineProperty(this, "name", { value: name, writable: false });
			Object.defineProperty(this, "banks", { value: getBanks(allPresetsPerBank, presetNamesPerBank), writable: false });
			Object.defineProperty(this, "isReady", { value: isReady, writable: false });
		},

		API =
		{
			WebAudioFont: WebAudioFont // constructor
		};
		// end var

	return API;
}());
