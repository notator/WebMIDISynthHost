###Web MIDI Synth Host
This is a Web MIDI application, written in HTML5 and Javascript. It can be tried out at <br />
http://james-ingram-act-two.de/open-source/WebMIDISynthHost/host.html <br />
<br />
This project is unofficial, but is intended to further the discussion about software synths at [Web MIDI API issue 124](https://github.com/WebAudio/web-midi-api/issues/124).<br />
It can also be used to develop any new Web MIDI Synth [1] without having to create a GUI:

1. clone this project
2. create a new directory, at the top level of the project, for the new synth's files
3. create a file that describes the new synth's interface using one the existing synth definition files [2] as a model.
4. implement the interface, and include the synth's file(s) at the bottom of the host.html file

Web MIDI synths can easily be lifted out of this host and used in other Web applications that work "out-of-the-box". There are some simple applications, demonstrating how this can be done at:<br /> [SimpleSoundFontSynthHost](https://github.com/notator/SimpleSoundFontSynthHost),  [(GitHub)](https://github.com/notator/SimpleSoundFontSynthHost),
[SimpleMIDISynthHost](http://james-ingram-act-two.de/open-source/SimpleMIDISynthHost/host.html),
[(GitHub)](https://github.com/notator/SimpleMIDISynthHost) and
[SimpleMIDISynthHost2](http://james-ingram-act-two.de/open-source/SimpleMIDISynthHost2/host.html),
[(GitHub)](https://github.com/notator/SimpleMIDISynthHost2)<br />

####Synthesizers:
* **Sf2Synth1**<br />
This is almost entirely gree's [sf2synth.js](https://github.com/gree/sf2synth.js) synthesizer, but I have changed both the soundFont and synthesizer code so that soundFonts can be cached and changed at runtime. Issues relating to this synthesizer can be raised in the [SimpleSoundFontSynthHost](https://github.com/notator/SimpleSoundFontSynthHost/issues) repository, but it is essentially archived pending further discussion about the Web MIDI API.
* **ResidentSf2Synth**<br />
This is initially a clone of Sf2Synth1, but it is stored outside the WebMIDISynthHost directory, where it can be hosted by my Assistant Performer application ([repository](https://github.com/notator/assistant-performer), [application](http://james-ingram-act-two.de/open-source/assistantPerformer/assistantPerformer.html)). The ResidentSf2Synth may change/develop in future. Issues with this synthesizer should be raised in the [ResidentSf2Synth](https://github.com/notator/ResidentSf2Synth/issues) repository.
* **consoleSf2Synth**<br />
This is a minimal synth that simply echoes the messages it receives to the console without producing sound.
It could be used as a stub when writing a new synthesizer.
* **MIDI synth (Chris Wilson)**<br />
This is Chris' [MIDI synth](https://webaudiodemos.appspot.com/midi-synth/index.html) without its original GUI. I have tried to keep closely to the code in the original files while using simple MIDI controls whose values are in the range 0..127. It would, of course, be possible to get nearer to the original settings by using hi- and lo-byte controllers (as standard MIDI does). Issues with this synthesizer should be raised in the [SimpleMIDISynthHost](https://github.com/notator/SimpleMIDISynthHost/issues) repository.
* **monosynth (Chris Wilson)** A very simple synth. The original is [here](https://github.com/cwilso/monosynth).<br />

####Remarks:
 1. The soundFonts directory has been seeded with .sf2 files created from the [Arachno soundfont](http://www.arachnosoft.com/main/soundfont.php) using the [Viena soundfont editor](http://www.synthfont.com/index.html). Any soundFont can, of course, be used.<br />
 2. Issues relating to the WebMIDISynth API should be raised [here, in this repository](https://github.com/notator/WebMIDISynthHost/issues).
<br />

I am not a Web Audio specialist, so would especially welcome any help in developing the ResidentSf2Synth's code.<br />

December 2015 (updated February 2016)<br />
James Ingram

[1] A "Web MIDI Synth" is a software synth that uses the Web Audio API to implement the Output Device interface defined in the Web MIDI API. Web MIDI Synths can be used online independently of browser implementations of the Web MIDI API. *Standard* Web MIDI Synths can be used interchangeably with the hardware synths supplied by browser implementations of the Web MIDI API.<br />

[2] Web MIDI Synth interface definitions can be found in:
* sf2Synth1/sf2synth1.js
* ../residentSf2Synth/residentSf2Synth.js
* consoleSf2Synth.js
* cwMIDISynth/cwMIDISynth.js
* cwMonosynth.js



