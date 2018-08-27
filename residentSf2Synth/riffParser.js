/*
* Copyright 2015 James Ingram
* https://james-ingram-act-two.de/
* 
* This is almost entirely the riff parser code from
* https://github.com/gree/sf2synth.js
*
* All this code licensed under MIT
*
* The WebMIDI.riffParser namespace containing:
* 
*        // RiffParser constructor
*        RiffParser(input, optParams)
*/

/*global WebMIDI */

WebMIDI.namespace('WebMIDI.riffParser');

WebMIDI.riffParser = (function()
{
	"use strict";
	var
	RiffParser = function(input, optParams) // input is a Uint8Array
	{
		optParams = optParams || {};
		this.input = input;
		this.ip = optParams.index || 0;
		this.length = optParams.length || input.length - this.ip;
		this.chunkList = null;
		this.offset = this.ip;
		this.padding = (optParams.padding !== undefined) ? optParams.padding : true;
		this.bigEndian = (optParams.bigEndian !== undefined) ? optParams.bigEndian : false;
	},

	API =
	{
		RiffParser: RiffParser // constructor
	};
	// end var 

	RiffParser.prototype.parse = function()
	{
		var length = this.length + this.offset;

		this.chunkList = [];

		while(this.ip < length)
		{
			this.parseChunk();
		}
	};

	RiffParser.prototype.parseChunk = function()
	{
		var 
		input = this.input,
		ip = this.ip,
		type = String.fromCharCode(input[ip++], input[ip++], input[ip++], input[ip++]),
		size = this.bigEndian ?
			   (((input[ip++] << 24) | (input[ip++] << 16) | (input[ip++] << 8) | (input[ip++])) >>> 0) :
			   (((input[ip++]) | (input[ip++] << 8) | (input[ip++] << 16) | (input[ip++] << 24)) >>> 0);

		this.chunkList.push({type: type, size: size, offset: ip});

		ip += size;

		// padding
		if(this.padding && ((ip - this.offset) & 1) === 1)
		{
			ip++;
		}

		this.ip = ip;
	};

	RiffParser.prototype.getChunk = function(index)
	{
		var chunk = this.chunkList[index];

		if(chunk === undefined)
		{
			return null;
		}

		return chunk;
	};

	RiffParser.prototype.getNumberOfChunks = function()
	{
		return this.chunkList.length;
	};

	return API;

}());




