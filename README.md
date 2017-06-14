### Web MIDI Synth Host
This is a Web MIDI application, written in HTML5 and Javascript. It can be tried out at <br />
http://james-ingram-act-two.de/open-source/WebMIDISynthHost/host.html <br />
<br />
This project is unofficial, but is intended to further the discussion about software synths at [Web MIDI API issue 124](https://github.com/WebAudio/web-midi-api/issues/124).<br />
It can also be used to develop any new Web MIDI Synth [1] without having to create a GUI:

1. clone this project
2. create a new directory, at the top level of the project, for the new synth's files
3. create a file that describes the new synth's interface using one the existing synth definition files [2] as a model.
4. implement the interface, and include the synth's file(s) at the bottom of the host.html file

Web MIDI synths can easily be lifted out of this host and used in other Web applications that work "out-of-the-box". There are some simple applications, demonstrating how this can be done at:<br /> [SimpleSoundFontSynthHost](http://james-ingram-act-two.de/open-source/SimpleSoundFontSynthHost/host.html),  [(GitHub)](https://github.com/notator/SimpleSoundFontSynthHost),
[SimpleMIDISynthHost](http://james-ingram-act-two.de/open-source/SimpleMIDISynthHost/host.html),
[(GitHub)](https://github.com/notator/SimpleMIDISynthHost) and
[SimpleMIDISynthHost2](http://james-ingram-act-two.de/open-source/SimpleMIDISynthHost2/host.html),
[(GitHub)](https://github.com/notator/SimpleMIDISynthHost2)<br />
The ResidentSf2Synth has its own repository, and can easily be cloned from there (see below).

#### Synthesizers:
* **MIDI synth (Chris Wilson)**<br />
This is Chris' MIDI synth ([repository](https://github.com/cwilso/midi-synth), [application](https://webaudiodemos.appspot.com/midi-synth/index.html)) without its original GUI. I have tried to keep closely to the code in the original files while using simple MIDI controls whose values are in the range 0..127. It would, of course, be possible to get nearer to the original settings by using hi- and lo-byte controllers (as standard MIDI does). Issues with this synthesizer should be raised at its own [repository](https://github.com/cwilso/midi-synth).
* **monosynth (Chris Wilson)** A very simple synth. The original is [here](https://github.com/cwilso/monosynth).<br />
* **ResidentSf2Synth**<br />
This is almost entirely gree's [sf2synth.js](https://github.com/gree/sf2synth.js) synthesizer, but I have adapted the code to my own style, and changed both the soundFont and synthesizer code so that soundFonts can be cached and changed at runtime. 
This synth is maintained in a separate [repository](https://github.com/notator/residentSf2Synth) where pull requests can be made and issues reported. I am not a Web Audio or SoundFont specialist, so would especially welcome any help in developing the code.
* **consoleSf2Synth**<br />
This is a minimal synth that simply echoes the messages it receives to the console without producing sound.
It could be used as a stub when writing a new synthesizer.

#### Remarks:
 1. The soundFonts directory has been seeded with sf2 soundFont files created from the [Arachno soundFont](http://www.arachnosoft.com/main/soundfont.php) using the [Viena soundFont editor](http://www.synthfont.com/index.html). Any sf2 soundFont can, of course, be used.<br />
 2. Issues relating to the WebMIDISynth API should be raised [here, in this repository](https://github.com/notator/WebMIDISynthHost/issues).
<br />

December 2015 (updated February, November 2016)<br />
James Ingram

[1] A "Web MIDI Synth" is a software synth that uses the Web Audio API to implement the Output Device interface defined in the Web MIDI API. Web MIDI Synths can be used online independently of browser implementations of the Web MIDI API.<br />

[2] Web MIDI Synth interface definitions can be found in:
* cwMIDISynth/cwMIDISynth.js
* cwMonosynth.js
* residentSf2Synth/residentSf2Synth.js
* consoleSf2Synth.js
