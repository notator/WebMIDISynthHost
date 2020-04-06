### Web MIDI Synth Host
This is a Web MIDI application, written in HTML5 and Javascript. It can be tried out at <br />
https://james-ingram-act-two.de/open-source/WebMIDISynthHost/host.html <br />
<br />
A "Web MIDI Synth" is a GUI-less software synth that uses the Web Audio API to implement the Web MIDI API's _Output Device_ interface.<br />
Web MIDI Synths can be included in websites as a substitute for end-user hardware MIDI Output devices. This makes them especially useful on mobile devices. Also, since they themselves provide the MIDI Output Device interface, they don't depend on browser implementations of the Web MIDI API.<br />
<br />
This project was originally started so as to further the discussion about software synths at [Web MIDI API issue 124](https://github.com/WebAudio/web-midi-api/issues/124).<br />
It is now being used as a framework demonstrating the use of the Web MIDI Output Device Interface for different GUI-less synthesizers.<br />
Issues and suggestions for the [ResidentWAFSynth](https://github.com/notator/ResidentWAFSynthHost) and [cwMIDISynth](https://github.com/cwilso/midi-synth) should be made in their own repositories.<br />
Issues with this host application and the other hosted synths should be made here in this repository.<br />
A new, compatible synth could be added to this host as follows:
1. clone this repository.
2. create a new folder, parallel to the other synths' folders, for the new synth's files.
3. create a file that implements the new synth's interface using one of the existing synth definition files as a model. Such definitions can be found in:
   - `residentWAFSynth/residentWAFSynth.js`
   - `residentSf2Synth/residentSf2Synth.js`
   - `consoleSf2Synth/consoleSf2Synth.js`
   - `cwMIDISynth/cwMIDISynth.js`
   - `cwMonosynth/cwMonosynth.js`
4. include code for the new synth at the bottom of `host.js` (see the instructions there)
5. implement the interface, and include the synth's file(s) at the bottom of the host.html file

#### Currently Hosted Synthesizers:
* **ResidentWAFSynth**<br />
The ResidentWAFSynth uses [WebAudioFont](https://github.com/surikov/webaudiofont) presets. These load very quickly, and can be arbitrarily configured in the `residentWAFSynth/webAudioFontDefs.js` file. For illustration purposes, the example in this repository is deliberately large. The equivalent file in other installations would typically be much smaller.<br />
The code for this synth owes a lot to Sergey Surikov's [WebAudioFontPlayer](https://surikov.github.io/webaudiofont/npm/dist/WebAudioFontPlayer.js). In particular, the code for loading and adjusting presets is very similar to the code in his `WebAudioFontLoader`.<br />
The synth has the same controls as the _ResidentSf2Synth_ (its direct predecessor &mdash; see below), but with an additional reverberation control which is practically a clone of Surikov's `WebAudioFontReverberator`.<br />
It should be easy to add more controls in future using the reverberator as a model (Low Frequency Modulation, Ring-Modulation, Envelope controls etc.). (This should be done in [the synth's own repository](https://github.com/notator/ResidentWAFSynthHost).)<br />
Apart from having a MIDI interface, the main difference between the ResidentWAFSynth and Surikov's WebAudioFontPlayer is in the approach to note envelopes: The ResidentWAFSynth allows custom envelope settings to be provided for each preset zone. At a more general level, there are three types of (General MIDI) preset: Those that loop indefinitely (such as wind instruments, organs etc.) those that decay slowly (pianos, vibraphones etc.) and percussion instruments (which decay without looping, using their original sample). <br />
* **ResidentSf2Synth**<br />
This was initially a clone of gree's [sf2synth.js](https://github.com/gree/sf2synth.js), but I changed both the soundFont and synthesizer code so that soundFonts could be cached and changed at runtime.<br />
This implementation uses sf2 soundFont files created from the [Arachno](http://www.arachnosoft.com/main/soundfont.php) and [TimGM6mb](https://packages.debian.org/sid/sound/timgm6mb-soundfont) soundfonts using the [Awave Studio](https://www.fmjsoft.com/) soundFont editor. Any sf2 soundFont could, of course, be used but large soundFonts are impractical here.<br />
Issues relating to this synthesizer should be raised here, in this repository.<br />
* **ConsoleSf2Synth**<br />
This is a minimal synth that simply echoes the messages it receives to the console without producing sound.
It could be used as a stub when writing a new synthesizer.
* **CW_MIDISynth**<br />
This is Chris Wilson's MIDI synth ([repository](https://github.com/cwilso/midi-synth), [application](https://webaudiodemos.appspot.com/midi-synth/index.html)) without its original GUI. I have tried to keep closely to the code in the original files while using simple MIDI controls whose values are in the range 0..127. It would, of course, be possible to get nearer to the original settings by using hi- and lo-byte controllers (as standard MIDI does).<br />
Issues with this synthesizer should be raised at its own [repository](https://github.com/cwilso/midi-synth).
* **CW_MonoSynth** A very simple synth. The original is [here](https://github.com/cwilso/monosynth).<br />

#### Demo Applications:
There are simple demo applications, showing how to embed the above synths in web pages, at:<br />
[SimpleWebAudioFontSynthHost](https://james-ingram-act-two.de/open-source/SimpleWebAudioFontSynthHost/host.html) (ResidentWAFSynth)<br />
[SimpleSoundFontSynthHost](https://james-ingram-act-two.de/open-source/SimpleSoundFontSynthHost/host.html) (ResidentSf2Synth)<br />
[SimpleMIDISynthHost](https://james-ingram-act-two.de/open-source/SimpleMIDISynthHost/host.html) and [SimpleMIDISynthHost2](https://james-ingram-act-two.de/open-source/SimpleMIDISynthHost2/host.html) (CW_MIDISynth).<br />
SimpleMIDISynthHost2 demonstrates how to use a hardware MIDI keyboard to play the synth, and only works in browsers that support the Web MIDI API.<br />

James Ingram<br />
December 2015 (updated February 2016, June 2019, March 2020, April 2020)<br />




