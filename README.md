
Introduction
------------
This is a WEB MIDI application, written in HTML5 and Javascript.<br />
Its main purpose is to be a focus for discussion while standardizing the interface that software synthesizers need to
implement in order to be used seamlessly with the hardware synthesizers provided by browser implementations of
the Web MIDI API.<br />
When the interface has been agreed, this software will also be usable as a universal host GUI within which any Web MIDI
Synth can be developed.<br />
<br />
The first commit provides two working soundfont synthesizers, and some soundfonts for them to use:<br />
Synthesizers:
1. jigSf2Synth.js
This is very largely gree's soundfont Synthesizer [1]. Some gree files are used almost unchanged, but I have changed both the
soundfont and synthesizer code so that soundfonts can be cached and changed at runtime.
2. consoleSf2Synth.js
This is a minimal synth, that simply echoes the messages it receives to the console, without producing sound.
This is perhaps the best place to discuss the interface. It could also be used as a stub when writing a new synthesizer.<br />
<br />
Soundfonts:
I have seeded the soundfonts directory with .sf2 files created from the Arachno soundfont [2] using the Viena editor [3].

The host code has been written so that the synthesizers and soundfonts it uses can be changed very easily.

This first commit only defines an interface for soundfont synthesizers. It should be fairly easy to extend it to define
an interface for <em>any</em> synthesizer. See consoleSf2Synth.js and the issues.

November 2015<br />
James Ingram

[1] Gree Soundfont Synthesizer: https://github.com/gree/sf2synth.js <br />
[2] Arachnosoft: http://www.arachnosoft.com/main/soundfont.php <br />
[3] Viena Soundfont Editor:  http://www.synthfont.com/index.html <br />

IMPORTANT LICENSING INFORMATION for the Arachno soundFont:
The original Arachnosoft Read Me is included in the soundFonts/Arachno directory at
./soundFonts/Arachno/Read Me.txt. It is well worth reading. In particular,
please note the following LICENSING INFORMATION:<br />
"Most portions of this bank actually come from other sources (SoundFont
and GigaSampler libraries, third-party synthesizer samples) that
have been credited in the bundled documentation.<br />
You're free to use Arachno SoundFont in any of your projects. But,
please be aware that this bank is primarily distributed for private,
non-commercial purposes only, as it uses portions from other authors.<br />
If you want to use it for commercial purposes, please obtain a written
consent from the original authors credited in the documentation."<br />
<br />
