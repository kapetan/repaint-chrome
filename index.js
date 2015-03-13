var fs = require('fs');
var util = require('util');
var qs = require('querystring');

var marked = require('marked');
var xhr = require('xhr');
var render = require('../browser');

var serialize = require('../browser/test/serialize');

var INITIAL_URL = 'https://raw.githubusercontent.com/kapetan/text-width/master/README.md';
var CORS_URL = 'http://cors.maxogden.com';
var DOCUMENT = fs.readFileSync(__dirname + '/document.html', 'utf-8');

var form = document.getElementById('text-form');
var input = document.getElementById('text-input');
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

var update = function(x, y) {
	var body = marked(text.value);
	var html = util.format(DOCUMENT, body);

	if(debug) {
		doc.open();
		doc.write(html);
		doc.close();
	}

	context.clearRect(0, 0, dimensions.width, dimensions.height);

	render({
		url: '' + window.location,
		content: html,
		context: context,
		viewport: {
			position: { x: x || 0, y: y || 0 },
			dimensions: dimensions
		}
	}, function(err, page) {
		if(err) throw err;
		if(debug) console.log(serialize(page.layout));
	});
};

var fetch = function() {
	var url = input.value.trim();
	if(!url) return;

	xhr({
		method: 'GET',
		url: CORS_URL + '/' + encodeURI(url)
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

input.value = query.url || INITIAL_URL;
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
