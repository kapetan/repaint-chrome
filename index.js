var fs = require('fs');
var util = require('util');
var qs = require('querystring');
var url = require('url');

var handlebars = require('handlebars');
var marked = require('marked');
var xhr = require('xhr');
var repaint = require('../browser');

var INITIAL_URL = 'https://raw.githubusercontent.com/kapetan/text-width/master/README.md';
var CORS_URL = 'http://cors.maxogden.com';

var markdown = handlebars.compile(fs.readFileSync(__dirname + '/markdown/index.html', 'utf-8'));

var form = document.getElementById('text-form');
var address = document.getElementById('text-address');
var open = document.getElementById('open-png');
var scroll = document.getElementById('scroll');
var text = document.getElementById('text');
var canvas = document.getElementById('canvas');
var frame = document.getElementById('frame');
var query = qs.parse(window.location.search.slice(1));
var context = canvas.getContext('2d');
var doc = frame.contentWindow.document;
var debug = query.hasOwnProperty('debug');

if(debug) document.getElementById('frame-row').style.display = 'block';

var dimensions = {
	width: canvas.clientWidth,
	height: canvas.clientHeight
};

canvas.width = dimensions.width;
canvas.height = dimensions.height;

var urlType = function(url) {
	// var wikiUrl = url.resolve('' + window.location, '/wiki/index.html');
	// if(u.indexOf(wikiUrl) === 0) return 'wiki';
	url = resolve(url);
	var wikiUrl = resolve('/wiki/index.html');
	if(url.indexOf(wikiUrl) === 0) return 'wiki';

	var extension = url
		.split('.')
		.pop()
		.toLowerCase();

	return {
		md: 'markdown',
		markdown: 'markdown'
	}[extension] || 'html';
};

var baseUrl = function() {
	return resolve('/').slice(0, -1);
};

var resolve = function(path) {
	return url.resolve('' + window.location, path);
};

var update = function(x, y) {
	var url = address.value.trim();
	var body = text.value;
	var html = body;
	var type = urlType(url);

	if(type === 'wiki') {
		html = handlebars.compile(body)({
			base: baseUrl()
		});
	} else if(type === 'markdown') {
		body = marked(text.value);
		html = markdown({
			body: body,
			base: baseUrl()
		});
	}

	if(debug) {
		doc.open();
		doc.write(html);
		doc.close();
	}

	context.clearRect(0, 0, dimensions.width, dimensions.height);

	repaint({
		url: url,
		content: html,
		context: context,
		viewport: {
			position: { x: x || 0, y: y || 0 },
			dimensions: dimensions
		}
	}, function(err, page) {
		if(err) return alert(err.message);
	});
};

var fetch = function() {
	var url = address.value.trim();
	if(!url) return;
	if(/https?:/.test(url)) url = CORS_URL + '/' + encodeURI(url);

	xhr({
		method: 'GET',
		url: url
	}, function(err, response, body) {
		if(err) return alert(err.message);
		if(!/2\d\d/.test(response.statusCode)) {
			var message = util.format('Unexpected status code (%s): %s', response.statusCode, body);
			return alert(message);
		}

		text.value = body;
		update();
	});
};

address.value = query.url || INITIAL_URL;
fetch();

var textTimeout, scrollTimeout;

text.addEventListener('input', function(e) {
	clearTimeout(textTimeout);
	textTimeout = setTimeout(function() {
		update();
	}, 200);
});

form.addEventListener('submit', function(e) {
	e.preventDefault();
	fetch();
});

open.addEventListener('click', function(e) {
	e.preventDefault();

	try {
		var url = canvas.toDataURL('image/png');
		window.open(url);
	} catch(err) {
		var message = err.message + '\n\nThis is probably caused by cross-origin images.';
		alert(message);
	}
});

scroll.addEventListener('input', function() {
	clearTimeout(scrollTimeout);
	scrollTimeout = setTimeout(function() {
		update(0, -parseFloat(scroll.value));
	}, 100);
});
