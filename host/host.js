/*
*  copyright 2015 James Ingram
*  http://james-ingram-act-two.de/
*
*  Code licensed under MIT
*
*  This file contains the implementation of the WebMIDISynthHost's GUI. 
*  The WebMIDISynthHost can host one or more WebMIDISynths and use one
*  or more SoundFonts.
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

	getElem = function(elemID)
	{
		return document.getElementById(elemID);
	},

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

	waitingForOtherFontsButtonClick = function()
	{
		getElem("synthSelectDivButtonDiv").style.display = "none";
		getElem("synthInfoDiv").style.display = "block";
		getElem("waitingForFirstFontDiv").style.display = "none";
		getElem("waitingForOtherFontsDiv").style.display = "none";
		getElem("controlsDiv").style.display = "block";
	},

	synthWebsiteButtonClick = function()
	{
		var
		synthSelect = getElem("synthSelect"),
		synth = synthSelect[synthSelect.selectedIndex].synth;
		openInNewTab(synth.url);
	},

	soundFontWebsiteButtonClick = function()
	{
		var sf2OriginSelect = getElem("sf2OriginSelect");

		openInNewTab(sf2OriginSelect[sf2OriginSelect.selectedIndex].url);
	},

	// called by onSf2SelectChanged and by "send again" button.
	onChangePreset = function()
	{
		var CMD = WebMIDI.constants.COMMAND, CTL = WebMIDI.constants.CONTROL,
			synthSelect = getElem("synthSelect"),
			channelSelect = getElem("channelSelect"),
			presetSelect = getElem("presetSelect"),
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

	setCommandsAndControlsDivs = function()
	{
		var CMD = WebMIDI.constants.COMMAND,
		    CTL = WebMIDI.constants.CONTROL,
			DEFAULT = WebMIDI.constants.DEFAULT,
			hasStdCommands, hasControls,
			synthSelect = getElem("synthSelect"),
			synth = synthSelect[synthSelect.selectedIndex].synth,
			channelSelect = getElem("channelSelect"),
			sf2Select = getElem("sf2Select"),
			commandsDiv = getElem("commandsDiv"),
			commandsTitleDiv = getElem("commandsTitleDiv"),
			commandsTable = getElem("commandsTable"),
			controlsDiv = getElem("controlsDiv"),
			controlsTitleDiv = getElem("controlsTitleDiv"),
			controlsTable = getElem("controlsTable");

		function emptyTables(commandsTable, controlsTable)
		{
			var i;

			function empty(table)
			{
				for(i = table.childNodes.length - 1; i >= 0; --i)
				{
					table.removeChild(table.childNodes[i]);
				}
			}

			empty(commandsTable);
			empty(controlsTable);
		}

		function sendCommand(command, data1, data2)
		{
			var synth = synthSelect[synthSelect.selectedIndex].synth,
				channelIndex = parseInt(channelSelect[channelSelect.selectedIndex].value, 10),
				status = command + channelIndex,
				message;

			switch(command)
			{
				case CMD.CUSTOMCONTROL_CHANGE:
					message = new Uint8Array([status, data1, data2]); // data1 is customControlIndex, data2 is the control's value
					break;
				case CMD.CHANNEL_PRESSURE:
					message = new Uint8Array([status, data1]);
					break;
				case CMD.PITCHWHEEL:
					// This host uses the same 7-bit MSB (0..127) for data1 and data2.
					// Doing this means that the available pitchWheel values are equally spaced
					// and span the complete pitchWheel deviation range.
					message = new Uint8Array([status, data1, data1]);
					break;
				default:
					throw "Error: Not a command, or attempt to set the value of a command that has no value.";
			}
			synth.send(message, performance.now());
		}

		function sendLongControl(controlIndex, value)
		{
			var synth = synthSelect[synthSelect.selectedIndex].synth,
				channelIndex = parseInt(channelSelect[channelSelect.selectedIndex].value, 10),
				status = CMD.CONTROL_CHANGE + channelIndex,
				message = new Uint8Array([status, controlIndex, value]);

			synth.send(message, performance.now());
		}

		function sendLongCustomControl(controlIndex, value)
		{
			var synth = synthSelect[synthSelect.selectedIndex].synth,
				channelIndex = parseInt(channelSelect[channelSelect.selectedIndex].value, 10),
				status = CMD.CUSTOMCONTROL_CHANGE + channelIndex,
				message = new Uint8Array([status, controlIndex, value]);

			synth.send(message, performance.now());
		}

		function sendShortControl(controlIndex)
		{
			var synth = synthSelect[synthSelect.selectedIndex].synth,
				channelIndex = parseInt(channelSelect[channelSelect.selectedIndex].value, 10),
				status = CMD.CONTROL_CHANGE + channelIndex,
				message = new Uint8Array([status, controlIndex]);

			function resetHostGUI()
			{
				var i, inputID, defaultValue, elem;

				for(i = 0; i < inputDefaultsCache.length; ++i)
				{
					inputID = inputDefaultsCache[i].inputID;
					defaultValue = inputDefaultsCache[i].defaultValue;
					elem = getElem(inputID);
					elem.value = defaultValue;
				}
			}

			if(controlIndex === WebMIDI.constants.CONTROL.ALL_CONTROLLERS_OFF)
			{
				resetHostGUI();
			}
			synth.send(message, performance.now());
		}

		function sendShortCustomControl(controlIndex)
		{
			var synth = synthSelect[synthSelect.selectedIndex].synth,
				channelIndex = parseInt(channelSelect[channelSelect.selectedIndex].value, 10),
				status = CMD.CUSTOMCONTROL_CHANGE + channelIndex,
				message = new Uint8Array([status, controlIndex]);

			synth.send(message, performance.now());
		}

		function getRow(namestr, command, longControl, shortControl, sendFunction, defaultValue, nDiscreteItems)
		{
			var tr = document.createElement("tr"),
			td, input, button;

			function onInputChanged(event)
			{
				var numberInput = event.currentTarget,
					send = numberInput.sendFunction;

				if(numberInput.command !== null && numberInput.command !== undefined)
				{
					send(numberInput.command, numberInput.valueAsNumber);
				}
				else if(numberInput.longControl !== null && numberInput.longControl !== undefined)
				{
					send(numberInput.longControl, numberInput.valueAsNumber);
				}
			}

			function onSendAgainButtonClick(event)
			{
				var inputID = event.currentTarget.inputID,
					numberInput = getElem(inputID),
					send = numberInput.sendFunction;

				if(numberInput.command !== null && numberInput.command !== undefined)
				{
					send(numberInput.command, numberInput.valueAsNumber);
				}
				else if(numberInput.longControl !== null && numberInput.longControl !== undefined)
				{
					send(numberInput.longControl, numberInput.valueAsNumber);
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
				if(command !== null || longControl !== null)
				{
					input = document.createElement("input");
					//<input type="number" name="quantity" min="0" max="127">
					input.type = "number";
					input.name = "value";
					input.id = namestr.concat("_numberInput");
					input.value = defaultValue;
					input.className = "number";
					input.min = 0;
					if(nDiscreteItems === undefined)
					{
						input.max = 127;
					}
					else
					{
						input.max = nDiscreteItems - 1;
					}
					if(command !== null)
					{
						input.command = command;
					}
					else
					{
						input.longControl = longControl;
					}
					input.onchange = onInputChanged;
					input.sendFunction = sendFunction;
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
			}
			else // short control
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

		// Returns true if the synth defines one or more of the following commands:
		// PATCH_CHANGE, CHANNEL_PRESSURE, PITCHWHEEL
		function hasStandardCommands(commands)
		{
			var i, rval = false;
			if(commands !== undefined)
			{
				for(i = 0; i < commands.length; ++i)
				{
					if(commands[i] === CMD.PATCH_CHANGE || commands[i] === CMD.CHANNEL_PRESSURE || commands[i] === CMD.PITCHWHEEL)
					{
						rval = true;
						break;
					}
				}
			}

			return rval;
		}

		function appendSoundFontPresetCommandRow(table, presetOptions)
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

			function appendCommandRow(table, command, sendCommand)
			{
				var tr;

				// These are the only commands that need handling here.
				switch(command)
				{
					case CMD.CHANNEL_PRESSURE:
						tr = getRow("channel pressure", CMD.CHANNEL_PRESSURE, null, null, sendCommand, DEFAULT.CHANNEL_PRESSURE);
						sendCommand(CMD.CHANNEL_PRESSURE, DEFAULT.CHANNEL_PRESSURE);
						break;
					case CMD.PITCHWHEEL:
						tr = getRow("pitchWheel", CMD.PITCHWHEEL, null, null, sendCommand, DEFAULT.PITCHWHEEL);
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
				appendCommandRow(table, commands[i], sendCommand);
			}
		}

		function appendControlRows(table, controls)
		{
			var i, control;

			// 3-byte standard MIDI controls
			function appendLongStandardMIDIControlRow(table, control, sendLongControl)
			{
				var tr;

				switch(control)
				{
					// These are the only commands (of those currently defined in WebMIDI.constants) that need handling here.
					// Note that not all the standard 3-byte MIDI controllers are currently defined in WebMIDI.constants.
					// If further 3-byte controllers are added, they should also be added to this switch.
					case CTL.PITCHWHEEL_DEVIATION:
						tr = getRow("pitchWheel deviation", null, control, null, sendLongControl, DEFAULT.PITCHWHEEL_DEVIATION);
						sendLongControl(control, DEFAULT.PITCHWHEEL_DEVIATION);
						break;
					case CTL.VOLUME:
						tr = getRow("volume", null, control, null, sendLongControl, DEFAULT.VOLUME);
						sendLongControl(control, DEFAULT.VOLUME);
						break;
					case CTL.PAN:
						tr = getRow("pan", null, control, null, sendLongControl, DEFAULT.PAN);
						sendLongControl(control, DEFAULT.PAN);
						break;
					case CTL.EXPRESSION:
						tr = getRow("expression", null, control, null, sendLongControl, DEFAULT.EXPRESSION);
						sendLongControl(control, DEFAULT.EXPRESSION);
						break;
					case CTL.MODWHEEL:
						tr = getRow("modWheel", null, control, null, sendLongControl, DEFAULT.GENERIC_MIDI);
						sendLongControl(control, DEFAULT.GENERIC_MIDI);
						break;
					case CTL.TIMBRE:
						tr = getRow("timbre", null, control, null, sendLongControl, DEFAULT.GENERIC_MIDI);
						sendLongControl(control, DEFAULT.GENERIC_MIDI);
						break;
					case CTL.BRIGHTNESS:
						tr = getRow("brightness", null, control, null, sendLongControl, DEFAULT.GENERIC_MIDI);
						sendLongControl(control, DEFAULT.GENERIC_MIDI);
						break;
					case CTL.EFFECTS:
						tr = getRow("effects", null, control, null, sendLongControl, DEFAULT.GENERIC_MIDI);
						sendLongControl(control, DEFAULT.GENERIC_MIDI);
						break;
					case CTL.TREMOLO:
						tr = getRow("tremolo", null, control, null, sendLongControl, DEFAULT.GENERIC_MIDI);
						sendLongControl(control, DEFAULT.GENERIC_MIDI);
						break;
					case CTL.CHORUS:
						tr = getRow("chorus", null, control, null, sendLongControl, DEFAULT.GENERIC_MIDI);
						sendLongControl(control, DEFAULT.GENERIC_MIDI);
						break;
					case CTL.CELESTE:
						tr = getRow("celeste", null, control, null, sendLongControl, DEFAULT.GENERIC_MIDI);
						sendLongControl(control, DEFAULT.GENERIC_MIDI);
						break;
					case CTL.PHASER:
						tr = getRow("phaser", null, control, null, sendLongControl, DEFAULT.GENERIC_MIDI);
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
			// 2-byte standard MIDI controls
			function appendShortStandardMIDIControlRow(table, control, sendShortControl)
			{
				var controlName, tr;

				switch(control)
				{
					case CTL.ALL_SOUND_OFF:
						controlName = "all sound off";
						break;
					case CTL.ALL_CONTROLLERS_OFF:
						controlName = "all controllers off";
						break;
					case CTL.ALL_NOTES_OFF:
						controlName = "all notes off";
						break;
					default:
						throw "Unexpected control.";
				}
				tr = getRow(controlName, null, null, control, sendShortControl);
				table.appendChild(tr);
				sendShortControl(control);
			}

			// 3-byte custom controls
			function appendLongCustomControlRow(table, control, sendLongCustomControl)
			{
				var tr;

				tr = getRow(control.name, null, control.index, null, sendLongCustomControl, control.defaultValue, control.nDiscreteItems);
				sendLongCustomControl(control.index, control.defaultValue);
				if(tr !== undefined)
				{
					table.appendChild(tr);
				}
			}
			// 2-byte custom controls
			function appendShortCustomControlRow(table, control, sendShortCustomControl)
			{
				var tr;

				tr = getRow(control.name, null, null, control.index, sendShortCustomControl);
				sendShortCustomControl(control.index);
				if(tr !== undefined)
				{
					table.appendChild(tr);
				}
			}

			for(i = 0; i < controls.length; ++i)
			{
				control = controls[i];
				if(typeof control === "number")
				{
					if(control === CTL.ALL_SOUND_OFF || control === CTL.ALL_CONTROLLERS_OFF || control === CTL.ALL_NOTES_OFF)
					{
						appendShortStandardMIDIControlRow(table, control, sendShortControl);
					}
					else
					{
						appendLongStandardMIDIControlRow(table, control, sendLongControl);
					}		
				}
				else
				{
					if(control.defaultValue === undefined)
					{
						appendShortCustomControlRow(table, control, sendShortCustomControl);
					}
					else
					{
						appendLongCustomControlRow(table, control, sendLongCustomControl);
					}				
				}
			}
		}

		inputDefaultsCache.length = 0;

		emptyTables(commandsTable, controlsTable);

		hasStdCommands = hasStandardCommands(synth.commands);
		hasControls = (synth.controls !== undefined && synth.controls.length > 0);

		if(hasStdCommands)
		{
			commandsDiv.style.display = "block";
			commandsTitleDiv.style.display = "block";
			commandsTable.style.display = "table";

			if(synth.commands.indexOf(CMD.PATCH_CHANGE) >= 0)
			{
				if(synth.setSoundFont !== undefined)
				{
					appendSoundFontPresetCommandRow(commandsTable, sf2Select[sf2Select.selectedIndex].presetOptions);
				}
				// TODO handle synths that have presets, but don't use soundFonts, here
			}
			appendCommandRows(commandsTable, synth.commands);
		}
		else
		{
			commandsDiv.style.display = "none";
			commandsTitleDiv.style.display = "none";
			commandsTable.style.display = "none";
		}

		if(hasControls)
		{
			controlsDiv.style.display = "block";
			controlsTitleDiv.style.display = "block";
			controlsTable.style.display = "table";

			appendControlRows(controlsTable, synth.controls);
		}
		else
		{
			controlsDiv.style.display = "none";
			controlsTitleDiv.style.display = "none";
			controlsTable.style.display = "none";
		}
	},

	// exported
	onSf2SelectChanged = function()
	{
		var
		synthSelect = getElem("synthSelect"),
		sf2Select = getElem("sf2Select"),
		presetSelect = getElem("presetSelect"),
		synth = synthSelect[synthSelect.selectedIndex].synth,
		soundFont = sf2Select[sf2Select.selectedIndex].soundFont;

		setOptions(presetSelect, sf2Select[sf2Select.selectedIndex].presetOptions);
		presetSelect.selectedIndex = 0;
		onChangePreset();

		setCommandsAndControlsDivs();

		synth.setSoundFont(soundFont);
	},

	// exported. Also used by onSynthSelectChanged()
	onSf2OriginSelectChanged = function()
	{
		var
		sf2OriginSelect = getElem("sf2OriginSelect"),
		sf2Select = getElem("sf2Select");

		setOptions(sf2Select, sf2OriginSelect[sf2OriginSelect.selectedIndex].sf2SelectOptions);

		sf2Select.selectedIndex = 0;
		onSf2SelectChanged();
	},

	// exported. Also used by init()
	onSynthSelectChanged = function()
	{
		var
		synthSelect = getElem("synthSelect"),
		synth = synthSelect[synthSelect.selectedIndex].synth;

		function setMonoPolyDisplay(synth)
		{
			var
			synthInfoDiv = getElem("synthInfoDiv"),
			singleChannelSynthInfo = getElem("singleChannelSynthInfo"),
			multiChannelSynthInfo = getElem("multiChannelSynthInfo");

			if(synth.isMultiChannel)
			{
				singleChannelSynthInfo.style.display = "none";
				multiChannelSynthInfo.style.display = "table-row";
			}
			else
			{
				singleChannelSynthInfo.style.display = "table-row";
				multiChannelSynthInfo.style.display = "none";
			}
			synthInfoDiv.style.display = "block";
		}

		function setSoundFontTableDisplay(synth)
		{
			var
			soundFontDiv = getElem("soundFontDiv"),
			soundFontTable1 = getElem("soundFontTable1"),
			soundFontTable2 = getElem("soundFontTable2");

			if(synth.setSoundFont === undefined)
			{
				soundFontTable1.style.display = "none";
				soundFontTable2.style.display = "none";
				soundFontDiv.style.display = "none";
			}
			else
			{
				soundFontTable1.style.display = "block";
				soundFontTable2.style.display = "block";
				soundFontDiv.style.display = "block";
			}	
		}

		synthSelect.onchange = onSynthSelectChanged; // activated by synthSelectDivButton 

		getElem("synthSelectDivButtonDiv").style.display = "none";

		setMonoPolyDisplay(synth);

		setSoundFontTableDisplay(synth);

		setCommandsAndControlsDivs();

		if(synth.isPolyphonic === true)
		{
			getElem("noteDiv1").style.display = "none";
			getElem("notesDiv2").style.display = "block";
		}
		else
		{
			getElem("noteDiv1").style.display = "block";
			getElem("notesDiv2").style.display = "none";
		}
	},

	noteCheckboxClicked = function()
	{
		var
		note1Checkbox = getElem("sendNote1Checkbox"),
		note2Checkbox = getElem("sendNote2Checkbox");

		if((!note1Checkbox.checked) && (!note2Checkbox.checked))
		{
			note2Checkbox.checked = true;			
		}
	},

	sendNoteOn = function(noteIndexInput, noteVelocityInput)
	{
		var
			NOTE_ON = WebMIDI.constants.COMMAND.NOTE_ON,
			synthSelect = getElem("synthSelect"),
			channelSelect = getElem("channelSelect"),
			synth, channel, status, noteIndex, noteVelocity, message;

		synth = synthSelect[synthSelect.selectedIndex].synth;
		channel = parseInt(channelSelect[channelSelect.selectedIndex].value, 10);
		status = NOTE_ON + channel;
		noteIndex = noteIndexInput.valueAsNumber;
		noteVelocity = noteVelocityInput.valueAsNumber;

		message = new Uint8Array([status, noteIndex, noteVelocity]);
		synth.send(message, performance.now());  // interface function		
	},

	sendNoteOff = function(noteIndexInput, noteVelocityInput)
	{
		var
		NOTE_ON = WebMIDI.constants.COMMAND.NOTE_ON,
		NOTE_OFF = WebMIDI.constants.COMMAND.NOTE_OFF,
		synthSelect = getElem("synthSelect"),
		channelSelect = getElem("channelSelect"),
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

	doNoteOn = function()
	{
		var
		noteIndexInput = getElem("noteDiv1IndexInput"),
		noteVelocityInput = getElem("noteDiv1VelocityInput");
		
		sendNoteOn(noteIndexInput, noteVelocityInput);		
	},

	doNoteOff = function()
	{
		var
		noteIndexInput = getElem("noteDiv1IndexInput"),
		noteVelocityInput = getElem("noteDiv1VelocityInput");

		sendNoteOff(noteIndexInput, noteVelocityInput);
	},

	doNotesOn = function()
	{
		var
		note1Checkbox = getElem("sendNote1Checkbox"),
		note1IndexInput = getElem("notesDiv2IndexInput1"),
		note1VelocityInput = getElem("notesDiv2VelocityInput1"),
		note2Checkbox = getElem("sendNote2Checkbox"),
		note2IndexInput = getElem("notesDiv2IndexInput2"),
		note2VelocityInput = getElem("notesDiv2VelocityInput2");

		if(note1Checkbox.checked)
		{
			sendNoteOn(note1IndexInput, note1VelocityInput);
		}
		if(note2Checkbox.checked)
		{
			sendNoteOn(note2IndexInput, note2VelocityInput);
		}
	},

	doNotesOff = function()
	{
		var
		note1Checkbox = getElem("sendNote1Checkbox"),
		note1IndexInput = getElem("notesDiv2IndexInput1"),
		note1VelocityInput = getElem("notesDiv2VelocityInput1"),
		note2Checkbox = getElem("sendNote2Checkbox"),
		note2IndexInput = getElem("notesDiv2IndexInput2"),
		note2VelocityInput = getElem("notesDiv2VelocityInput2");

		if(note1Checkbox.checked)
		{
			sendNoteOff(note1IndexInput, note1VelocityInput);
		}
		if(note2Checkbox.checked)
		{
			sendNoteOff(note2IndexInput, note2VelocityInput);
		}
	},

	init = function()
	{
		var
		option,
		synthSelect = getElem("synthSelect"),
		sf2OriginSelect = getElem("sf2OriginSelect"),
		sf2Select = getElem("sf2Select");

		function setInitialDivsDisplay()
		{
			getElem("synthSelectDiv").style.display = "block";
			getElem("synthSelectDivButtonDiv").style.display = "block";
			getElem("synthInfoDiv").style.display = "none";
			getElem("waitingForFirstFontDiv").style.display = "none";
			getElem("waitingForOtherFontsDiv").style.display = "none";
			getElem("soundFontDiv").style.display = "none";
			getElem("commandsDiv").style.display = "none";
			getElem("controlsDiv").style.display = "none";
			getElem("noteDiv1").style.display = "none";
			getElem("notesDiv2").style.display = "none";
		}

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
				sf2OriginPathBase = "http://james-ingram-act-two.de/open-source/WebMIDISynthHost/soundFonts/Arachno/Arachno1.0selection-";
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
				synthSelect = getElem("synthSelect"),
				cursorControlDiv = getElem("cursorControlDiv"),
				originSelect = getElem("sf2OriginSelect"),
				waitingForFirstFontDiv = getElem("waitingForFirstFontDiv"),
				waitingForOtherFontsDiv = getElem("waitingForOtherFontsDiv");

			function loadSoundFontsOfThisType(selectOptions, typeIndex)
			{
				var
				nFontsOfThisType = selectOptions.length,
				nFontsOfThisTypeLoaded = 0,
				fontIndex = 0,
				soundFontURL = selectOptions[fontIndex].url,
				soundFontName = selectOptions[fontIndex].text,
				presetIndices,
				loadLogElem = getElem("loadLog");

				function getPresetIndices(presetOptions)
				{
					var i, rval = [];

					for(i = 0; i < presetOptions.length; ++i)
					{
						rval.push(presetOptions[i].patch);
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
						function switchToWaitingForOtherFontsDiv()
						{
							if(waitingForFirstFontDiv.style.display !== "none")
							{
								cursorControlDiv.style.cursor = "auto";
								waitingForFirstFontDiv.style.display = "none";
								waitingForOtherFontsDiv.style.display = "block";
							}
						}

						function loadSynthsWithSoundFont(soundFont)
						{
							var i, synth;

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
						soundFont.init();
						selectOptions[fontIndex].soundFont = soundFont;
						selectOptions[fontIndex].disabled = false;
						if(typeIndex === 0 && fontIndex === 0)
						{
							loadSynthsWithSoundFont(soundFont);
							switchToWaitingForOtherFontsDiv();
						}

						fontIndex++;
						if(fontIndex < nFontsOfThisType)
						{
							soundFontURL = selectOptions[fontIndex].url;
							soundFontName = selectOptions[fontIndex].text;
							presetIndices = getPresetIndices(selectOptions[fontIndex].presetOptions);
							loadLogElem.innerHTML = "loading the ".concat('"', soundFontName, '" soundFont (', (nFontsOfThisTypeLoaded + 1), "/", nFontsOfThisType, ")...");
							loadSoundFontAsynch();
						}
						else
						{
							loadLogElem.innerHTML = "";
							if(waitingForOtherFontsDiv.style.display === "block")
							{
								waitingForOtherFontsButtonClick();
							}
						}
					}

					soundFont = new WebMIDI.soundFont.SoundFont(soundFontURL, soundFontName, presetIndices, onLoad);
				}

				presetIndices = getPresetIndices(selectOptions[fontIndex].presetOptions);
				loadSoundFontAsynch();
			}

			for(typeIndex = 0; typeIndex < originSelect.options.length; typeIndex++)
			{
				loadSoundFontsOfThisType(originSelect.options[typeIndex].sf2SelectOptions, typeIndex);
			}
		}

		setInitialDivsDisplay();

		// Do the following for each available synth
		option = document.createElement("option");
		option.synth = new WebMIDI.cwMIDISynth.CWMIDISynth();
		option.synth.init();
		option.text = option.synth.name;
		synthSelect.add(option);

		option = document.createElement("option");
		option.synth = new WebMIDI.cwMonosynth.CWMonosynth();
		option.synth.init();
		option.text = option.synth.name;
		synthSelect.add(option);

		option = document.createElement("option");
		option.synth = new WebMIDI.sf2Synth1.Sf2Synth1();
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

		loadSoundFonts();
	},

	publicAPI =
    {
    	gitHubButtonClick: gitHubButtonClick,

    	onSynthSelectChanged: onSynthSelectChanged,
    	waitingForOtherFontsButtonClick: waitingForOtherFontsButtonClick,

    	synthWebsiteButtonClick: synthWebsiteButtonClick,
    	soundFontWebsiteButtonClick: soundFontWebsiteButtonClick,

    	onSf2OriginSelectChanged: onSf2OriginSelectChanged,
    	onSf2SelectChanged: onSf2SelectChanged,

    	noteCheckboxClicked: noteCheckboxClicked,

    	doNoteOn: doNoteOn,
    	doNoteOff: doNoteOff,

    	doNotesOn: doNotesOn,
    	doNotesOff: doNotesOff
    };
	// end var

	init();

	return publicAPI;

}(document));
