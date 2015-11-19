
Introduction
------------
This is a WEB MIDI application, written in HTML5 and Javascript.<br />
It can be tried out at <br />
http://james-ingram-act-two.de/open-source/WebMIDISynthHost/host.html <br />
<br />
This project is unofficial, but is intended to further the discussion about software synths at [1].<br />
When the interface for software synthesizers has stabilized, this application should also be usable as a
host GUI within which any new Web MIDI Synth can be developed.<br />
I am not a Web Audio specialist, so I am also hoping for help in improving the resident synthesizers' Web Audio code.
If such help materializes, this project ought to end up with some really usable synthesizers!<br />
<br />
The resident synthesizers can easily be lifted out and used in Web applications that work "out-of-the-box". The browser
will need to support the Web Audio API of course, but given that, end-users will not need any special MIDI hardware or browser plugins.<br />
<br />
SoundFonts:
I have seeded the soundFonts directory with .sf2 files created from the Arachno soundfont [2] using the Viena editor [3].

The first resident synthesizers are:<br />
<ul>
<li>
1. MIDI synth (Chris Wilson)
This is Chris' demo synth [4] without its original GUI. I have tried to keep as close as possible to the code in the original files while using simple MIDI controls whose values are in the range 0..127. It would, of course, be possible to get nearer to the original settings by using hi- and lo-byte controllers (as standard MIDI does).
</li>
<li>
2. monosynth (Chris Wilson) [5]. A very simple synth.
</li>
<li>
3. Sf2Synth1.js
This is very largely gree's soundFont Synthesizer [6]. Some gree files are used almost unchanged, but I have changed both the
soundFont and synthesizer code so that soundFonts can be cached and changed at runtime.
</li>
<li>
4. consoleSf2Synth.js
This is a minimal synth that simply echoes the messages it receives to the console without producing sound.
It could be used as a stub when writing a new synthesizer.
</li>
</ul>
<br />
November 2015<br />
James Ingram

[1] Web MIDI API issue 124: https://github.com/WebAudio/web-midi-api/issues/124<br />
[2] Arachnosoft: http://www.arachnosoft.com/main/soundfont.php <br />
[3] Viena Soundfont Editor:  http://www.synthfont.com/index.html <br />
[4] Chris Wilson's MIDI synth synthesizer: https://github.com/cwilso/midi-synth <br />
[5] Chris Wilson's monosynth synthesizer: https://github.com/cwilso/monosynth <br />
[6] Gree Soundfont Synthesizer: https://github.com/gree/sf2synth.js <br />

