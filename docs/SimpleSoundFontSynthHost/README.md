### Simple Sound Font Synth Host
This is a simple demonstration of how to include a Web MIDI Synth [1] that uses soundFonts in a Web application.<br/>
It can be tried out at<br />
https://james-ingram-act-two.de/open-source/SimpleSoundFontSynthHost/host.html.

This and my [WebMIDISynthHost](https://github.com/notator/WebMIDISynthHost) projects are unofficial, but are aimed at furthering the discussion about software synths at [Web MIDI API issue 124](https://github.com/WebAudio/web-midi-api/issues/124).<br />

The ResidentSf2Synth used in this demo is a version of the gree [sf2synth.js](https://github.com/gree/sf2synth.js) to which I have added an API that includes the Web MIDI API for Output Devices. I have also enhanced the original synth to enable soundFonts to be cached and changed at runtime.<br />
The synth implements standard MIDI controls. The messages that can be sent are declared in its *commands* and *controls* attributes.
<br />
Issues relating specifically to the _ResidentSf2Synth_ should be raised at the [WebMIDISynthHost repository](https://github.com/notator/WebMIDISynthHost).<br />

November 2015, June 2017
James Ingram

[1] A "Web MIDI Synth" is a software synth that uses the Web Audio API to implement the Output Device interface defined in the Web MIDI API. Web MIDI Synths can be used online independently of browser implementations of the Web MIDI API. *Standard* Web MIDI Synths can be used interchangeably with the hardware synths supplied by browser implementations of the Web MIDI API.<br />
