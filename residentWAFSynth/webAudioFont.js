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
		PRESET_ENVTYPE = {}, // set in constructor, and exported as constant

		// Returns a banks array.
		// Each bank is an array of presets.
		// Each preset has a 'zones' attribute that is an array of 'zone'.
		// A 'zone' is an object that has attributes used to when processing a single sample.
		getBanks = function(allPresetsPerBank, presetNamesPerBank)
		{
			const maxDuration = 60000, // const seconds (1000 minutes should be long enough! -- see getEnvelopeData() exit conditions below)
				  defaultNoteOffReleaseDuration = 0.2;

			// envTypes:
			// 0: short envelope (e.g. drum, xylophone, percussion)
			// 1: long envelope (e.g. piano)
			// 2: unending envelope (e.g. wind instrument, organ)
			function presetEnvType(presetIndex, presetName)
			{
				const shortEnvs = [
					13,
					45, 47,
					55,
					112, 113, 114, 115, 116, 117, 118, 119,
					120, 123, 127
				],
					longEnvs = [
						0, 1, 2, 3, 4, 5, 6, 7,
						8, 9, 10, 11, 12, 14, 15,
						24, 25, 26, 27, 28, 29, 30, 31,
						46,
						32, 33, 34, 35, 36, 37, 38, 39,
						104, 105, 106, 107, 108, 109, 110, 111
					],
					unendingEnvs = [
						16, 17, 18, 19, 20, 21, 22, 23,
						40, 41, 42, 43, 44,
						48, 49, 50, 51, 52, 53, 54,
						56, 57, 58, 59, 60, 61, 62, 63,
						64, 65, 66, 67, 68, 69, 70, 71,
						72, 73, 74, 75, 76, 77, 78, 79,
						80, 81, 82, 83, 84, 85, 86, 87,
						88, 89, 90, 91, 92, 93, 94, 95,
						96, 97, 98, 99, 100, 101, 102, 103,
						121, 122, 124, 125, 126
					];

				if(presetName.includes("percussion"))
				{
					return WebMIDI.webAudioFont.PRESET_ENVTYPE.SHORT;
				}
				else if(shortEnvs.indexOf(presetIndex) >= 0)
				{
					return WebMIDI.webAudioFont.PRESET_ENVTYPE.SHORT;
				}
				else if(longEnvs.indexOf(presetIndex) >= 0)
				{
					return WebMIDI.webAudioFont.PRESET_ENVTYPE.LONG;
				}
				else if(unendingEnvs.indexOf(presetIndex) >= 0)
				{
					return WebMIDI.webAudioFont.PRESET_ENVTYPE.UNENDING;
				}
				else
				{
					throw "presetIndex not found.";
				}
			}

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
						console.warn("Corrected GeneralUserGS GrandPiano zones.");
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
						console.warn("Corrected GeneralUserGS MusicBox zones.");
					}
				}
				function resetHighFluidPadZone(zones, padNumber)
				{
					if(zones.length === 2 && zones[1].keyRangeLow === 0)
					{
						zones[1].keyRangeLow = zones[0].keyRangeHigh + 1;
						zones[1].keyRangeHigh = 127;
						console.warn("Corrected Fluid Pad " + padNumber + "(top zone).");
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
						console.warn("Corrected Fluid Pad 5 zones.");
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

			function setZonesToMaximumRange(presetName, presetIndex, zones)
			{
				let bottomZone = zones[0],
					topZone = zones[zones.length - 1],
					expanded = false;

				if(bottomZone.keyRangeLow !== 0)
				{
					bottomZone.keyRangeLow = 0;
					expanded = true;
				}
				if(topZone.keyRangeHigh !== 127)
				{
					topZone.keyRangeHigh = 127;
					expanded = true;
				}

				if(expanded)
				{
					let gmName = WebMIDI.constants.generalMIDIPresetName(presetIndex);
					console.warn("Pitch range of preset " + presetName +" (" + gmName +") has been extended.");
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

			function checkDurations(envData)
			{
				// The following restrictions apply because setTimeout(..) uses a millisecond delay parameter:
				// ((envData.envelopeDuration * 1000) <= Number.MAX_VALUE), and
				// ((envData.noteOffReleaseDuration * 1000) + 1000) < Number.MAX_VALUE) -- see noteOff().
				// These should in practice never be a problem, but just in case...
				if(!((envData.envelopeDuration * 1000) <= Number.MAX_VALUE)) // see noteOn() 
				{
					throw "illegal envelopeDuration";
				}

				if(!(((envData.noteOffReleaseDuration * 1000) + 1000) < Number.MAX_VALUE)) // see noteOff()
				{
					throw "illegal noteOffReleaseDuration";
				}
			}

			function setZonesSHORTEnvelopeData(zones)
			{
				// Sets attack, hold, decay and release durations for each zone.
				for(var i = 0; i < zones.length; i++)
				{
					let vEnvData = { attack: 0, hold: 0.5, decay: 4.5, release: defaultNoteOffReleaseDuration }; // Surikov envelope
					vEnvData.envelopeDuration = 5; // zoneVEnvData.attack + zoneVEnvData.hold + zoneVEnvData.decay;
					vEnvData.noteOffReleaseDuration = defaultNoteOffReleaseDuration; // zoneVEnvData.release;
					zones[i].vEnvData = vEnvData;
				}
				checkDurations(zones[0].vEnvData);
			}

			function setZonesLONGEnvelopeData(presetIndex, zones, presetName)
			{
				// Sets attack, hold, decay and release durations for each zone.
				// The duration values are set to increase logarithmically per pitchIndex
				// from the ..Low value at pitchIndex 0 to the ..High value at pitchIndex 127.
				// The values per zone are then related to the pitchIndex of zone.keyRangeLow,
				function setCustomLONGEnvData(zones, aLow, aHigh, hLow, hHigh, dLow, dHigh, rLow, rHigh)
				{
					let aFactor = (aHigh === 0 || aLow === 0) ? 1 : Math.pow(aHigh / aLow, 1 / 127),
						hFactor = (hHigh === 0 || hLow === 0) ? 1 : Math.pow(hHigh / hLow, 1 / 127),
						dFactor = (dHigh === 0 || dLow === 0) ? 1 : Math.pow(dHigh / dLow, 1 / 127),
						rFactor = (rHigh === 0 || rLow === 0) ? 1 : Math.pow(rHigh / rLow, 1 / 127);

					for(var i = 0; i < zones.length; i++)
					{
						let zone = zones[i],
							keyLow = zone.keyRangeLow,
							a = aLow * Math.pow(aFactor, keyLow),
							h = hLow * Math.pow(hFactor, keyLow),
							d = dLow * Math.pow(dFactor, keyLow),
							r = rLow * Math.pow(rFactor, keyLow);

						let vEnvData = { attack: a, hold: h, decay: d, release: r };
						vEnvData.envelopeDuration = a + h + d; // zoneVEnvData.attack + zoneVEnvData.hold + zoneVEnvData.decay;
						vEnvData.noteOffReleaseDuration = r; // zoneVEnvData.release;
						checkDurations(vEnvData);
						zone.vEnvData = vEnvData;
					}
				}

				// The following presetIndices have LONG envelopes:
				// 0, 1, 2, 3, 4, 5, 6, 7,
				// 8, 9, 10, 11, 12, 14, 15,
				// 24, 25, 26, 27, 28, 29, 30, 31,
				// 32, 33, 34, 35, 36, 37, 38, 39,
				// 46 (Harp)
				// 104, 105, 106, 107, 108, 109, 110, 111
				//
				// 02.2020: Except for Harpsichord, the following presetIndices
				// are all those used by the AssistantPerformer(GrandPiano + Study2)
				switch(presetIndex)
				{
					case 0: // Grand Piano						
						setCustomLONGEnvData(zones, 0, 0, 0, 0, 25, 5, 1, 0.5);
						break;
					case 6: // Harpsichord -- not used by AssistantPerformer 02.2020
						setCustomLONGEnvData(zones, 0, 0, 0, 0, 15, 1, 0.5, 0.1);
						break;
					case 8: // Celesta
						setCustomLONGEnvData(zones, 0, 0, 0, 0, 8, 4, 0.5, 0.1);
						break;
					case 9: // Glockenspiel
						setCustomLONGEnvData(zones, 0, 0, 0.002, 0.002, 6, 1.5, 0.4, 0.1);
						break;
					case 10: // MusicBox
						setCustomLONGEnvData(zones, 0, 0, 0, 0, 8, 0.5, 0.5, 0.1);
						break;
					case 11: // Vibraphone
						setCustomLONGEnvData(zones, 0, 0, 0.4, 0.4, 10, 3, 0.5, 0.1);
						break;
					case 12: // Marimba
						setCustomLONGEnvData(zones, 0, 0, 0, 0, 9.5, 0.6, 0.5, 0.1);
						break;
					//case 13: // Xylophone -- used by AssistantPerformer, but does not have a LONG envelope.
					//	break;
					case 14: // Tubular Bells
						setCustomLONGEnvData(zones, 0, 0, 0.5, 0.5, 20, 5, 0.5, 0.1);
						break;
					case 15: // Dulcimer
						setCustomLONGEnvData(zones, 0, 0, 0.5, 0.5, 10, 0.4, 0.4, 0.04);
						break;
					case 24: // NylonGuitar
						setCustomLONGEnvData(zones, 0, 0, 0.5, 0.5, 7, 0.3, 0.3, 0.05);
						break;
					case 25: // AcousticGuitar (steel)
						setCustomLONGEnvData(zones, 0, 0, 0.5, 0.5, 7, 0.3, 0.3, 0.05);
						break;
					case 26: // ElectricGuitar (Jazz)
						setCustomLONGEnvData(zones, 0, 0, 0.5, 0.5, 7, 0.3, 0.3, 0.05);
						break;
					case 27: // ElectricGuitar (clean)
						setCustomLONGEnvData(zones, 0, 0, 0.5, 0.5, 7, 0.3, 0.3, 0.05);
						break;
					case 46: // Harp
						setCustomLONGEnvData(zones, 0, 0, 0.5, 0.5, 10, 0.4, 0.4, 0.04);
						break;
					default:
						console.warn("Volume envelope data has not been defined for preset " + presetIndex.toString() + " (" + presetName + ").");
				}
			}

			function setZonesUNENDINGEnvelopeData(zones)
			{
				// Sets attack, hold, decay and release durations for each zone.
				for(var i = 0; i < zones.length; i++)
				{
					let vEnvData = { attack: 0, hold: maxDuration, decay: 0, release: defaultNoteOffReleaseDuration }; // Surikov envelope
					vEnvData.envelopeDuration = maxDuration; // zoneVEnvData.attack + zoneVEnvData.hold + zoneVEnvData.decay;
					vEnvData.noteOffReleaseDuration = defaultNoteOffReleaseDuration; // zoneVEnvData.release;
					zones[i].vEnvData = vEnvData;
				}
				checkDurations(zones[0].vEnvData);
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
						setZonesToMaximumRange(presetName, presetIndex, preset.zones);
					}

					preset.envType = presetEnvType(preset.zones[0].midi, presetName);

					// envTypes:
					// 0: short envelope (e.g. drum, xylophone, percussion)
					// 1: long envelope (e.g. piano)
					// 2: unending envelope (e.g. wind instrument, organ)
					switch(preset.envType)
					{
						case WebMIDI.webAudioFont.PRESET_ENVTYPE.SHORT:
							setZonesSHORTEnvelopeData(preset.zones);
							break;
						case WebMIDI.webAudioFont.PRESET_ENVTYPE.LONG:
							setZonesLONGEnvelopeData(presetIndex, preset.zones, presetName);
							break;
						case WebMIDI.webAudioFont.PRESET_ENVTYPE.UNENDING:
							setZonesUNENDINGEnvelopeData(preset.zones);
							break;
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

		// allPresetsPerBank need not have been completely adjusted (=unpacked) when this
		// consructor is called, since the binary .buffer attributes are not accessed.
		WebAudioFont = function(name, allPresetsPerBank, presetNamesPerBank)
		{
			if(!(this instanceof WebAudioFont))
			{
				return new WebAudioFont(name, allPresetsPerBank, presetNamesPerBank);
			}

			// PRESET_ENVTYPE
			Object.defineProperty(PRESET_ENVTYPE, "SHORT", { value: 0, writable: false });
			Object.defineProperty(PRESET_ENVTYPE, "LONG", { value: 1, writable: false });
			Object.defineProperty(PRESET_ENVTYPE, "UNENDING", { value: 2, writable: false });
			Object.defineProperty(this, "PRESET_ENVTYPE", { value: PRESET_ENVTYPE, writable: false });

			Object.defineProperty(this, "name", { value: name, writable: false });
			Object.defineProperty(this, "banks", { value: getBanks(allPresetsPerBank, presetNamesPerBank), writable: false });
			Object.defineProperty(this, "isReady", { value: isReady, writable: false });
		},

		API =
		{
			PRESET_ENVTYPE: PRESET_ENVTYPE,
			WebAudioFont: WebAudioFont // constructor
		};
		// end var

	return API;
}());
