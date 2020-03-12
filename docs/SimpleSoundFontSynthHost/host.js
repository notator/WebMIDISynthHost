/*
*  copyright 2015 James Ingram
*  https://james-ingram-act-two.de/
*
*  Code licensed under MIT
*/

WebMIDI.namespace('WebMIDI.host');

WebMIDI.host = (function()
{
	"use strict";

	var
		synth,

		// Note that the SoundFont constructor uses XMLHttpRequest, which
		// does not work with local files (localhost:).
		// To make it work, run the app from the web (http:).
		// The sound font must be on the same website as the host app.
		loadSoundFontAsynch = function()
		{
			var
				soundFont,
				soundFontURL = "https://james-ingram-act-two.de/soundFonts/Arachno/Arachno1.0selection-grand piano.sf2",
				// The name used to identify the soundFont in the GUI (can be chosen ad lib.).
				soundFontName = "grand piano",
				// The preset indices in the soundFont (only one in this case).
				presets = [0];

			function onLoad()
			{
				function switchToFontLoadedDiv()
				{
					var
						cursorControlDiv = document.getElementById("cursorControlDiv"),
						waitingForFontDiv = document.getElementById("waitingForFontDiv"),
						fontLoadedDiv = document.getElementById("fontLoadedDiv");

					if(waitingForFontDiv.style.display !== "none")
					{
						cursorControlDiv.style.cursor = "auto";
						waitingForFontDiv.style.display = "none";
						fontLoadedDiv.style.display = "block";
					}
				}

				soundFont.init();

				synth = new WebMIDI.residentSf2Synth.ResidentSf2Synth();
				synth.setSoundFont(soundFont);

				switchToFontLoadedDiv();
			}

			soundFont = new WebMIDI.soundFont.SoundFont(soundFontURL, soundFontName, presets, onLoad);
		},

		gitHubButtonClick = function()
		{
			var
				win = window.open("https://github.com/notator/SimpleSoundFontSynthHost", "_blank");
			win.focus();
		},

		// This button is necessary to comply with Chrome's
		// "No sound without user action" policy.
		continueButtonClick = function()
		{
			function switchToContinueDiv()
			{
				let fontLoadedDiv = document.getElementById("fontLoadedDiv"),
					runningDiv = document.getElementById("runningDiv");

				fontLoadedDiv.style.display = "none";
				runningDiv.style.display = "block";
			}

			synth.open();
			switchToContinueDiv();
		},

		doMouseOver = function(e)
		{
			var NOTE_ON = WebMIDI.constants.COMMAND.NOTE_ON,
				channel = 0,
				key = parseInt(e.target.id, 10),
				velocity = 100,
				status = NOTE_ON + channel,
				message = new Uint8Array([status, key, velocity]);

			synth.send(message, performance.now());
		},

		doMouseOut = function(e)
		{
			var
				NOTE_OFF = WebMIDI.constants.COMMAND.NOTE_OFF,
				channel = 0,
				key = parseInt(e.target.id, 10),
				velocity = 100,
				status = NOTE_OFF + channel,
				message = new Uint8Array([status, key, velocity]);

			synth.send(message, performance.now());
		},

		publicAPI =
		{
			gitHubButtonClick: gitHubButtonClick,
			continueButtonClick: continueButtonClick,

			doMouseOver: doMouseOver,
			doMouseOut: doMouseOut
		};

	loadSoundFontAsynch();

	return publicAPI;

}());
