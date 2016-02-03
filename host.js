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

/*global WebMIDI, window,  document, performance */

WebMIDI.namespace('WebMIDI.host');

WebMIDI.host = (function(document)
{
	"use strict";

	var
	previousNormalChannel = 0, // used when setting/unsetting the percussion channel 9.
	commandInputIDs = [], // used by AllControllersOff control
	longInputControlIDs = [], // used by AllControllersOff control
	firstSoundFontLoaded = false,

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
		channel = channelSelect.selectedIndex;
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
		data1 = CTL.BANK;
		message = new Uint8Array([status, data1, bank]);
		synth.send(message, performance.now());

		status = CMD.PATCH + channel;
		message = new Uint8Array([status, patch]);
		synth.send(message, performance.now());
	},

	setOptions = function(select, options)
	{
		var i;

		for(i = select.options.length - 1; i >= 0; --i)
		{
			select.remove(i);
		}

		for(i = 0; i < options.length; ++i)
		{
			select.add(options[i]);
		}

		select.selectedIndex = 0;
	},

	sendCommand = function(command, data1, data2)
	{
		var CMD = WebMIDI.constants.COMMAND,
			synthSelect = getElem("synthSelect"),
			synth = synthSelect[synthSelect.selectedIndex].synth,
			channelSelect = getElem("channelSelect"),
			channelIndex = parseInt(channelSelect[channelSelect.selectedIndex].value, 10),
			status = command + channelIndex,
			message;

		switch(command)
		{
			case CMD.NOTE_ON:
			case CMD.NOTE_OFF:
			case CMD.CONTROL_CHANGE:
			case CMD.AFTERTOUCH:
				message = new Uint8Array([status, data1, data2]);
				break;
			case CMD.PATCH:
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
				console.warn("Error: Not a command, or attempt to set the value of a command that has no value.");
		}
		synth.send(message, performance.now());
	},

	setCommandsAndControlsDivs = function()
	{
		var CMD = WebMIDI.constants.COMMAND,
			synthSelect = getElem("synthSelect"),
			synth = synthSelect[synthSelect.selectedIndex].synth,
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

		// sends aftertouch to the notes currently set in the notes controls
		function sendAftertouch(pressure)
		{
			var
			singleNoteIndex = getElem("noteDiv1IndexInput").valueAsNumber,
			note1Checkbox = getElem("sendNote1Checkbox"),
			note1Index = getElem("notesDiv2IndexInput1").valueAsNumber,
			note2Checkbox = getElem("sendNote2Checkbox"),
			note2Index = getElem("notesDiv2IndexInput2").valueAsNumber;

			if(getElem("notesDiv2").display === "none")
			{
				sendCommand(CMD.AFTERTOUCH, singleNoteIndex, pressure);
			}
			else
			{
				if(note1Checkbox.checked)
				{
					sendCommand(CMD.AFTERTOUCH, note1Index, pressure);
				}
				if(note2Checkbox.checked)
				{
					sendCommand(CMD.AFTERTOUCH, note2Index, pressure);
				}
			}
		}

		function sendLongControl(controlIndex, value)
		{
			sendCommand(CMD.CONTROL_CHANGE, controlIndex, value);
		}

		function sendShortControl(controlIndex)
		{
			var
			synthSelect = getElem("synthSelect"),
			synth = synthSelect[synthSelect.selectedIndex].synth,
			presetSelect = getElem("presetSelect"),
			commandDefaultValue = WebMIDI.constants.commandDefaultValue, // function
			commands = synth.commands;

			function resetHostGUI()
			{
				var i, inputID, numberInputElem;

				if(presetSelect !== null)
				{	
					presetSelect.selectedIndex = 0;
				}

				for(i = 0; i < commandInputIDs.length; ++i)
				{
					inputID = commandInputIDs[i];
					numberInputElem = getElem(inputID);
					numberInputElem.value = numberInputElem.defaultValue;
				}

				for(i = 0; i < longInputControlIDs.length; ++i)
				{
					inputID = longInputControlIDs[i];
					numberInputElem = getElem(inputID);
					numberInputElem.value = numberInputElem.uControl.defaultValue;
				}
			}

			if(controlIndex === WebMIDI.constants.CONTROL.ALL_CONTROLLERS_OFF)
			{
				resetHostGUI();

				if(commands.indexOf(CMD.PATCH) >= 0)
				{
					if(presetSelect !== null)
					{
						sendCommand(CMD.PATCH, presetSelect[0].patch);
					}
					else
					{
						sendCommand(CMD.PATCH, commandDefaultValue(CMD.PATCH));
					}
				}

				if(commands.indexOf(CMD.CHANNEL_PRESSURE) >= 0)
				{
					sendCommand(CMD.CHANNEL_PRESSURE, commandDefaultValue(CMD.CHANNEL_PRESSURE));
				}
				if(commands.indexOf(CMD.PITCHWHEEL) >= 0)
				{
					sendCommand(CMD.PITCHWHEEL, commandDefaultValue(CMD.PITCHWHEEL));
				}
				if(commands.indexOf(CMD.AFTERTOUCH) >= 0)
				{
					sendAftertouch(commandDefaultValue(CMD.AFTERTOUCH));
				}
			}

			sendCommand(CMD.CONTROL_CHANGE, controlIndex);
		}

		// Returns true if the synth implements one or more of the following commands:
		// PATCH, CHANNEL_PRESSURE, PITCHWHEEL, AFTERTOUCH.
		// These are the only commands to be displayed in the Commands Div.
		// None of these commands MUST be implemented, so hasCommandsDiv() may return false. 
		// Other commands:
		// If CONTROL_CHANGE is implemented, the Controls Div will be displayed.										  ccs
		// NOTE_ON MUST be implemented, otherwise the host can't play anything.
		// The Notes Div is therefore always displayed.
		// Whether the synth implements NOTE_OFF or not only needs to be determined inside the sendNoteOff function.
		function hasCommandsDiv(commands)
		{
			var i, rval = false;
			if(commands !== undefined)
			{
				for(i = 0; i < commands.length; ++i)
				{
					if(commands[i] === CMD.PATCH
					|| commands[i] === CMD.CHANNEL_PRESSURE
					|| commands[i] === CMD.PITCHWHEEL
					|| commands[i] === CMD.AFTERTOUCH)
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

		function appendCommandRows(table, synthCommands)
		{
			var i, command, row = 0;

			function appendCommandRow(table, command, i)
			{
				var tr, 
				commandDefaultValue = WebMIDI.constants.commandDefaultValue; // function;

				function getCommandRow(namestr, command, defaultValue, i)
				{
					var
					tr = document.createElement("tr"),
					td, input, button;

					function sendMessageFromInput(numberInput)
					{
						var value = numberInput.valueAsNumber;

						if(numberInput.command === CMD.AFTERTOUCH)
						{
							sendAftertouch(value);
						}
						else // can only be CHANNEL_PRESSURE or PITCHWHEEL
						{
							sendCommand(numberInput.command, value);
						}
					}

					function onInputChanged(event)
					{
						var numberInput = event.currentTarget;

						sendMessageFromInput(numberInput);
					}

					function onSendAgainButtonClick(event)
					{
						var inputID = event.currentTarget.inputID,
							numberInput = getElem(inputID);

						sendMessageFromInput(numberInput);
					}

					td = document.createElement("td");
					tr.appendChild(td);
					td.className = "left";
					td.innerHTML = namestr;

					td = document.createElement("td");
					tr.appendChild(td);

					input = document.createElement("input");
					input.type = "number";
					input.name = "value";
					input.id = "commandNumberInput" + i.toString(10);
					input.min = 0;
					input.max = 127;
					input.value = defaultValue;
					input.command = command;
					input.defaultValue = defaultValue;
					input.className = "number";
					input.onchange = onInputChanged;
					td.appendChild(input);

					button = document.createElement("input");
					button.type = "button";
					button.className = "sendAgainButton";
					button.value = "send again"; 
					button.inputID = input.id;
					button.onclick = onSendAgainButtonClick;
					td.appendChild(button);

					commandInputIDs.push(input.id);

					return tr;
				}

				// These are the only commands that need handling here.
				switch(command)
				{
					case CMD.PATCH:
						tr = getCommandRow("patch", CMD.PATCH, commandDefaultValue(CMD.PATCH), i);
						break;
					case CMD.CHANNEL_PRESSURE:
						tr = getCommandRow("channel pressure", CMD.CHANNEL_PRESSURE, commandDefaultValue(CMD.CHANNEL_PRESSURE), i);
						break;
					case CMD.PITCHWHEEL:
						tr = getCommandRow("pitchWheel", CMD.PITCHWHEEL, commandDefaultValue(CMD.PITCHWHEEL), i);
						break;
					case CMD.AFTERTOUCH:
						tr = getCommandRow("aftertouch", CMD.AFTERTOUCH, commandDefaultValue(CMD.AFTERTOUCH), i);
						break;
					default:
						break;
				}
				if(tr !== undefined)
				{
					table.appendChild(tr);
				}
			}

			for(i = 0; i < synthCommands.length; ++i)
			{
				command = synthCommands[i];
				if(command === CMD.PATCH)
				{
					if(synth.supportsGeneralMIDI)
					{
						appendSoundFontPresetCommandRow(commandsTable, sf2Select[sf2Select.selectedIndex].presetOptions);
						row++;
					}
					else
					{
						appendCommandRow(table, synthCommands[i], row++);
					}
				}
				else
				if(command === CMD.CHANNEL_PRESSURE
				|| command === CMD.PITCHWHEEL
				|| command === CMD.AFTERTOUCH)
				{
					appendCommandRow(table, synthCommands[i], row++);
				}
			}
		}

		function appendControlRows(table, controls)
		{
			var i, tr, controlRows;

			// returns an array of tr elements
			function getControlRows(controls)
			{
				var i, uControls, tr, rval = [], uControl;

				// Returns an array of unique controls.
				// Each unique control has a ccs array attribute containing the unique control's cc indices.
				// The unique control's other attributes (name, defaultValue and nItems) are the same as
				// for the original non-unique controls (for which these attributes are all the same).
				function getUniqueControls(nonUniqueControls)
				{
					var i, nuControl, uniqueControls = [], uniqueControl;

					function newStandardControl(standardControlIndex)
					{
						var standardControl = {}, defaultValue;

						standardControl.name = WebMIDI.constants.controlName(standardControlIndex);
						standardControl.index = standardControlIndex;
						defaultValue = WebMIDI.constants.controlDefaultValue(standardControlIndex);
						if(defaultValue !== undefined)
						{
							standardControl.defaultValue = defaultValue;
						}
						return standardControl;
					}
					function findUniqueControl(name, uniqueControls)
					{
						var i, uControl = null;

						for(i = 0; i < uniqueControls.length; ++i)
						{
							if(uniqueControls[i].name === name)
							{
								uControl = uniqueControls[i];
								break;
							}
						}
						return uControl;
					}

					function newUniqueControl(nuControl)
					{
						var uniqueControl = {};

						uniqueControl.name = nuControl.name;
						uniqueControl.ccs = [];
						uniqueControl.ccs.push(nuControl.index);
						if(nuControl.defaultValue !== undefined)
						{
							uniqueControl.defaultValue = nuControl.defaultValue;
						}
						if(nuControl.nItems !== undefined)
						{
							uniqueControl.nItems = nuControl.nItems;
						}
						return uniqueControl;
					}
					
					for(i = 0; i < nonUniqueControls.length; ++i)
					{
						nuControl = nonUniqueControls[i];
						if(typeof nuControl === "number")
						{
							nuControl = newStandardControl(nuControl);
						}
						uniqueControl = findUniqueControl(nuControl.name, uniqueControls);
						if(uniqueControl === null)
						{
							uniqueControl = newUniqueControl(nuControl);
							uniqueControls.push(uniqueControl);
						}
						else
						{
							uniqueControl.ccs.push(nuControl.index);
						}
					}

					return uniqueControls;
				}

				function ccString(ccs)
				{
					var i, rval = "CC ";
					
					for(i = 0; i < ccs.length; ++i)
					{
						rval += ccs[i].toString(10);
						rval += ", ";
					}
					rval = rval.substring(0, rval.length - 2);

					return rval;
				}

				// 3-byte controls
				function setLongControlRow(tr, uControl, i)
				{
					var td, input, button;

					function sendMessageFromInput(numberInput)
					{
						var
						value = numberInput.valueAsNumber,
						uControl = numberInput.uControl;
						
						// returns a value in range [0..127] for an index in range [0..nItems-1]
						function valueFromIndex(index, nItems)
						{
							var partitionSize = 127 / nItems;
							
							return Math.round((partitionSize / 2) + (partitionSize * index));
						}
						
						if(uControl.nItems !== undefined)
						{
							value = valueFromIndex(value, uControl.nItems);
						}

						sendLongControl(numberInput.uControl.ccs[0], value);
					}

					function onInputChanged(event)
					{
						var	numberInput = event.currentTarget;

						sendMessageFromInput(numberInput);
					}

					function onSendAgainButtonClick(event)
					{
						var inputID = event.currentTarget.inputID,
							numberInput = getElem(inputID);
						
						sendMessageFromInput(numberInput);
					}

					td = document.createElement("td");
					tr.appendChild(td);
					td.className = "left";
					td.innerHTML = uControl.name;

					td = document.createElement("td");
					tr.appendChild(td);

					input = document.createElement("input");
					input.type = "number";
					input.name = "value";
					input.id = "controlNumberInput" + i.toString(10);
					input.value = uControl.defaultValue;
					input.uControl = uControl;
					input.className = "number";
					input.min = 0;
					if(uControl.nItems === undefined)
					{
						input.max = 127;
					}
					else
					{
						input.max = uControl.nItems - 1;
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

					td = document.createElement("td");
					tr.appendChild(td);
					td.innerHTML = ccString(uControl.ccs);

					longInputControlIDs.push(input.id);

					return tr;
				}
				// 2-byte uControls
				function setShortControlRow(tr, uControl)
				{
					var 
					button,
					td = document.createElement("td");

					function onSendShortControlButtonClick(event)
					{
						var uControl = event.currentTarget.uControl;

						sendShortControl(uControl.ccs[0]);
					}

					tr.appendChild(td);
					td.className = "left";
					td.innerHTML = uControl.name;

					td = document.createElement("td");
					tr.appendChild(td);
					button = document.createElement("input");
					button.type = "button";
					button.className = "sendButton";
					button.value = "send";
					button.uControl = uControl;
					button.onclick = onSendShortControlButtonClick;
					//button.style.marginLeft = "4px";
					//button.style.marginRight = "4px";
					td.appendChild(button);

					td = document.createElement("td");
					tr.appendChild(td);
					td.innerHTML = ccString(uControl.ccs);
				}

				uControls = getUniqueControls(controls);

				for(i = 0; i < uControls.length; ++i)
				{
					uControl = uControls[i];
					tr = document.createElement("tr");
					rval.push(tr);
					if(uControl.defaultValue === undefined)
					{
						setShortControlRow(tr, uControl);
					}
					else
					{
						if(!(uControl.ccs[0] === WebMIDI.constants.CONTROL.BANK && synth.supportsGeneralMIDI))
						{
							setLongControlRow(tr, uControl, i);
						}
					}
				}

				return rval;
			}

			controlRows = getControlRows(controls);
			for(i = 0; i < controlRows.length; ++i)
			{
				tr = controlRows[i];
				table.appendChild(tr);
			}
		}

		commandInputIDs.length = 0;
		longInputControlIDs.length = 0;

		emptyTables(commandsTable, controlsTable);

		if(hasCommandsDiv(synth.commands))
		{
			commandsDiv.style.display = "block";
			commandsTitleDiv.style.display = "block";
			commandsTable.style.display = "table";

			appendCommandRows(commandsTable, synth.commands);
		}
		else
		{
			commandsDiv.style.display = "none";
			commandsTitleDiv.style.display = "none";
			commandsTable.style.display = "none";
		}

		if(synth.controls !== undefined && synth.controls.length > 0)
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

		sendShortControl(WebMIDI.constants.CONTROL.ALL_CONTROLLERS_OFF);
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

		function setSoundFontTableDisplay(synth, firstSoundFontLoaded)
		{
			var
			cursorControlDiv = getElem("cursorControlDiv"),
			waitingForFirstFontDiv = getElem("waitingForFirstFontDiv"),
			soundFontDiv = getElem("soundFontDiv"),
			soundFontTable1 = getElem("soundFontTable1"),
			soundFontTable2 = getElem("soundFontTable2");

			if(synth.setSoundFont === undefined)
			{
				cursorControlDiv.style.cursor = "auto";
				waitingForFirstFontDiv.style.display = "none";
				soundFontTable1.style.display = "none";
				soundFontTable2.style.display = "none";
				soundFontDiv.style.display = "none";
			}
			else if(firstSoundFontLoaded === true)
			{
				cursorControlDiv.style.cursor = "auto";
				waitingForFirstFontDiv.style.display = "none";
				soundFontTable1.style.display = "block";
				soundFontTable2.style.display = "block";
				soundFontDiv.style.display = "block";
			}
			else
			{
				cursorControlDiv.style.cursor = "wait";
				waitingForFirstFontDiv.style.display = "block";
				soundFontTable1.style.display = "none";
				soundFontTable2.style.display = "none";
				soundFontDiv.style.display = "none";
			}
		}

		synthSelect.onchange = onSynthSelectChanged; // activated by synthSelectDivButton 

		getElem("synthSelectDivButtonDiv").style.display = "none";

		setMonoPolyDisplay(synth);

		setSoundFontTableDisplay(synth, firstSoundFontLoaded);

		if(synth.setSoundFont === undefined || firstSoundFontLoaded === true)
		{
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

	sendNoteOn = function(noteIndex, noteVelocity)
	{
		sendCommand(WebMIDI.constants.COMMAND.NOTE_ON, noteIndex, noteVelocity);
	},

	sendNoteOff = function(noteIndex, noteVelocity)
	{
		var
		NOTE_ON = WebMIDI.constants.COMMAND.NOTE_ON,
		NOTE_OFF = WebMIDI.constants.COMMAND.NOTE_OFF,
		synthSelect = getElem("synthSelect"),
		synth = synthSelect[synthSelect.selectedIndex].synth;

		if(synth.commands.indexOf(NOTE_OFF) >= 0)
		{
			sendCommand(NOTE_OFF, noteIndex, noteVelocity);
		}
		else
		{
			sendCommand(NOTE_ON, noteIndex, 0);
		}
	},

	doNoteOn = function()
	{
		var
		noteIndex = getElem("noteDiv1IndexInput").valueAsNumber,
		noteVelocity = getElem("noteDiv1VelocityInput").valueAsNumber,
		holdCheckbox1 = getElem("holdCheckbox1"),
		sendButton1 = getElem("sendButton1");

		if(holdCheckbox1.checked === true)
		{
			sendButton1.disabled = true;
		}
		
		sendNoteOn(noteIndex, noteVelocity);		
	},

	doNoteOff = function()
	{
		var
		noteIndex = getElem("noteDiv1IndexInput").valueAsNumber,
		noteVelocity = getElem("noteDiv1VelocityInput").valueAsNumber;

		sendNoteOff(noteIndex, noteVelocity);
	},

	doNotesOn = function()
	{
		var
		note1Checkbox = getElem("sendNote1Checkbox"),
		note1Index = getElem("notesDiv2IndexInput1").valueAsNumber,
		note1Velocity = getElem("notesDiv2VelocityInput1").valueAsNumber,
		note2Checkbox = getElem("sendNote2Checkbox"),
		note2Index = getElem("notesDiv2IndexInput2").valueAsNumber,
		note2Velocity = getElem("notesDiv2VelocityInput2").valueAsNumber,
		holdCheckbox2 = getElem("holdCheckbox2"),
		sendButton2 = getElem("sendButton2");

		if(holdCheckbox2.checked === true)
		{
			sendButton2.disabled = true;
		}

		if(note1Checkbox.checked)
		{
			sendNoteOn(note1Index, note1Velocity);
		}
		if(note2Checkbox.checked)
		{
			sendNoteOn(note2Index, note2Velocity);
		}
	},

	doNotesOff = function()
	{
		var
		note1Checkbox = getElem("sendNote1Checkbox"),
		note1Index = getElem("notesDiv2IndexInput1").valueAsNumber,
		note1Velocity = getElem("notesDiv2VelocityInput1").valueAsNumber,
		note2Checkbox = getElem("sendNote2Checkbox"),
		note2Index = getElem("notesDiv2IndexInput2").valueAsNumber,
		note2Velocity = getElem("notesDiv2VelocityInput2").valueAsNumber;

		if(note1Checkbox.checked)
		{
			sendNoteOff(note1Index, note1Velocity);
		}
		if(note2Checkbox.checked)
		{
			sendNoteOff(note2Index, note2Velocity);
		}
	},

	holdCheckboxClicked = function()
	{
		var
		holdCheckbox1 = getElem("holdCheckbox1"),
		holdCheckbox2 = getElem("holdCheckbox2");

		if(getElem("notesDiv2").style.display === "none")
		{
			if(holdCheckbox1.checked === false)
			{
				doNoteOff();
				getElem("sendButton1").disabled = false;
			}
		}
		else
		{
			if(holdCheckbox2.checked === false)
			{
				doNotesOff();
				getElem("sendButton2").disabled = false;
			}
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
				var i, j, generalMIDIPatchName = WebMIDI.constants.generalMIDIPatchName,
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
							name = generalMIDIPatchName(patch);
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
							console.warn("Illegal preset info type");
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
				sf2OriginPathBase = "http://james-ingram-act-two.de/soundFonts/Arachno/Arachno1.0selection-";
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
				originSelect = getElem("sf2OriginSelect");

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
						function loadSynthsWithFirstSoundFont(soundFont)
						{
							var i, synth;
							
							function loadFirstSoundFont(synth, soundFont)
							{
								synth.setSoundFont(soundFont);

								// For some reason, the first noteOn to be sent by the host, reacts only after a delay.
								// This noteOn/noteOff pair is sent so that the *next* noteOn will react immediately.
								// This is actually a kludge. I have been unable to solve the root problem.
								// (Is there an uninitialized buffer somewhere?)
								if(synth.setMasterVolume)
								{
									// consoleSf2Synth can't/shouldn't do this.
									// (It has no setMasterVolume function)
									synth.setMasterVolume(0);
									synth.noteOn(0, 64, 100);
									synth.noteOff(0, 64, 100);
								}
								// Wait for the above noteOn/noteOff kludge to work.
								// consoleSf2Synth must call onSynthSelectChanged().
								setTimeout(function()
								{
									if(synth.setMasterVolume)
									{
										synth.setMasterVolume(16384);
									}
									firstSoundFontLoaded = true;
									if(synthSelect.options[synthSelect.selectedIndex].synth === synth)
									{
										onSynthSelectChanged();
									}
								}, 2400);
							}

							for(i = 0; i < synthSelect.options.length; ++i)
							{
								synth = synthSelect.options[i].synth;
								if(synth.setSoundFont !== undefined)
								{
									loadFirstSoundFont(synth, soundFont);
								}
							}
						}

						nFontsOfThisTypeLoaded++;
						soundFont.init();
						selectOptions[fontIndex].soundFont = soundFont;
						selectOptions[fontIndex].disabled = false;
						if(typeIndex === 0 && fontIndex === 0)
						{
							loadSynthsWithFirstSoundFont(soundFont);
						}

						fontIndex++;
						if(fontIndex < nFontsOfThisType)
						{
							soundFontURL = selectOptions[fontIndex].url;
							soundFontName = selectOptions[fontIndex].text;
							presetIndices = getPresetIndices(selectOptions[fontIndex].presetOptions);
							loadLogElem.innerHTML = 'loading the "' + soundFontName + '" soundFont (' + (nFontsOfThisTypeLoaded + 1) + "/" + nFontsOfThisType + ")...";
							loadSoundFontAsynch();
						}
						else
						{
							loadLogElem.innerHTML = "";
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
		option.synth = new WebMIDI.residentSf2Synth.ResidentSf2Synth();
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

    	synthWebsiteButtonClick: synthWebsiteButtonClick,
    	soundFontWebsiteButtonClick: soundFontWebsiteButtonClick,

    	onSf2OriginSelectChanged: onSf2OriginSelectChanged,
    	onSf2SelectChanged: onSf2SelectChanged,

    	noteCheckboxClicked: noteCheckboxClicked,
    	holdCheckboxClicked: holdCheckboxClicked,

    	doNoteOn: doNoteOn,
    	doNoteOff: doNoteOff,

    	doNotesOn: doNotesOn,
    	doNotesOff: doNotesOff
    };
	// end var

	init();

	return publicAPI;

}(document));
