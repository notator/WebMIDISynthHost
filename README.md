
Introduction
------------
This is a WEB MIDI application, written in HTML5 and Javascript.<br />
It can be tried out at <br />
http://james-ingram-act-two.de/open-source/WebMIDISynthHost/host.html <br />
<br />
The main object of this exercise is to provide a focus for discussion while standardizing the interface that software synthesizers need to
implement in order to be used seamlessly with the hardware synthesizers provided by browser implementations of
the Web MIDI API [1].<br />
When the interface has stabilized, this application should also be usable as a host GUI within which any new Web MIDI Synth can be developed.<br />
<br />
The first commit provides two synthesizers, and some soundFonts:<br />
Synthesizers:<br />
<ul>
<li>
1. jigSf2Synth.js
This is very largely gree's soundFont Synthesizer [2]. Some gree files are used almost unchanged, but I have changed both the
soundFont and synthesizer code so that soundFonts can be cached and changed at runtime.
</li>
<li>
2. consoleSf2Synth.js
This is a minimal synth, that simply echoes the messages it receives to the console without producing sound.
This is perhaps the best place to discuss the interface. It could also be used as a stub when writing a new synthesizer.
</li>
</ul>
SoundFonts:
I have seeded the soundFonts directory with .sf2 files created from the Arachno soundfont [3] using the Viena editor [4].

The host code has been written so that the synthesizers and soundFonts it uses can be changed very easily.

This first commit only defines an interface for soundFont synthesizers. It should be fairly easy to extend it to define
an interface for <em>any</em> synthesizer. See consoleSf2Synth.js and the issues.<br />
<br />

November 2015<br />
James Ingram

[1] Web MIDI API: http://cwilso.github.io/web-midi-api/ <br />
[2] Gree Soundfont Synthesizer: https://github.com/gree/sf2synth.js <br />
[3] Arachnosoft: http://www.arachnosoft.com/main/soundfont.php <br />
[4] Viena Soundfont Editor:  http://www.synthfont.com/index.html <br />
