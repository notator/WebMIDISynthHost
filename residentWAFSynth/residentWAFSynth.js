/* Copyright 2020 James Ingram, Sergey Surikov
 * https://james-ingram-act-two.de/
 * https://github.com/surikov
 *  
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

/* WebMIDI.residentWAFSynth namespace containing a ResidentWAFSynth constructor.
 * 
 * The original object of creating this code was to be able to discuss and improve the interface.
 * See the discussion at https://github.com/WebAudio/web-midi-api/issues/124
 */

WebMIDI.namespace('residentWAFSynth');

WebMIDI.residentWAFSynth = (function(window)
{
    "use strict";
    let
        banks, // set in synth.setSoundFont
        channelAudioNodes = [], // initialized in synth.open
        channelControls = [], // initialized in synth.open

		// Called by the constructor, which sets this.webAudioFonts to the return value of this function.
		// Creates all the WebAudioFonts defined in "residentWAFSynth/webAudioFontDefs/webAudioFontDefs.js",
		// adjusting (=decoding) all the required WebAudioFontPresets.
		getWebAudioFonts = function(audioContext)
		{
			function adjustAllPresetVariables()
			{
				// Adapted from code in Sergey Surikov's WebAudioFontLoader
				function decodeAfterLoading(audioContext, variableName)
				{
					// ji: This function just waits until window[variableName] exists,
					// i.e. until the variable has loaded.
					function waitUntilLoaded(variableName, onLoaded)
					{
						if(window[variableName])
						{
							onLoaded();
						}
						else
						{
							setTimeout(function()
							{
								waitUntilLoaded(variableName, onLoaded);
							}, 111);
						}
					}
					
					// The presetName parameter has only been added for use in console.log when the preset adjustment is complete.
					function adjustPreset(audioContext, preset, presetName)
					{
						// 13.01.2020, ji: Added presetName and isLastZone arguments for console.log code
						function adjustZone(audioContext, zone, presetName, isLastZone)
						{
							function numValue(aValue, defValue)
							{
								if(typeof aValue === "number")
								{
									return aValue;
								} else
								{
									return defValue;
								}
							}

							// 13.01.2020 -- ji
							// The original preset files used by the ResidentWAFSynth all have a zone.file attribute
							// but neither zone.buffer nor zone.sample attributes. I have therefore deleted the
							// original (Surikov) code for coping with those cases.
							// (This code creates and sets the zone.buffer attribute.)
							if(zone.file)
							{
								// 27.02.2020 -- ji
								// Added this nested condition since this code can now be revisited afer creating zone.buffer.
								if(zone.buffer === undefined)
								{
									// this code sets zone.buffer
									var datalen = zone.file.length;
									var arraybuffer = new ArrayBuffer(datalen);
									var view = new Uint8Array(arraybuffer);
									var decoded = atob(zone.file);
									var b;
									for(let i = 0; i < decoded.length; i++)
									{
										b = decoded.charCodeAt(i);
										view[i] = b;
									}
									// 12.01.2020, ji: Changed to Promise syntax.
									audioContext.decodeAudioData(arraybuffer).then(function(audioBuffer)
									{
										zone.buffer = audioBuffer;
										// 13.01.2020, ji: Added console.log code 
										if(isLastZone === true)
										{
											console.log("adjusted " + presetName);
										}
									});
								}
							}
							else // 13.01.2020 -- ji
							{
								throw "zone.file not found.";
							}
							// The value of zone.delay never changes in Surikov's code (as far as I can see).
							// It is the duration between calling bufferNode.start(...) and the time at which the attack phase begins.
							// For simplicity, it could be deleted.
							zone.delay = 0;
							zone.loopStart = numValue(zone.loopStart, 0);
							zone.loopEnd = numValue(zone.loopEnd, 0);
							zone.coarseTune = numValue(zone.coarseTune, 0);
							zone.fineTune = numValue(zone.fineTune, 0);
							zone.originalPitch = numValue(zone.originalPitch, 6000);
							zone.sampleRate = numValue(zone.sampleRate, 44100);
							// The zone.sustain attribute is defined but never used by Surikov (as far as I can see).
							// zone.sustain = numValue(zone.originalPitch, 0);
						}

						for(let zoneIndex = 0; zoneIndex < preset.zones.length; zoneIndex++)
						{
							let isLastZone = (zoneIndex === (preset.zones.length - 1));
							adjustZone(audioContext, preset.zones[zoneIndex], presetName, isLastZone);
						}
					}

					waitUntilLoaded(variableName, function()
					{
						adjustPreset(audioContext, window[variableName], variableName);
					});
				}

				let webAudioFontDefs = WebMIDI.webAudioFontDefs;
				for(let i = 0; i < webAudioFontDefs.length; i++)
				{
					let presetNamesPerBank = webAudioFontDefs[i].presetNamesPerBank;
					for(let bankIndex = 0; bankIndex < presetNamesPerBank.length; bankIndex++)
					{
						let presetNames = presetNamesPerBank[bankIndex];
						for(var nameIndex = 0; nameIndex < presetNames.length; nameIndex++)
						{
							let variable = presetNames[nameIndex];
							if(variable.includes("_tone_")) // "percussion" presets are decoded belowe.
							{
								decodeAfterLoading(audioContext, variable);
							}
						}
					}
				}

				if(WebMIDI.percussionPresets !== undefined)
				{
					let percussionPresets = WebMIDI.percussionPresets;
					for(let i = 0; i < percussionPresets.length; i++)
					{
						let presetKeys = percussionPresets[i].keys;
						for(let j = 0; j < presetKeys.length; j++)
						{
							let variable = presetKeys[j];
							decodeAfterLoading(audioContext, variable);
						}
					}
				}
			}

			// sets window[<percussionFontName>].zones
			//      each zone.midi to presetIndex
			function getPercussionPresets()
			{
				if(WebMIDI.percussionPresets === undefined)
				{
					return undefined;
				}
				else
				{
					let percussionPresets = [];

					for(var i = 0; i < WebMIDI.percussionPresets.length; i++)
					{
						let zones = [];
						let presetDef = WebMIDI.percussionPresets[i];
						for(var j = 0; j < presetDef.keys.length; j++)
						{
							let keyVariable = presetDef.keys[j],
								keyZone = window[keyVariable].zones[0];

							keyZone.midi = presetDef.presetIndex;
							zones.push(keyZone);
						}
						percussionPresets.push({ name: presetDef.name, zones: zones });
					}
					return percussionPresets;
				}
			}

			function finalizeAllPresetsPerWAFBank(webAudioFontDef, percussionPresets)
			{
				// returns a string of the form "000:000 - " + standardGMPresetName + " (" + soundFontSourceName + ")"
				// where the "000" groups are the bank and preset indices.
				function getPresetOptionName(presetName, bankIndex, presetIndex, isPercussion)
				{
					function getIndex(str, substr, ind)
					{
						let len = str.length, i = -1;
						while(ind-- && i++ < len)
						{
							i = str.indexOf(substr, i);
							if(i < 0) break;
						}
						return i;
					}

					// returns a three character string representing the index
					function getIndexString(index)
					{
						let iString = index.toString();
						while(iString.length < 3)
						{
							iString = "0" + iString;
						}
						return iString;
					}

					let presetOptionName = "error: illegal presetVariable",
						bankString = getIndexString(bankIndex),
						presetString = getIndexString(presetIndex);

					if(isPercussion === true)
					{
						presetOptionName = bankString + ":" + presetString + " - " + presetName;
					}
					else
					{
						let truncStart = getIndex(presetName, "_", 3) + 1,
							truncEnd = getIndex(presetName, "_", 4);

						if(truncStart > 0 && truncEnd > 0 && truncEnd > truncStart)
						{
							let soundFontSourceName = presetName.slice(truncStart, truncEnd),
								gmName = WebMIDI.constants.generalMIDIPresetName(presetIndex);

							presetOptionName = bankString + ":" + presetString + " - " + gmName + " (" + soundFontSourceName + ")";
						}

					}

					return presetOptionName;
				}

				let allPresetsPerBank = [];

				let presetNamesPerBank = webAudioFontDef.presetNamesPerBank;
				for(let bankIndex = 0; bankIndex < presetNamesPerBank.length; ++bankIndex)
				{
					let bankPresets = [],
						presetNames = presetNamesPerBank[bankIndex];

					for(var nameIndex = 0; nameIndex < presetNames.length; nameIndex++)
					{
						let isPercussion = false,
							presetName = presetNames[nameIndex],
							zones;

						if(window[presetName] === undefined)
						{
							if(percussionPresets !== undefined)
							{
								let percussionPreset = percussionPresets.find(preset => preset.name.localeCompare(presetName) === 0);
								zones = percussionPreset.zones;
								isPercussion = true;
							}
						}
						else
						{
							zones = window[presetName].zones;
						}
						let presetIndex = zones[0].midi,
							presetOptionName = getPresetOptionName(presetName, bankIndex, presetIndex, isPercussion);

						bankPresets.push({ name: presetOptionName, presetIndex: presetIndex, zones: zones });
					}

					allPresetsPerBank.push(bankPresets);
				}

				return allPresetsPerBank;
            }

            function adjustForWAFSynth(webAudioFont)
            {
                function setZonesToMaximumRange(presetName, presetGMIndex, zones)
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
                        let gmName = WebMIDI.constants.generalMIDIPresetName(presetGMIndex);
					    console.warn("WAFSynth: extended the pitch range of preset " + presetName +" (" + gmName +").");
				    }
                }


                function deleteZoneAHDSRs(zones)
                {
                    for(var i = 0; i < zones.length; i++)
                    {
                        if(! delete zones[i].ahdsr)
                        {
                            console.warn("Failed to delete preset.ahdsr.");
                        };
                    }

                }

                function setZoneVEnvData(presetName, presetIndex, zones)
                {
                    // envTypes:
                    // 0: short envelope (e.g. drum, xylophone, percussion)
                    // 1: long envelope (e.g. piano)
                    // 2: unending envelope (e.g. wind instrument, organ)
                    const PRESET_ENVTYPE = { SHORT: 0, LONG: 1, UNENDING: 2 },
                        MAX_DURATION = 300000, // five minutes should be long enough...
                        DEFAULT_NOTEOFF_RELEASE_DURATION = 0.2;

                    function presetEnvType(isPercussion, presetIndex)
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

                        if(isPercussion)
                        {
                            return PRESET_ENVTYPE.SHORT;
                        }
                        else if(shortEnvs.indexOf(presetIndex) >= 0)
                        {
                            return PRESET_ENVTYPE.SHORT;
                        }
                        else if(longEnvs.indexOf(presetIndex) >= 0)
                        {
                            return PRESET_ENVTYPE.LONG;
                        }
                        else if(unendingEnvs.indexOf(presetIndex) >= 0)
                        {
                            return PRESET_ENVTYPE.UNENDING;
                        }
                        else
                        {
                            throw "presetIndex not found.";
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

                    function setSHORT_vEnvData(zones)
                    {
                        // Sets attack, hold, decay and release durations for each zone.
                        for(var i = 0; i < zones.length; i++)
                        {
                            let vEnvData = { attack: 0, hold: 0.5, decay: 4.5, release: DEFAULT_NOTEOFF_RELEASE_DURATION }; // Surikov envelope
                            vEnvData.envelopeDuration = 5; // zoneVEnvData.attack + zoneVEnvData.hold + zoneVEnvData.decay;
                            vEnvData.noteOffReleaseDuration = DEFAULT_NOTEOFF_RELEASE_DURATION; // zoneVEnvData.release;
                            zones[i].vEnvData = vEnvData;
                        }
                        checkDurations(zones[0].vEnvData);
                    }

                    function setLONG_vEnvData(presetName, presetIndex, zones)
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

                    function setUNENDING_vEnvData(zones)
                    {
                        // Sets attack, hold, decay and release durations for each zone.
                        for(var i = 0; i < zones.length; i++)
                        {
                            let vEnvData = { attack: 0, hold: MAX_DURATION, decay: 0, release: DEFAULT_NOTEOFF_RELEASE_DURATION }; // Surikov envelope
                            vEnvData.envelopeDuration = MAX_DURATION; // zoneVEnvData.attack + zoneVEnvData.hold + zoneVEnvData.decay;
                            vEnvData.noteOffReleaseDuration = DEFAULT_NOTEOFF_RELEASE_DURATION; // zoneVEnvData.release;
                            zones[i].vEnvData = vEnvData;
                        }
                        checkDurations(zones[0].vEnvData);
                    }

                    let isPercussion = presetName.includes("percussion"),
                        envType = presetEnvType(isPercussion, zones[0].midi);

                    // envTypes:
                    // 0: short envelope (e.g. drum, xylophone, percussion)
                    // 1: long envelope (e.g. piano)
                    // 2: unending envelope (e.g. wind instrument, organ)
                    switch(envType)
                    {
                        case PRESET_ENVTYPE.SHORT:
                            setSHORT_vEnvData(zones);
                            break;
                        case PRESET_ENVTYPE.LONG:
                            setLONG_vEnvData(presetName, presetIndex, zones);
                            break;
                        case PRESET_ENVTYPE.UNENDING:
                            setUNENDING_vEnvData(zones);
                            break;
                    }
                }

                let banks = webAudioFont.banks;                

                for(var i = 0; i < banks.length; i++)
                {
                    let presets = banks[i];
                    for(var j = 0; j < presets.length; j++)
                    {
                        let preset = presets[j],
                            presetName = preset.name,
                            presetGMIndex = preset.presetIndex,
                            zones = preset.zones;

                        setZonesToMaximumRange(presetName, presetGMIndex, zones);
                        // The residentWAFSynth is going to use the zone.vEnvData attributes
                        //(which are set below) instead of the original zone.ahdsr attributes.
                        // The zone.ahdsr attributes are deleted here to avoid confusion.
                        deleteZoneAHDSRs(zones);
                        setZoneVEnvData(presetName, presetGMIndex, zones);
                    }
                }

                return webAudioFont;
            }

			// See: https://stackoverflow.com/questions/758688/sleep-in-javascript-delay-between-actions
			function sleepUntilAllFontsAreReady(webAudioFonts)
			{
				function sleep(ms)
				{
					return new Promise(res => setTimeout(res, ms));
				}

				async function waitUntilWebAudioFontIsReady(webAudioFont)
				{
					while(!webAudioFont.isReady())
					{
						console.log('Sleeping');
						await sleep(100);
						console.log('Done sleeping');
					}
				}

				for(var i = 0; i < webAudioFonts.length; i++)
				{
					let webAudioFont = webAudioFonts[i];
					if(webAudioFont.isReady() === false)
					{
						waitUntilWebAudioFontIsReady(webAudioFont);
					}
				}
			}

			let webAudioFontDefs = WebMIDI.webAudioFontDefs, // defined in webAudioFonts/webAudioFonts.js
				webAudioFonts = [],
				percussionPresets = getPercussionPresets(); // undefined if there are no percussion presets

			adjustAllPresetVariables();

			for(let wafIndex = 0; wafIndex < webAudioFontDefs.length; ++wafIndex)
			{
				let webAudioFontDef = webAudioFontDefs[wafIndex],
					name = webAudioFontDef.name,
					allPresetsPerBank = finalizeAllPresetsPerWAFBank(webAudioFontDef, percussionPresets),
					presetNamesPerBank = webAudioFontDef.presetNamesPerBank,
                    webAudioFont = new WebMIDI.webAudioFont.WebAudioFont(name, allPresetsPerBank, presetNamesPerBank);

                // The webAudioFont's zone.file attributes need not have been completely adjusted (=unpacked) when
                // this function is called since neither the zone.file nor the binary zone.buffer attributes are accessed.
                let adjustedWebAudioFont = adjustForWAFSynth(webAudioFont);

                webAudioFonts.push(adjustedWebAudioFont);
			}

			sleepUntilAllFontsAreReady(webAudioFonts);

			return webAudioFonts;
        },

        // returns a value in range [-8192..+8191] for argument values in range [0..127]
        getPitchBend14bit = function(byte)
        {
            return ((byte << 7) + byte) - 8192;
        },

        // This command resets the pitchWheel and all CC controllers to their default values,
        // but does *not* reset the current bank or preset.
        // (CMD.CHANNEL_PRESSURE should also be reset here if/when it is implemented.) 
        setCCDefaults = function(that, channel)
        {
            let commandDefaultValue = WebMIDI.constants.commandDefaultValue,
                controlDefaultValue = WebMIDI.constants.controlDefaultValue;

            that.updatePitchWheel(channel, commandDefaultValue(CMD.PITCHWHEEL));

            that.registeredParameterCoarse(channel, controlDefaultValue(CTL.REGISTERED_PARAMETER_COARSE));
            that.dataEntryCoarse(channel, controlDefaultValue(CTL.DATA_ENTRY_COARSE));
            that.updateReverberation(channel, controlDefaultValue(CTL.REVERBERATION));
            that.updateVolume(channel, controlDefaultValue(CTL.VOLUME));
            that.updatePan(channel, controlDefaultValue(CTL.PAN));
        },

		CMD = WebMIDI.constants.COMMAND,
		CTL = WebMIDI.constants.CONTROL,

		// The commands and controls arrays are part of a standard WebMIDI synth's interface.
		commands =
			[
				CMD.NOTE_OFF,
				CMD.NOTE_ON,
				// CMD.AFTERTOUCH is not defined.
                // It is very unlikely that this synth will ever need to implement AFTERTOUCH, so
                // AFTERTOUCH has been eliminated from the ResidentWAFSynthHost development environment.
				CMD.CONTROL_CHANGE,
				CMD.PRESET,
				// CMD.CHANNEL_PRESSURE is not yet defined,
				CMD.PITCHWHEEL
			],

		controls =
			[
				// standard 3-byte controllers.

				// The WebMIDISynthHost GUI manages banks using the preset selector, so it does not provide a separate banks
				// control in the controls section of its GUI.
				// ResidentWAFSynth.prototype.send(message, ignoredTimestamp) _does_, however, use the
				// WebMIDI.constants.CONTROL.BANK definition to call setBank(channel, data2) via handleControl(channel, data1, data2).
				// The bank can be set by other applications by sending the appropriate message.
				CTL.BANK,
				CTL.VOLUME,
				CTL.PAN,
				CTL.REVERBERATION,

				// CTL.REGISTERED_PARAMETER_COARSE is set by this synthesizer to its defaultValue 0.
				// This synth prevents it being set to any other value (an exception is thrown if such an attempt is made),
				// so the WebMidiSynthHost does not provide a control for it in the controls section of its GUI.
				CTL.REGISTERED_PARAMETER_COARSE,
				CTL.DATA_ENTRY_COARSE,

				// standard 2-byte controllers.
				CTL.ALL_CONTROLLERS_OFF,
				CTL.ALL_SOUND_OFF
			],

		ResidentWAFSynth = function()
		{
			if(!(this instanceof ResidentWAFSynth))
			{
				return new ResidentWAFSynth();
			}

			// WebMIDIAPI §4.6 -- MIDIPort interface
			// See https://github.com/notator/WebMIDISynthHost/issues/23
			// and https://github.com/notator/WebMIDISynthHost/issues/24
			Object.defineProperty(this, "id", { value: "ResidentWAFSynth_v1", writable: false });
			Object.defineProperty(this, "manufacturer", { value: "james ingram (with thanks to sergey surikov)", writable: false });
			Object.defineProperty(this, "name", { value: "ResidentWAFSynth", writable: false });
			Object.defineProperty(this, "type", { value: "output", writable: false });
			Object.defineProperty(this, "version", { value: "1", writable: false });
			Object.defineProperty(this, "ondisconnect", { value: null, writable: false }); // Do we need this at all? Is it correct to set it to null?

			/*** Is this necessary? See https://github.com/WebAudio/web-midi-api/issues/110 ***/
			/*** See also: disconnect() function below ***/
			Object.defineProperty(this, "removable", { value: true, writable: false });

			/*** Extensions for software synths ***/
			// The synth author's webpage hosting the synth. 
			Object.defineProperty(this, "url", { value: "https://github.com/notator/WebMIDISynthHost", writable: false });
			// The commands supported by this synth (see above).
			Object.defineProperty(this, "commands", { value: commands, writable: false });
			// The controls supported by this synth (see above).
			Object.defineProperty(this, "controls", { value: controls, writable: false });
			// If isMultiChannel is false or undefined, the synth ignores the channel nibble in MIDI messages
			Object.defineProperty(this, "isMultiChannel", { value: true, writable: false });
			// If isPolyphonic is false or undefined, the synth can only play one note at a time
			Object.defineProperty(this, "isPolyphonic", { value: true, writable: false });
			// If supportsGeneralMIDI is defined, and is true, then
			// 1. both COMMAND.PRESET and CONTROL.BANK MUST be defined.
			// 2. the presets can be usefully named using GM preset names.
			//    (GM preset names are returned by WebMIDI.constants.generalMIDIPresetName(presetIndex). )
			// 3. in a percussion font, notes can be usefully named using the GM percussion names.
			//    (GM percussion names are returned by WebMIDI.constants.generalMIDIPercussionName(noteIndex). )
			// 4. the synth MAY define the function:
			//        void setSoundFont(soundFont)
			//    It is possible for a synth to support GM without using soundfonts.
			// 5. Clients should be sure that a preset is available before setting it.
			//    Whichever way it is set, the banks variable will contain all available banks and presets.
			Object.defineProperty(this, "supportsGeneralMIDI", { value: true, writable: false });

			/**********************************************************************************************/
			// attributes specific to this ResidentWAFSynth
			let AudioContextFunc = (window.AudioContext || window.webkitAudioContext); 
			Object.defineProperty(this, "audioContext", { value: new AudioContextFunc(), writable: false });
			Object.defineProperty(this, "webAudioFonts", { value: getWebAudioFonts(this.audioContext), writable: false });
		},

		API =
		{
			ResidentWAFSynth: ResidentWAFSynth // constructor
		};
	// end var

	// WebMIDIAPI §4.6 -- MIDIPort interface
	// See https://github.com/notator/WebMIDISynthHost/issues/24
	// This is called after user interaction with the page.
	ResidentWAFSynth.prototype.open = function()
    {
        function audioNodesConfig(audioContext, finalGainNode)
        {
            // Create and connect the channel AudioNodes:
            let channelPanNode = audioContext.createStereoPanner(),
                channelReverberator = new WebMIDI.wafReverberator.WAFReverberator(audioContext),
                channelGainNode = audioContext.createGain();

            channelPanNode.connect(channelReverberator.input);
            channelReverberator.output.connect(channelGainNode);
            channelGainNode.connect(finalGainNode);

            let channelInfo = {};
            // The GainNode that is created by each NoteOn (to control the note's individual envelope),
            // is connected to the channelInfo.inputNode.
            channelInfo.inputNode = channelPanNode;
            channelInfo.panNode = channelPanNode;
            channelInfo.reverberator = channelReverberator;
            channelInfo.gainNode = channelGainNode;

            return channelInfo;
        }

        function initialControlsState(channel)
        {
            let constants = WebMIDI.constants,
                CMD = constants.COMMAND,
                CTL = constants.CONTROL,
                commandDefaultValue = constants.commandDefaultValue,
                controlDefaultValue = constants.controlDefaultValue,
                controlState = {};

            controlState.bankIndex = -1; // These are set to the first preset in a font, when the font is loaded
            controlState.presetIndex = -1;

            controlState.pitchWheel = commandDefaultValue(CMD.PITCHWHEEL);

            controlState.volume = controlDefaultValue(CTL.VOLUME);
            controlState.pan = controlDefaultValue(CTL.PAN);
            controlState.reverberation = controlDefaultValue(CTL.REVERBERATION);
            controlState.dataEntryCoarse = controlDefaultValue(CTL.DATA_ENTRY_COARSE);

            controlState.currentNoteOns = [];

            return controlState;
        }

		let audioContext = this.audioContext; 

		audioContext.resume().then(() => { console.log('AudioContext resumed successfully'); });

        channelAudioNodes.finalGainNode = audioContext.createGain();
        channelAudioNodes.finalGainNode.connect(audioContext.destination);

		for(var i = 0; i < 16; i++)
		{
            channelAudioNodes.push(audioNodesConfig(audioContext, channelAudioNodes.finalGainNode));
            channelControls.push(initialControlsState(i));
		}
		console.log("residentWAFSynth opened.");
	};

	// WebMIDIAPI §4.6 -- MIDIPort interface
	// See https://github.com/notator/WebMIDISynthHost/issues/24
	ResidentWAFSynth.prototype.close = function()
    {
        if(channelAudioNodes.length > 0)
        {
            for(var i = 0; i < 16; i++)
            {
                channelAudioNodes[i].panNode.disconnect();
                channelAudioNodes[i].reverberator.disconnect();
                channelAudioNodes[i].gainNode.disconnect();
            }
            channelAudioNodes.finalGainNode.disconnect();
            channelAudioNodes.length = 0;
            console.log("residentWAFSynth closed.");
        }
	};

	// WebMIDIAPI MIDIOutput send()
	// This synth does not yet support timestamps (05.11.2015)
	ResidentWAFSynth.prototype.send = function(message, ignoredTimestamp)
	{
		var
			command = message[0] & 0xF0,
			channel = message[0] & 0xF,
			data1 = message[1],
			data2 = message[2],
			that = this;

		function checkCommandExport(command)
		{
			if(command === undefined)
			{
                console.warn("Illegal command");
			}
			else
			{
				let cmd = commands.find(cmd => cmd === command);
				if(cmd === undefined)
				{
                    console.warn("Command " + command.toString(10) + " (0x" + command.toString(16) + ") is not supported.");
				}
			}
		}
		function handleNoteOff(channel, data1, data2)
		{
			checkCommandExport(CMD.NOTE_OFF);
			// console.log("residentWAFSynth NoteOff: channel:" + channel + " note:" + data1 + " velocity:" + data2);
			that.noteOff(channel, data1, data2);
		}
		function handleNoteOn(channel, data1, data2)
		{
			checkCommandExport(CMD.NOTE_ON);
			// console.log("residentWAFSynth NoteOn: channel:" + channel + " note:" + data1 + " velocity:" + data2);
            if(data2 === 0)
            {
                that.noteOff(channel, data1, 100);
            }
            else
            {
                that.noteOn(channel, data1, data2);
            }
		}
		function handleControl(channel, data1, data2)
		{
			function checkControlExport(control)
			{
				if(control === undefined)
				{
                    console.warn("Illegal control");
				}
				else
				{
					let ctl = controls.find(ctl => ctl === control);
					if(ctl === undefined)
					{
                        console.warn("Controller " + control.toString(10) + " (0x" + control.toString(16) + ") is not supported.");
					}
				}
			}
			function setBank(channel, value)
			{
				// The exported controls are the ones that appear in the GUI.
				// There should be no bank control in the list of this synths visible controls, so 
				// checkControlExport(CTL.BANK) is not called here.
                channelControls[channel].bankIndex = value; // this is the complete implementation!

				// console.log("residentWAFSynth Bank: channel:" + channel + " value:" + value);
			}
			function setVolume(channel, value)
			{
				checkControlExport(CTL.VOLUME);
				// console.log("residentWAFSynth Volume: channel:" + channel + " value:" + value);
				that.updateVolume(channel, value);
			}
			function setPan(channel, value)
			{
				checkControlExport(CTL.PAN);
				// console.log("residentWAFSynth Pan: channel:" + channel + " value:" + value);
				that.updatePan(channel, value);
			}

			function setReverberation(channel, value)
			{
				checkControlExport(CTL.REVERBERATION);
				// console.log("residentWAFSynth Reverberation: channel:" + channel + " value:" + value);
				that.updateReverberation(channel, value);
			}

			function allControllersOff(channel)
			{
				checkControlExport(CTL.ALL_CONTROLLERS_OFF);
				// console.log("residentWAFSynth AllControllersOff: channel:" + channel);
				that.allControllersOff(channel);
			}
			function setAllSoundOff(channel)
			{
				checkControlExport(CTL.ALL_SOUND_OFF);
				// console.log("residentWAFSynth AllSoundOff: channel:" + channel);
				that.allSoundOff(channel);
			}

			function setRegisteredParameterCoarse(channel, value)
			{
				checkControlExport(CTL.REGISTERED_PARAMETER_COARSE);
				// console.log("residentWAFSynth RegisteredParameterCoarse: channel:" + channel + " value:" + value);
				if(value !== 0)
				{
					throw "This synth only supports registeredParameterCoarse = 0 (pitchWheelDeviation semitones)";
				}
				that.registeredParameterCoarse(channel, value);
			}

			function setDataEntryCoarse(channel, semitones)
			{
				checkControlExport(CTL.DATA_ENTRY_COARSE);
				// console.log("residentWAFSynth DataEntryCoarse: channel:" + channel + " value:" + semitones);
				that.dataEntryCoarse(channel, semitones);
			}

			checkCommandExport(CMD.CONTROL_CHANGE);

			switch(data1)
			{
				case CTL.BANK: // N.B. This is implemented for send, but is not an independent control in the WebMIDISynthHost's GUI
					setBank(channel, data2);
					break;
				case CTL.VOLUME:
					setVolume(channel, data2);
					break;
				case CTL.PAN:
					setPan(channel, data2);
					break;
				case CTL.REVERBERATION:
					setReverberation(channel, data2);
					break;
				case CTL.ALL_CONTROLLERS_OFF:
					allControllersOff(channel);
					break;
				case CTL.ALL_SOUND_OFF:
					setAllSoundOff(channel);
					break;
				// CTL.REGISTERED_PARAMETER_FINE and CTL.DATA_ENTRY_FINE are not supported (i.e. are ignored by) this synth.
				case CTL.REGISTERED_PARAMETER_COARSE:
					setRegisteredParameterCoarse(channel, data2);
					break;
				case CTL.DATA_ENTRY_COARSE: // default coarse is semitones pitchWheelDeviation when RPC is 0
					setDataEntryCoarse(channel, data2);
					break;

				default:
                    console.warn(`Controller ${data1.toString(10)} (0x${data1.toString(16)}) is not supported.`);
			}
		}
		function handlePreset(channel, data1)
		{
			checkCommandExport(CMD.PRESET);
			// console.log("residentWAFSynth Preset: channel:" + channel, " value:" + data1);
			that.updatePreset(channel, data1);
		}
		function handlePitchWheel(channel, data1)
		{
			checkCommandExport(CMD.PITCHWHEEL);
			// console.log("residentWAFSynth PitchWheel: channel:" + channel, " value:" + data1);
			that.updatePitchWheel(channel, data1, data2);
		}

		switch(command)
		{
			case CMD.NOTE_OFF:
				handleNoteOff(channel, data1, data2);
				break;
			case CMD.NOTE_ON:
				handleNoteOn(channel, data1, data2);
				break;
			case CMD.CONTROL_CHANGE:
				handleControl(channel, data1, data2);
				break;
			case CMD.PRESET:
				handlePreset(channel, data1);
				break;
			case CMD.PITCHWHEEL:
				handlePitchWheel(channel, data1, data2);
				break;
			default:
                console.warn("Command " + command.toString(10) + " (0x" + command.toString(16) + ") is not supported.");
		}
    };

    ResidentWAFSynth.prototype.channelControlsState = function(channel)
    {
        let controlsInfo = channelControls[channel],
            state = [];

        state.push({ cmdIndex: CMD.PRESET, cmdValue: controlsInfo.presetIndex });
        state.push({ cmdIndex: CMD.PITCHWHEEL, cmdValue: controlsInfo.pitchWheel });

        state.push({ ccIndex: CTL.BANK, ccValue: controlsInfo.bankIndex });
        state.push({ ccIndex: CTL.VOLUME, ccValue: controlsInfo.volume });
        state.push({ ccIndex: CTL.PAN, ccValue: controlsInfo.pan });
        state.push({ ccIndex: CTL.REVERBERATION, ccValue: controlsInfo.reverberation });
        state.push({ ccIndex: CTL.DATA_ENTRY_COARSE, ccValue: controlsInfo.dataEntryCoarse });

        return state;
    };

	ResidentWAFSynth.prototype.setSoundFont = function(webAudioFont)
    {
		if(!webAudioFont.isReady())
		{
			throw "This function should not be called before the webAudioFont is ready!";
		}

		banks = [];
		for(var i = 0; i < webAudioFont.banks.length; i++)
		{
			let wafBank = webAudioFont.banks[i],
				bank = [];

			for(var j = 0; j < wafBank.length; j++)	
			{
				let preset = wafBank[j];
				bank[preset.presetIndex] = preset;
			}
			banks.push(bank);
        }

        let defaultBankIndex = 0,
            defaultPresetIndex = webAudioFont.banks[0][0].presetIndex;
        
		for(let i = 0; i < 16; ++i)
        {
            // set default bank and preset.
            // N.B. In the ResidentWAFSynthHost application, the bank and preset defaults are
            // overridden so that each channel is given its own preset when the app initializes.
            this.setPresetInChannel(i, defaultBankIndex, defaultPresetIndex);
			setCCDefaults(this, i);
        }

		console.log("residentWAFSynth WebAudioFont set.");
	};

	// see close() above...
	ResidentWAFSynth.prototype.disconnect = function()
	{
		throw "Not implemented error.";
	};

	ResidentWAFSynth.prototype.noteOn = function(channel, key, velocity)
	{
		var audioContext = this.audioContext,
            bankIndex = channelControls[channel].bankIndex,
			bank = banks[bankIndex],
			preset,
			zone,
			note,
			midi = {},
            bankIndexStr, presetIndexStr, channelStr, keyStr;

		// *Setting* the pitchBendSensitivity should be done by
		//   1. setting registeredParameterCoarse to 0.
		//   2. setting dataEntryCoarse to the sensitivity (in semitones) -- using this.dataEntryCoarse(channel, semitones).
		// If the channelRegisteredParameterCoarse param is set !== 0, then this function will throw an exception.
		// This synth ignores both channelRegisteredParameterFine and channelDataEntryFine.
		function getPitchBendSensitivity(channel)
		{
            if(channelControls[channel].registeredParameterCoarse !== 0)
			{
				throw "registeredParameterCoarse must be 0 to get the pitch bend sensitivity";
			}
            return channelControls[channel].dataEntryCoarse; // the channel's pitchBendSensitivity in semitones
		}

		if(velocity === 0)
		{
            let currentNoteOns = channelControls[channel].currentNoteOns;
			let note = currentNoteOns.find(note => note.key === key);
			if(note !== undefined)
			{
				note.noteOff();
			}
			return;
		}

		if(bank === undefined)
		{
			console.warn("bank " + bankIndex.toString(10) + " not found.");
			return;
		}

        preset = bank[channelControls[channel].presetIndex];
		if(preset === undefined)
		{
			bankIndexStr = bankIndex.toString(10);
            presetIndexStr = (channelControls[channel].presetIndex).toString(10);
			console.warn("preset not found: bankIndex=" + bankIndexStr + " presetIndex=" + presetIndexStr);
			return;
		}

		zone = preset.zones.find(obj => (obj.keyRangeHigh >= key && obj.keyRangeLow <= key)); 
		if(!zone)
		{
			bankIndexStr = bankIndex.toString(10);
            presetIndexStr = (channelControls[channel].presetIndex).toString(10);
			channelStr = channel.toString(10);
			keyStr = key.toString(10);
			let warnString = "zone not found: bank=" + bankIndexStr + " presetIndex=" + presetIndexStr + " channel=" + channelStr + " key=" + keyStr;
			if(preset.name.includes("percussion"))
			{
				warnString += "\nThis is a percussion preset containing the following instrument indices:";
				for(var i = 0; i < preset.zones.length; i++)
				{
					warnString += " " + preset.zones[i].keyRangeLow.toString() + ",";
				}
				warnString = warnString.slice(0, -1);
			}
			console.warn(warnString);
			return;
		}

		midi.key = key;
		midi.velocity = velocity;
        midi.pitchBend14bit = getPitchBend14bit(channelControls[channel].pitchWheel); // a value in range [-8192..+8191]
		midi.pitchBendSensitivity = getPitchBendSensitivity(channel);

		let noteGainNode = audioContext.createGain();

		noteGainNode.connect(channelAudioNodes[channel].inputNode);

		// note on
		note = new WebMIDI.residentWAFSynthNote.ResidentWAFSynthNote(audioContext, noteGainNode, zone, midi);
		note.noteOn();
        channelControls[channel].currentNoteOns.push(note);
	};

	ResidentWAFSynth.prototype.noteOff = function(channel, key, velocity)
	{
        let currentNoteOns = channelControls[channel].currentNoteOns,
			noteIndex = currentNoteOns.findIndex(obj => obj.key === key);

		if(noteIndex >= 0)
		{
			currentNoteOns[noteIndex].noteOff();
			currentNoteOns.splice(noteIndex, 1);
		}
	};

	// The bank argument is in range [0..127].
	ResidentWAFSynth.prototype.updateBank = function(channel, bankIndex)
	{
        channelControls[channel].bankIndex = bankIndex;
	};

	// N.B. the presetIndex argument is the General MIDI presetIndex
	ResidentWAFSynth.prototype.updatePreset = function(channel, presetIndex)
	{
        channelControls[channel].presetIndex = presetIndex;
	};

	ResidentWAFSynth.prototype.updatePitchWheel = function(channel, lowerByte, higherByte)
	{
		var pitchBend14Bit = ((lowerByte & 0x7f) | ((higherByte & 0x7f) << 7)) - 8192,
            currentNoteOns = channelControls[channel].currentNoteOns;

		if(currentNoteOns !== undefined)
		{
			let nNoteOns = currentNoteOns.length;
			for(let i = 0; i < nNoteOns; ++i)
			{
				currentNoteOns[i].updatePlaybackRate(pitchBend14Bit);
			}
		}
        channelControls[channel].pitchWheel = lowerByte;
	};

	// Both of these should be called by clients, but setting registeredParameterCoarse to anything other than 0
	// will cause the retrieval of the dataEntryCoarse (pitchBendSensitivity) to throw an exception and fail.
	// Setting registeredParameterCoarse has been suppressed in this synth's UI in the WebMIDISynthHost app. 
	ResidentWAFSynth.prototype.registeredParameterCoarse = function(channel, value)
	{
        channelControls[channel].registeredParameterCoarse = value;
	};
	ResidentWAFSynth.prototype.dataEntryCoarse = function(channel, semitones)
	{
        channelControls[channel].dataEntryCoarse = semitones;

        let currentNoteOns = channelControls[channel].currentNoteOns;
		if(currentNoteOns !== undefined)
		{
            let pitchWheel = channelControls[channel].pitchWheel,
                pitchBend14bit = getPitchBend14bit(pitchWheel),
				nNoteOns = currentNoteOns.length;

			for(let i = 0; i < nNoteOns; ++i)
			{
				currentNoteOns[i].pitchBendSensitivity = semitones;
				currentNoteOns[i].updatePlaybackRate(pitchBend14bit);
			}
		}
	};

	// The reverberation argument is in range [0..127], meaning completely dry to completely wet.
	ResidentWAFSynth.prototype.updateReverberation = function(channel, reverberation)
    {
        channelAudioNodes[channel].reverberator.setValueAtTime(reverberation, this.audioContext.currentTime);
        channelControls[channel].reverberation = reverberation;
	};

	// The volume argument is in range [0..127], meaning muted to as loud as possible.
	ResidentWAFSynth.prototype.updateVolume = function(channel, volume)
	{
		let volumeFactor = volume / 127;
        channelAudioNodes[channel].gainNode.gain.setValueAtTime(volumeFactor, this.audioContext.currentTime);
        channelControls[channel].volume = volume;
	};

	// The pan argument is in range [0..127], meaning completely left to completely right.
	ResidentWAFSynth.prototype.updatePan = function(channel, pan)
	{
		let panValue = ((pan / 127) * 2) - 1; // panValue is in range [-1..1]
        channelAudioNodes[channel].panNode.pan.setValueAtTime(panValue, this.audioContext.currentTime);
        channelControls[channel].pan = pan;
	};

	ResidentWAFSynth.prototype.allSoundOff = function(channel)
	{
        var currentNoteOns = channelControls[channel].currentNoteOns;

		while(currentNoteOns.length > 0)
		{
			this.noteOff(channel, currentNoteOns[0].key, 0);
		}
    };

    ResidentWAFSynth.prototype.setPresetInChannel = function(channel, bankIndex, presetIndex)
    {
        channelControls[channel].bankIndex = bankIndex;
        channelControls[channel].presetIndex = presetIndex;
    };

	ResidentWAFSynth.prototype.allControllersOff = function(channel)
	{
        var currentNoteOns = channelControls[channel].currentNoteOns;

		while(currentNoteOns.length > 0)
		{
			this.noteOff(channel, currentNoteOns[0].key, 0);
		}

		setCCDefaults(this, channel);
	};

	return API;

}(window));
