console.log('load webAudioFontDefs.js');

WebMIDI.namespace('webAudioFontDefs');
WebMIDI.namespace('percussionPresets'); // omit if there are no percussion presets

// Each array contained in a webAudioFontDefs.presetNamesPerBank[] defines the content of a bank.
// Banks do not have to contain the same set of midiPreset indices (that's application specific).
// There can be up to 127 banks in a webAudioFontDef.
WebMIDI.webAudioFontDefs =
	[
		{
			name: "Study 2",
			presetNamesPerBank:
			[
				[	// bank 0
					"_tone_0080_FluidR3_GM_sf2_file", // presetIndex:8, celesta
					"_tone_0090_FluidR3_GM_sf2_file", // presetIndex:9, glockenspiel
					"_tone_0100_FluidR3_GM_sf2_file", // presetIndex:10, musicBox
					"_tone_0110_FluidR3_GM_sf2_file", // presetIndex:11, vibraphone
					"_tone_0120_FluidR3_GM_sf2_file", // presetIndex:12, marimba
					"_tone_0130_FluidR3_GM_sf2_file", // presetIndex:13, xylophone
					"_tone_0140_FluidR3_GM_sf2_file", // presetIndex:14, tubularBells
					"_tone_0150_FluidR3_GM_sf2_file", // presetIndex:15, dulcimer
					"_tone_0240_FluidR3_GM_sf2_file", // presetIndex:24, nylonGuitar
					"_tone_0250_FluidR3_GM_sf2_file", // presetIndex:25, steelGuitar
					"_tone_0260_FluidR3_GM_sf2_file", // presetIndex:26, electricGuitarJazz
					"_tone_0270_FluidR3_GM_sf2_file"  // presetIndex:27, electricGuitarClean
				]
			]
		},
		{
			name: "interesting Fluid presets",
			presetNamesPerBank:
			[
				[	// bank 0
					"_tone_0460_FluidR3_GM_sf2_file", // presetIndex:46, harp
					"_tone_0530_FluidR3_GM_sf2_file", // presetIndex:53, oohs
					"_tone_0580_FluidR3_GM_sf2_file", // presetIndex:58, tuba
					"_tone_0790_FluidR3_GM_sf2_file", // presetIndex:79, ocarina
					"_tone_0890_FluidR3_GM_sf2_file", // presetIndex:89, pad 2
					"_tone_0920_FluidR3_GM_sf2_file", // presetIndex:92, pad 5
					"_tone_0930_FluidR3_GM_sf2_file", // presetIndex:93, pad 6
					"_tone_0950_FluidR3_GM_sf2_file"  // presetIndex:95, pad 8
				]
			]
		},
		{
			name: "some Fluid winds",
			presetNamesPerBank:
			[
				[	// bank 0
					"_tone_0600_FluidR3_GM_sf2_file", // presetIndex:60, horn
					"_tone_0660_FluidR3_GM_sf2_file", // presetIndex:66, tenor sax
					"_tone_0680_FluidR3_GM_sf2_file", // presetIndex:68, oboe
					"_tone_0700_FluidR3_GM_sf2_file", // presetIndex:70, bassoon
					"_tone_0710_FluidR3_GM_sf2_file", // presetIndex:71, clarinet
					"_tone_0730_FluidR3_GM_sf2_file"  // presetIndex:73, flute
				]
			]
		},
		{
			name: "ensemble (two banks)",
			presetNamesPerBank:
				[						
					[	// bank 0
						"_tone_0080_FluidR3_GM_sf2_file", // presetIndex:8, celesta
						"_tone_0090_FluidR3_GM_sf2_file", // presetIndex:9, glockenspiel
						"_tone_0100_FluidR3_GM_sf2_file", // presetIndex:10, musicBox
						"_tone_0110_FluidR3_GM_sf2_file", // presetIndex:11, vibraphone
						"_tone_0120_FluidR3_GM_sf2_file", // presetIndex:12, marimba
						"_tone_0130_FluidR3_GM_sf2_file", // presetIndex:13, xylophone
						"_tone_0140_FluidR3_GM_sf2_file", // presetIndex:14, tubularBells
						"_tone_0150_FluidR3_GM_sf2_file", // presetIndex:15, dulcimer
						"_tone_0160_FluidR3_GM_sf2_file", // presetIndex:16, drawbarOrgan
						"_tone_0240_FluidR3_GM_sf2_file", // presetIndex:24, nylonGuitar
						"_tone_0250_FluidR3_GM_sf2_file", // presetIndex:25, steelGuitar
						"_tone_0260_FluidR3_GM_sf2_file", // presetIndex:26, electricGuitarJazz
						"_tone_0270_FluidR3_GM_sf2_file", // presetIndex:27, electricGuitarClean
						"_tone_0460_FluidR3_GM_sf2_file", // presetIndex:46, Harp
						"percussion (FluidR3 metal and wood)",// presetIndex:126, (percussion preset defined below)
						"percussion (FluidR3 drums)"	  // presetIndex:127, (percussion preset defined below)
					],						
					[   // bank 1
						"_tone_0080_GeneralUserGS_sf2_file", // presetIndex:8, celesta
						"_tone_0090_GeneralUserGS_sf2_file", // presetIndex:9, glockenspiel
						"_tone_0100_GeneralUserGS_sf2_file", // presetIndex:10, musicBox
						"_tone_0110_GeneralUserGS_sf2_file", // presetIndex:11, vibraphone
						"_tone_0120_GeneralUserGS_sf2_file", // presetIndex:12, marimba
						"_tone_0130_GeneralUserGS_sf2_file", // presetIndex:13, xylophone
						"_tone_0140_GeneralUserGS_sf2_file", // presetIndex:14, tubularBells
						"_tone_0160_GeneralUserGS_sf2_file", // presetIndex:16, drawbarOrgan
						"percussion (FluidR3 drums)"		 // presetIndex:127, (percussion preset defined below)
					]
				]
		},
		{
			name: "keyboards (two banks)",
			presetNamesPerBank:
				[
					[	// bank 0
						"_tone_0000_FluidR3_GM_sf2_file", // presetIndex:0, piano
						"_tone_0060_FluidR3_GM_sf2_file", // presetIndex:6, harpsichord
						"_tone_0080_FluidR3_GM_sf2_file", // presetIndex:8, celesta
						"_tone_0160_FluidR3_GM_sf2_file"  // presetIndex:16, drawbarOrgan
					],
					[	// bank 1
						"_tone_0000_GeneralUserGS_sf2_file", // presetIndex:0, piano
						"_tone_0060_GeneralUserGS_sf2_file", // presetIndex:6, harpsichord
						"_tone_0080_GeneralUserGS_sf2_file", // presetIndex:8, celesta
						"_tone_0160_GeneralUserGS_sf2_file"  // presetIndex:16, drawbarOrgan
					]
				]
		},
		{
			name: "two Acoustic Grand Pianos (two banks)",
			presetNamesPerBank:
				[
					[	// bank 0
						"_tone_0000_FluidR3_GM_sf2_file"	// presetIndex:0, piano
					],
					[	// bank 1
						"_tone_0000_GeneralUserGS_sf2_file" // presetIndex:0, piano
					]
				]
		},
		{
			name: "one Acoustic Grand Piano (one bank)",
			presetNamesPerBank:
				[
					[	// bank 0
						"_tone_0000_FluidR3_GM_sf2_file"	// presetIndex:0, piano
					]
				]
		}
	];

