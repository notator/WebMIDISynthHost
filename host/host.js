/*
*  copyright 2015 James Ingram
*  http://james-ingram-act-two.de/
*
*  Code licensed under MIT
*
*  This file contains the implementation of the WebMIDISynthHost's GUI. 
*  The WebMIDISynthHost can host one or more WebMIDISynths and use one
*  or more SoundFonts.
*  This code is currently a bit raw. It works, but could be improved.
*/

/*jslint bitwise: false, nomen: true, plusplus: true, white: true */
/*global WebMIDI: false,  WebMIDISynth: false, window: false,  document: false, performance: false, console: false, alert: false, XMLHttpRequest: false */

WebMIDI.namespace('WebMIDI.host');

WebMIDI.host = (function(document)
{
	"use strict";

	var
	previousNormalChannel = 0, // used when setting/unsetting the percussion channel 9.
	inputDefaultsCache = [], // used by AllControllersOff control

	openInNewTab = function(url)
	{
		var win = window.open(url, '_blank');
		win.focus();
	},
	
	gitHubButtonClick = function()
	{
		var url = "https://github.com/notator/WebMIDISynthHost";
		openInNewTab(url);
	},

	div2ButtonClick = function()
	{
		var div2 = document.getElementById("div2"),
		controlsDiv = document.getElementById("controlsDiv");

		div2.innerHTML = "";
		controlsDiv.style.visibility = "visible";
	},

	synthWebsiteButtonClick = function()
	{
		var
		synthSelect = document.getElementById("synthSelect"),
		synth = synthSelect[synthSelect.selectedIndex].synth;
		openInNewTab(synth.url);
	},

	soundFontWebsiteButtonClick = function()
	{
		var sf2OriginSelect = document.getElementById("sf2OriginSelect");

		openInNewTab(sf2OriginSelect[sf2OriginSelect.selectedIndex].url);
	},


	// called by onSf2SelectChanged and by "send again" button.
	onChangePreset = function()
	{
		var CMD = WebMIDI.constants.COMMAND, CTL = WebMIDI.constants.CONTROL,
			synthSelect = document.getElementById("synthSelect"),
			channelSelect = document.getElementById("channelSelect"),
			presetSelect = document.getElementById("presetSelect"),
			synth, channel, bank, patch, status, data1, message;

		synth = synthSelect.options[synthSelect.selectedIndex].synth;
		channel = parseInt(channelSelect[channelSelect.selectedIndex].value, 10);

		bank = presetSelect.options[presetSelect.selectedIndex].bank;
		patch = presetSelect.options[presetSelect.selectedIndex].patch;

		if(bank === 128)
		{
			if(channel !== 9)
			{
				previousNormalChannel = channel;
				channelSelect.selectedIndex = 9;
				channelSelect.disabled = true;
			}
		}
		else
		{
			if(channel === 9)
			{
				channel = previousNormalChannel;
				channelSelect.selectedIndex = channel;
				channelSelect.disabled = false;
			}
			else
			{
				previousNormalChannel = channel;
			}
		}


		status = CMD.CONTROL_CHANGE + channel;
		data1 = CTL.BANK_SELECT;
		message = new Uint8Array([status, data1, bank]);
		synth.send(message, performance.now());

		status = CMD.PATCH_CHANGE + channel;
		message = new Uint8Array([status, patch]);
		synth.send(message, performance.now());
	},

	setOptions = function(select, options)
	{
		var i;

		for(i = select.options.length - 1; i >= 0; i--)
		{
			select.remove(i);
		}

		for(i = 0; i < options.length; ++i)
		{
			select.add(options[i]);
		}

		select.selectedIndex = 0;
	},

	midiValue = function(value)
	{
		value = (value < 0) ? 0 : value;
		value = (value > 127) ? 127 : value;
		return value;
	},

	setMIDIMessagesControlTable = function()
	{
		var CMD = WebMIDI.constants.COMMAND, CTL = WebMIDI.constants.CONTROL,
			DEFAULT = WebMIDI.constants.DEFAULT,
			i,
			synthSelect = document.getElementById("synthSelect"),
			synth = synthSelect[synthSelect.selectedIndex].synth,
			channelSelect = document.getElementById("channelSelect"),
			sf2Select = document.getElementById("sf2Select"),
			presetSelect = document.getElementById("presetSelect"),
			table = document.getElementById("midiMessagesControlTable");

		function sendCommand(command, value)
		{
			var synth = synthSelect[synthSelect.selectedIndex].synth,
				channelIndex = parseInt(channelSelect[channelSelect.selectedIndex].value, 10),
				status = command + channelIndex,
				message = new Uint8Array([status, command, value]),
				noteIndexInput, noteIndex, data1, data2;

			switch(command)
			{
				case CMD.AFTERTOUCH:
					noteIndexInput = document.getElementById("noteIndexInput");
					noteIndex = noteIndexInput.valueAsNumber;
					data1 = noteIndex;
					data2 = value;
					message = new Uint8Array([status, data1, data2]);
					break;
				case CMD.CHANNEL_PRESSURE:
					data1 = value;
					message = new Uint8Array([status, data1]);
					break;
				case CMD.PITCHWHEEL:
					// This host uses the same 7-bit MSB (0..127) for data1 and data2.
					// Doing this means that the available pitchWheel values are equally spaced
					// and span the complete pitchWheel deviation range.
					data1 = value;
					data2 = value;
					message = new Uint8Array([status, data1, data2]);
					break;
				default:
					throw "Error: Not a command, or attempt to set the value of a command that has no value.";
			}

			synth.send(message, performance.now());
		}

		function sendLongControl(control, value)
		{
			var synth = synthSelect[synthSelect.selectedIndex].synth,
				channelIndex = parseInt(channelSelect[channelSelect.selectedIndex].value, 10),
				status = CMD.CONTROL_CHANGE + channelIndex,
				message = new Uint8Array([status, control, value]);

			synth.send(message, performance.now());
		}

		function sendShortControl(control)
		{
			var synth = synthSelect[synthSelect.selectedIndex].synth,
				channelIndex = parseInt(channelSelect[channelSelect.selectedIndex].value, 10),
				status = CMD.CONTROL_CHANGE + channelIndex,
				message = new Uint8Array([status, control]);

			function resetHostGUI()
			{
				var i, inputID, defaultValue, elem;

				for(i = 0; i < inputDefaultsCache.length; ++i)
				{
					inputID = inputDefaultsCache[i].inputID;
					defaultValue = inputDefaultsCache[i].defaultValue;
					elem = document.getElementById(inputID);
					elem.value = defaultValue;
				}
			}

			if(control === WebMIDI.constants.CONTROL.ALL_CONTROLLERS_OFF)
			{
				resetHostGUI();
			}
			synth.send(message, performance.now());
		}

		function getRow(namestr, command, longControl, shortControl, defaultValue)
		{
			var tr = document.createElement("tr"),
			td, input, button;

			function onInputChanged(event)
			{
				var numberInput = event.currentTarget,
					value = numberInput.valueAsNumber;

				numberInput.value = midiValue(value);

				if(numberInput.command !== null && numberInput.command !== undefined)
				{
					sendCommand(numberInput.command, numberInput.valueAsNumber);
				}
				else if(numberInput.longControl !== null && numberInput.longControl !== undefined)
				{
					sendLongControl(numberInput.longControl, numberInput.valueAsNumber);
				}
			}

			function onSendAgainButtonClick(event)
			{
				var inputID = event.currentTarget.inputID,
					numberInput = document.getElementById(inputID);

				if(numberInput.command !== null && numberInput.command !== undefined)
				{
					sendCommand(numberInput.command, numberInput.valueAsNumber);
				}
				else if(numberInput.longControl !== null && numberInput.longControl !== undefined)
				{
					sendLongControl(numberInput.longControl, numberInput.valueAsNumber);
				}
			}

			function onSendShortControlButtonClick(event)
			{
				var control = event.currentTarget.control;

				sendShortControl(control);
			}

			td = document.createElement("td");
			tr.appendChild(td);
			td.className = "left";
			td.innerHTML = namestr;

			td = document.createElement("td");
			tr.appendChild(td);
			if(shortControl === null)
			{
				input = document.createElement("input");
				//<input type="number" name="quantity" min="0" max="127">
				input.type = "number";
				input.name = "value";
				input.id = namestr.concat("_numberInput");
				input.value = defaultValue;
				input.className = "number";
				input.min = 0;
				input.max = 127;
				if(command !== null)
				{
					input.command = command;
				}
				else if(longControl !== null)
				{
					input.longControl = longControl;
				}
				input.onchange = onInputChanged;
				td.appendChild(input);

				button = document.createElement("input");
				button.type = "button";
				button.className = "sendAgainButton";
				button.value = "send again";
				button.inputID = input.id;
				button.onclick = onSendAgainButtonClick;
				td.appendChild(button);

				inputDefaultsCache.push({ inputID: input.id, defaultValue: defaultValue });
			}
			else
			{
				button = document.createElement("input");
				button.type = "button";
				button.className = "sendButton";
				button.value = "send";
				button.control = shortControl;
				button.onclick = onSendShortControlButtonClick;
				td.appendChild(button);
			}

			return tr;
		}

		function appendTitleCommandRow(table)
		{
			var tr = document.createElement("tr"),
			td = document.createElement("td"),
			span = document.createElement("span");

			table.appendChild(tr);
			tr.appendChild(td);
			td.appendChild(span);
			span.innerHTML = "synth's commands:";
			span.className = "boldSubtitle";
		}

		function appendPresetCommandRow(table, presetOptions)
		{
			var tr = document.createElement("tr"),
				td, presetSelect, input;

			table.appendChild(tr);

			td = document.createElement("td");
			tr.appendChild(td);
			td.className = "left";
			td.innerHTML = "preset";

			td = document.createElement("td");
			tr.appendChild(td);
			presetSelect = document.createElement("select");
			presetSelect.id = "presetSelect";
			presetSelect.className = "presetSelect";
			setOptions(presetSelect, presetOptions);
			presetSelect.onchange = onChangePreset;
			td.appendChild(presetSelect);

			td = document.createElement("td");
			tr.appendChild(td);
			input = document.createElement("input");
			input.type = "button";
			input.className = "sendAgainButton";
			input.value = "send again";
			input.onclick = onChangePreset;
			td.appendChild(input);

			onChangePreset();
		}

		function appendCommandRows(table, commands)
		{
			var i;

			function appendCommandRow(table, command)
			{
				var tr;

				// These are the only commands that need handling here.
				switch(command)
				{
					case CMD.AFTERTOUCH:
						tr = getRow("aftertouch", CMD.AFTERTOUCH, null, null, DEFAULT.AFTERTOUCH);
						sendCommand(CMD.AFTERTOUCH, DEFAULT.AFTERTOUCH);
						break;
					case CMD.CHANNEL_PRESSURE:
						tr = getRow("channel pressure", CMD.CHANNEL_PRESSURE, null, null, DEFAULT.CHANNEL_PRESSURE);
						sendCommand(CMD.CHANNEL_PRESSURE, DEFAULT.CHANNEL_PRESSURE);
						break;
					case CMD.PITCHWHEEL:
						tr = getRow("pitchWheel", CMD.PITCHWHEEL, null, null, DEFAULT.PITCHWHEEL);
						sendCommand(CMD.PITCHWHEEL, DEFAULT.PITCHWHEEL);
						break;
					default:
						break;
				}
				if(tr !== undefined)
				{
					table.appendChild(tr);
				}
			}

			for(i = 0; i < commands.length; ++i)
			{
				appendCommandRow(table, commands[i]);
			}
		}

		function appendControlRows(table, controls)
		{
			function appendTitleControlRow(table)
			{
				var tr = document.createElement("tr"),
				td = document.createElement("td"),
				span = document.createElement("span");

				table.appendChild(tr);
				tr.appendChild(td);
				td.appendChild(span);
				span.innerHTML = "synth's controls:";
				span.className = "boldSubtitle";
			}
			// 3-byte controls
			function appendLongControlRows(table, controls)
			{
				var i, tr, control;

				for(i = 0; i < controls.length; ++i)
				{
					control = controls[i];
					switch(control)
					{
						// These are the only commands (of those currently defined in WebMIDI.constants) that need handling here.
						// Note that not all the standard 3-byte MIDI controllers are currently defined in WebMIDI.constants.
						// If further 3-byte controllers are added, they should also be added to this switch.
						case CTL.PITCHWHEEL_DEVIATION:
							tr = getRow("pitchWheel deviation", null, control, null, DEFAULT.PITCHWHEEL_DEVIATION);
							sendLongControl(control, DEFAULT.PITCHWHEEL_DEVIATION);
							break;
						case CTL.VOLUME:
							tr = getRow("volume", null, control, null, DEFAULT.VOLUME);
							sendLongControl(control, DEFAULT.VOLUME);
							break;
						case CTL.PAN:
							tr = getRow("pan", null, control, null, DEFAULT.PAN);
							sendLongControl(control, DEFAULT.PAN);
							break;
						case CTL.EXPRESSION:
							tr = getRow("expression", null, control, null, DEFAULT.EXPRESSION);
							sendLongControl(control, DEFAULT.EXPRESSION);
							break;
						case CTL.MODWHEEL:
							tr = getRow("modWheel", null, control, null, DEFAULT.GENERIC_MIDI);
							sendLongControl(control, DEFAULT.GENERIC_MIDI);
							break;
						case CTL.TIMBRE:
							tr = getRow("timbre", null, control, null, DEFAULT.GENERIC_MIDI);
							sendLongControl(control, DEFAULT.GENERIC_MIDI);
							break;
						case CTL.BRIGHTNESS:
							tr = getRow("brightness", null, control, null, DEFAULT.GENERIC_MIDI);
							sendLongControl(control, DEFAULT.GENERIC_MIDI);
							break;
						case CTL.EFFECTS:
							tr = getRow("effects", null, control, null, DEFAULT.GENERIC_MIDI);
							sendLongControl(control, DEFAULT.GENERIC_MIDI);
							break;
						case CTL.TREMOLO:
							tr = getRow("tremolo", null, control, null, DEFAULT.GENERIC_MIDI);
							sendLongControl(control, DEFAULT.GENERIC_MIDI);
							break;
						case CTL.CHORUS:
							tr = getRow("chorus", null, control, null, DEFAULT.GENERIC_MIDI);
							sendLongControl(control, DEFAULT.GENERIC_MIDI);
							break;
						case CTL.CELESTE:
							tr = getRow("celeste", null, control, null, DEFAULT.GENERIC_MIDI);
							sendLongControl(control, DEFAULT.GENERIC_MIDI);
							break;
						case CTL.PHASER:
							tr = getRow("phaser", null, control, null, DEFAULT.GENERIC_MIDI);
							sendLongControl(control, DEFAULT.GENERIC_MIDI);
							break;
						default:
							break;
					}
					if(tr !== undefined)
					{
						table.appendChild(tr);
					}
				}
			}
			// 2-byte controls
			function appendShortControlRows(table, controls)
			{
				var i, tr, control;

				for(i = 0; i < controls.length; ++i)
				{
					control = controls[i];
					switch(control)
					{
						// getRow(namestr, command, longControl, shortControl, defaultValue)
						case CTL.ALL_SOUND_OFF:
							tr = getRow("all sound off", null, null, control);
							table.appendChild(tr);
							sendShortControl(control);
							break;
						case CTL.ALL_CONTROLLERS_OFF:
							tr = getRow("all controllers off", null, null, control);
							table.appendChild(tr);
							sendShortControl(control);
							break;
						case CTL.ALL_NOTES_OFF:
							tr = getRow("all notes off", null, null, control);
							table.appendChild(tr);
							sendShortControl(control);
							break;
						default:
							break;
					}
				}
			}

			appendTitleControlRow(table);
			appendLongControlRows(table, controls);
			appendShortControlRows(table, controls);
		}

		inputDefaultsCache.length = 0;

		if(presetSelect === null || presetSelect === undefined)
		{
			appendTitleCommandRow(table);
			appendPresetCommandRow(table, sf2Select[sf2Select.selectedIndex].presetOptions);
		}
		else
		{
			for(i = table.childNodes.length - 1; i > 1; --i) // dont remove the title and preset rows (0 and 1)
			{
				table.removeChild(table.childNodes[i]);
			}
		}

		appendCommandRows(table, synth.commands);

		appendControlRows(table, synth.controls);
	},

	onNoteInputChanged = function()
	{
		var
		noteIndexInput = document.getElementById("noteIndexInput"),
		noteVelocityInput = document.getElementById("noteVelocityInput"),
		index = noteIndexInput.valueAsNumber,
		velocity = noteVelocityInput.valueAsNumber;

		index = midiValue(index);
		velocity = midiValue(velocity);

		noteIndexInput.value = index;
		noteVelocityInput.value = velocity;
	},

	// exported
	onSf2SelectChanged = function()
	{
		var
		synthSelect = document.getElementById("synthSelect"),
		sf2Select = document.getElementById("sf2Select"),
		presetSelect = document.getElementById("presetSelect"),
		synth = synthSelect[synthSelect.selectedIndex].synth,
		soundFont = sf2Select[sf2Select.selectedIndex].soundFont;

		setOptions(presetSelect, sf2Select[sf2Select.selectedIndex].presetOptions);
		presetSelect.selectedIndex = 0;
		onChangePreset();

		setMIDIMessagesControlTable();
		synth.setSoundFont(soundFont);
	},

	// exported. Also used by onSynthSelectChanged()
	onSf2OriginSelectChanged = function()
	{
		var
		sf2OriginSelect = document.getElementById("sf2OriginSelect"),
		sf2Select = document.getElementById("sf2Select");

		setOptions(sf2Select, sf2OriginSelect[sf2OriginSelect.selectedIndex].sf2SelectOptions);

		sf2Select.selectedIndex = 0;
		onSf2SelectChanged();
	},

	// exported. Also used by init()
	onSynthSelectChanged = function()
	{
		function setMonoPolyDivsVisibility()
		{
			var
			synthSelect = document.getElementById("synthSelect"),
			synth = synthSelect[synthSelect.selectedIndex].synth,
			monoSynthInfo = document.getElementById("monoSynthInfo"),
			polySynthInfoAndChannelSelector = document.getElementById("polySynthInfoAndChannelSelector");

			if(synth.isPolyphonic)
			{
				monoSynthInfo.style.display = "none";
				polySynthInfoAndChannelSelector.style.display = "normal";
			}
			else
			{
				monoSynthInfo.style.display = "normal";
				polySynthInfoAndChannelSelector.style.display = "none";
			}
		}

		setMonoPolyDivsVisibility();

		setMIDIMessagesControlTable();
	},

	doNoteOn = function()
	{
		var
		NOTE_ON = WebMIDI.constants.COMMAND.NOTE_ON,
		synthSelect = document.getElementById("synthSelect"),
		channelSelect = document.getElementById("channelSelect"),
		noteIndexInput = document.getElementById("noteIndexInput"),
		noteVelocityInput = document.getElementById("noteVelocityInput"),
		synth, channel, status, noteIndex, noteVelocity, message;

		synth = synthSelect[synthSelect.selectedIndex].synth;
		channel = parseInt(channelSelect[channelSelect.selectedIndex].value, 10);
		status = NOTE_ON + channel;
		noteIndex = noteIndexInput.valueAsNumber;
		noteVelocity = noteVelocityInput.valueAsNumber;

		message = new Uint8Array([status, noteIndex, noteVelocity]);
		synth.send(message, performance.now());  // interface function		
	},

	doNoteOff = function()
	{
		var
		NOTE_ON = WebMIDI.constants.COMMAND.NOTE_ON,
		NOTE_OFF = WebMIDI.constants.COMMAND.NOTE_OFF,
		synthSelect = document.getElementById("synthSelect"),
		channelSelect = document.getElementById("channelSelect"),
		noteIndexInput = document.getElementById("noteIndexInput"),
		noteVelocityInput = document.getElementById("noteVelocityInput"),
		synth, channel, status, noteIndex, noteVelocity, message;

		synth = synthSelect[synthSelect.selectedIndex].synth;
		channel = parseInt(channelSelect[channelSelect.selectedIndex].value, 10);
		status = NOTE_ON + channel;
		noteIndex = noteIndexInput.valueAsNumber;
		noteVelocity = noteVelocityInput.valueAsNumber;

		if(synth.commands.indexOf(NOTE_OFF) >= 0)
		{
			status = NOTE_OFF + channel;
			message = new Uint8Array([status, noteIndex, noteVelocity]);
		}
		else
		{
			status = NOTE_ON + channel;
			message = new Uint8Array([status, noteIndex, 0]);
		}
		synth.send(message, performance.now());
	},

	init = function()
	{
		var
		option,
		synthSelect = document.getElementById("synthSelect"),
		sf2OriginSelect = document.getElementById("sf2OriginSelect"),
		sf2Select = document.getElementById("sf2Select");

		// Returns an array of <option> elements, specific to the origin, to be used
		// in the sf2Select when the corresponding option in the sf2OriginSelect is selected.
		function getSf2SelectOptions(originName)
		{
			var
			so, sf2OriginPathBase, sf2SelectOptions;
			
			// The argument is an array of select options, each of which has its original presets array.
			// This function converts the original presets array to an array of presetOptions, each
			// of which has a bank and patch attribute, and whose innerHTML has been set to bank:patch name.
			function setSf2SelectPresetOptions(sf2SelectOptions)
			{
				var i, j, standardPatchNames = WebMIDI.constants.GeneralMIDIInstrumentNames,
				bank, patch, name, presetOption,
				sf2SelectOption, presetInfo, presetsArray, nPresets, presetOptions, stringArray;

				// num is an integer in range 0..999
				function threePlaceString(num)
				{
					var hundreds = Math.floor(num / 100),
						tens = Math.floor((num - (hundreds * 100)) / 10),
						units = Math.floor(num - (hundreds * 100) - (tens * 10)),
						rval = (hundreds.toString(10)).concat(tens.toString(10), units.toString(10));

					return rval;
				}

				for(i = 0; i < sf2SelectOptions.length; ++i)
				{
					sf2SelectOption = sf2SelectOptions[i];
					sf2SelectOption.disabled = true;
					presetsArray = sf2SelectOption.presets; // the original array
					nPresets = presetsArray.length;					
					presetOptions = [];
					sf2SelectOption.presetOptions = presetOptions;

					for(j = 0; j < nPresets; ++j)
					{
						presetInfo = presetsArray[j];
						if(typeof presetInfo === "number")
						{
							bank = 0;
							patch = presetInfo;
							name = standardPatchNames[patch];
						}
						else if(typeof presetInfo === "string")
						{
							stringArray = presetInfo.split(":");
							bank = parseInt(stringArray[0], 10);
							patch = parseInt(stringArray[1], 10);
							name = stringArray[2];
						}
						else
						{
							throw "Illegal preset info type";
						}
						presetOption = document.createElement("option");
						presetOption.bank = bank;
						presetOption.patch = patch;
						presetOption.innerHTML = threePlaceString(bank).concat(":", threePlaceString(patch), " - ", name);
						presetOptions.push(presetOption);
					}
				}
			}

			// Do the following for each available SoundFont type.
			if(originName === "Arachno Version 1.0")
			{
				sf2OriginPathBase = "soundFonts/Arachno/Arachno1.0selection-";
				sf2SelectOptions = [];

				so = document.createElement("option");
				so.url = sf2OriginPathBase + "grand piano.sf2";
				so.innerHTML = "grand piano"; // the text in the sf2Select option
				so.presets = [0]; // Patch index in bank 0. The standard midi name (grand piano) is set automatically later.
				sf2SelectOptions.push(so);

				so = document.createElement("option");
				so.url = sf2OriginPathBase + "harpsichord.sf2";
				so.innerHTML = "harpsichord"; // the text in the sf2Select
				so.presets = [6]; // Patch index in bank 0. The standard midi name (harpsichord) is set automatically later.
				sf2SelectOptions.push(so);

				so = document.createElement("option");
				so.url = sf2OriginPathBase + "ensemble1.sf2";
				so.innerHTML = "ensemble 1"; // the text in the sf2Select
				so.presets = [0, 6, 8, 12, 32, 60, 70, 73, 122]; // Patch indices in bank 0. The standard midi names are set automatically later. 
				sf2SelectOptions.push(so);

				so = document.createElement("option");
				so.url = sf2OriginPathBase + "tuned percussion1.sf2";
				so.innerHTML = "tuned percussion 1"; // the text in the sf2Select
				so.presets = [8, 9, 10, 11, 12, 13, 14, 24, 104, 105, 107, 108, 114, 117]; // Patch indices in bank 0. The standard midi names are set automatically later.
				sf2SelectOptions.push(so);

				so = document.createElement("option");
				so.url = sf2OriginPathBase + "drumkits1.sf2";
				so.innerHTML = "drum kits 1"; // the text in the sf2Select
				// Standard MIDI names are used for bank 0. If the sf2 file contains presets having
				// banks other than 0, those presets are defined here using a string of the form
				//     <bankIndex>:<patchIndex>:<name>.
				// (Such strings can be mixed with bank 0 patch numbers.),
				so.presets = ["128:0:standard drumkit", "128:127:MT-32 drumkit"];
				sf2SelectOptions.push(so);

				// Converts each so.presets value to an array of presetOptions, each of which has a
				// bank and patch attribute, and whose innerHTML has been set to the preset's name.
				setSf2SelectPresetOptions(sf2SelectOptions);

				// Resets each sf2.presets attribute to an array of {bank:bankIndex, patch:patchIndex, name:name}
				//setSf2Options(sf2s);// Constructs an <option> element for each preset.

			} // end of Arachno
			// add more origins here:
			//else (if originName === "xxx")
			//{

			//}
			return sf2SelectOptions;
		}

		function loadSoundFonts()
		{
			var typeIndex,
				originSelect = document.getElementById("sf2OriginSelect"),
				div2 = document.getElementById("div2");

			function loadSoundFontsOfThisType(selectOptions, typeIndex)
			{
				var
				nFontsOfThisType = selectOptions.length,
				nFontsOfThisTypeLoaded = 0,
				fontIndex = 0,
				soundFontURL = selectOptions[fontIndex].url,
				soundFontName = selectOptions[fontIndex].text,
				soundFontPresets,
				loadLogElem = document.getElementById("loadLog");

				function getSoundFontPresets(presetOptions)
				{
					var i, preset, name, rval = [];

					for(i = 0; i < presetOptions.length; ++i)
					{
						name = presetOptions[i].text.slice(10); // remove the bank and patch info: "000:000 - "
						preset = { name: name, presetIndex: presetOptions[i].patch };
						rval.push(preset);
					}
					return rval;
				}

				// Note that XMLHttpRequest does not work with local files (localhost:).
				// To make it work, run the app from the web (http:).
				function loadSoundFontAsynch()
				{
					var soundFont;

					function onLoad()
					{
						function switchToPage2(div2)
						{
							var
							cursorControlDiv = document.getElementById("cursorControlDiv"),
							div1 = document.getElementById("div1");

							cursorControlDiv.style.cursor = "auto";
							div1.innerHTML = "";
							div2.style.visibility = "visible";
						}

						function loadSynthsWithSoundFont(soundFont)
						{
							var i, synth, synthSelect = document.getElementById("synthSelect");

							for(i = 0; i < synthSelect.options.length; ++i)
							{
								synth = synthSelect.options[i].synth;
								if(synth.setSoundFont !== undefined)
								{
									synth.setSoundFont(soundFont);
								}
							}
						}

						nFontsOfThisTypeLoaded++;
						soundFont.getAttributes();
						selectOptions[fontIndex].soundFont = soundFont;
						selectOptions[fontIndex].disabled = false;
						if(typeIndex === 0 && fontIndex === 0)
						{
							loadSynthsWithSoundFont(soundFont);
							switchToPage2(div2);
						}

						fontIndex++;
						if(fontIndex < nFontsOfThisType)
						{
							soundFontURL = selectOptions[fontIndex].url;
							soundFontName = selectOptions[fontIndex].text;
							soundFontPresets = getSoundFontPresets(selectOptions[fontIndex].presetOptions);
							loadLogElem.innerHTML = "loading the ".concat('"', soundFontName, '" soundFont (', (nFontsOfThisTypeLoaded + 1), "/", nFontsOfThisType, ")...");
							loadSoundFontAsynch();
						}
						else
						{
							loadLogElem.innerHTML = "";
							div2ButtonClick();
						}
					}

					soundFont = new WebMIDI.soundFont.SoundFont(soundFontURL, soundFontName, soundFontPresets, onLoad);
				}

				soundFontPresets = getSoundFontPresets(selectOptions[fontIndex].presetOptions);
				loadSoundFontAsynch();
			}

			for(typeIndex = 0; typeIndex < originSelect.options.length; typeIndex++)
			{
				loadSoundFontsOfThisType(originSelect.options[typeIndex].sf2SelectOptions, typeIndex);
			}
		}

		// Do the following for each available synth
		option = document.createElement("option");
		option.synth = new WebMIDI.jigSf2Synth.JIGSf2Synth();
		option.synth.init();
		option.text = option.synth.name;
		synthSelect.add(option);

		option = document.createElement("option");
		option.synth = new WebMIDI.consoleSf2Synth.ConsoleSf2Synth();
		option.synth.init();
		option.text = option.synth.name;
		synthSelect.add(option);

		// Do the following for each available soundFont origin folder (= soundFont 'type').
		// Add specific soundFonts in the custom).
		option = document.createElement("option");
		option.text = "Arachno Version 1.0";
		option.url = "http://www.arachnosoft.com/main/soundfont.php";
		option.sf2SelectOptions = getSf2SelectOptions(option.text);
		setOptions(sf2Select, option.sf2SelectOptions);		

		sf2OriginSelect.add(option);
		// Add more soundFont origin folders here...

		synthSelect.selectedIndex = 0;
		sf2OriginSelect.selectedIndex = 0;
		
		onSynthSelectChanged();

		loadSoundFonts();
	},

	publicAPI =
    {
    	gitHubButtonClick: gitHubButtonClick,

    	div2ButtonClick: div2ButtonClick,


    	synthWebsiteButtonClick: synthWebsiteButtonClick,
    	soundFontWebsiteButtonClick: soundFontWebsiteButtonClick,

    	onSynthSelectChanged: onSynthSelectChanged,
    	onSf2OriginSelectChanged: onSf2OriginSelectChanged,
    	onSf2SelectChanged: onSf2SelectChanged,
    	onNoteInputChanged: onNoteInputChanged,

    	doNoteOn: doNoteOn,
    	doNoteOff: doNoteOff
    };
	// end var

	init();

	return publicAPI;

}(document));
