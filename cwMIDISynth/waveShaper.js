
// Copyright 2011, Google Inc.
// All rights reserved.
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
// 
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

/************************************************************************/
// This file encapsulates the file
// https://github.com/cwilso/midi-synth/blob/master/js/waveshaper.js
// in a namespace. The original file contans the above copyright notice.  
// Only the WaveShaper constructor and its setDrive(drive) function are exposed.
/************************************************************************/

/*jslint white */
/*global WebMIDI */

WebMIDI.namespace('WebMIDI.waveShaper');

WebMIDI.waveShaper = (function()
{
	"use strict";

	var threshold = -27, // dB
	headroom = 21, // dB

	e4 = function(x, k)
	{
		return 1.0 - Math.exp(-k * x);
	},

	dBToLinear = function(db) {
		return Math.pow(10.0, 0.05 * db);
	},

	shape = function(x) {
	 	var
		linearThreshold = dBToLinear(threshold),
		linearHeadroom = dBToLinear(headroom),
		maximum = 1.05 * linearHeadroom * linearThreshold,
		kk = (maximum - linearThreshold),
		sign = x < 0 ? -1 : +1,
		absx = Math.abs(x),
		shapedInput = absx < linearThreshold ? absx : linearThreshold + kk * e4(absx - linearThreshold, 1.0 / kk);

		shapedInput *= sign;
    
		return shapedInput;
	},

	generateColortouchCurve = function(curve) {
		var i, x,
		n = 65536,
		n2 = n / 2;
    
		for (i = 0; i < n2; ++i) {
			x = i / n2;
			x = shape(x);
        
			curve[n2 + i] = x;
			curve[n2 - i - 1] = -x;
		}
    
		return curve;
	},

	generateMirrorCurve = function(curve) {
		var i, x,
		n = 65536,
		n2 = n / 2;
    
		for (i = 0; i < n2; ++i) {
			x = i / n2;
			x = shape(x);
        
			curve[n2 + i] = x;
			curve[n2 - i - 1] = x;
		}
    
		return curve;
	},

	createShaperCurve = function () {
		var i, driveShaper = new Float32Array( 4096 );

		for (i=0; i<1024; i++) {
			// "bottom" half of response curve is flat
			driveShaper[2048+i] = driveShaper[2047-i] = i/2048;
			// "top" half of response curve is log
			driveShaper[3072+i] = driveShaper[1023-i] = Math.sqrt((i+1024)/1024)/2;
		}
		return driveShaper;
	},	

	WaveShaper = function(context)
	{
		if(!(this instanceof WaveShaper))
		{
			return new WaveShaper(context);
		}

		var waveshaper, preGain, postGain, curve;

		this.context = context;
		waveshaper = context.createWaveShaper();
		preGain = context.createGain();
		postGain = context.createGain();
		preGain.connect(waveshaper);
		waveshaper.connect(postGain);
		this.input = preGain;
		this.output = postGain;
		this.waveshaper = waveshaper;

		curve = new Float32Array(65536); // FIXME: share across instances
		generateColortouchCurve(curve);
		waveshaper.curve = curve;
		//    waveshaper.curve = createShaperCurve();
	},

	API =
    {
    	WaveShaper: WaveShaper // constructor
    };
	// end var

	WaveShaper.prototype.setDrive = function(drive)
	{
		this.input.gain.value = drive;
		var postDrive = Math.pow(1 / drive, 0.6);
		this.output.gain.value = postDrive;
	};

	return API;

}());