// WebMIDI.percussionPresets should only be defined if percussion presets are used in the above definitions.
//
// These percussion preset definitions are just examples. A General MIDI compatible implementation might have one
// definition containing all the instruments from a particular source, with the preset assigned to channelIndex 9.
// Each percussionPreset is created after these files have been adjusted (=unpacked).
// The preset is given its defined .presetIndex attribute, and each zone's .midi attribute is set to the same value.
// It is an error for two sounds to be assigned to the same key in the same preset. Not all keys have to be assigned (as here).
WebMIDI.percussionPresets =
	[
		{
			name: "percussion (FluidR3 metal and wood)",
			presetIndex: 126, // any index that is not otherwise used in the same bank
			keys:
				[
					"_drum_56_0_FluidR3_GM_sf2_file", // keyIndex:56 Cowbell
					"_drum_59_0_FluidR3_GM_sf2_file", // keyIndex:59 Ride Cymbal 2    
					"_drum_70_0_FluidR3_GM_sf2_file", // keyIndex:70 Maracas 
					"_drum_73_0_FluidR3_GM_sf2_file", // keyIndex:73 Short Guiro 
					"_drum_74_0_FluidR3_GM_sf2_file", // keyIndex:74 Long Guiro
					"_drum_75_0_FluidR3_GM_sf2_file", // keyIndex:75 Claves
					"_drum_76_0_FluidR3_GM_sf2_file", // keyIndex:76 Hi Wood Block 
					"_drum_77_0_FluidR3_GM_sf2_file", // keyIndex:77 Low Wood Block 
					"_drum_81_0_FluidR3_GM_sf2_file"  // keyIndex:81 Open Triangle
				]
		},
		{
			name: "percussion (FluidR3 drums)",
			presetIndex: 127, // any index that is not otherwise used in the same bank
			keys:
				[
					"_drum_41_0_FluidR3_GM_sf2_file", // keyIndex:41 Low Floor Tom
					"_drum_45_0_FluidR3_GM_sf2_file", // keyIndex:45 Low Tom
					"_drum_48_0_FluidR3_GM_sf2_file", // keyIndex:48 Hi-Mid Tom
					"_drum_60_0_FluidR3_GM_sf2_file", // keyIndex:60 Hi Bongo    
					"_drum_61_0_FluidR3_GM_sf2_file", // keyIndex:61 Low Bongo   
					"_drum_62_0_FluidR3_GM_sf2_file", // keyIndex:62 Mute Hi Conga
					"_drum_63_0_FluidR3_GM_sf2_file"  // keyIndex:63 Open Hi Conga 
				]
		}
	];



