var fs = require('fs');
var util = require('util');
var qs = require('querystring');

var handlebars = require('handlebars');
var marked = require('marked');
var xhr = require('xhr');
var repaint = require('repaint');

var CORS_URL = 'http://crossorigin.me';

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
var height = 0;

if(debug) document.getElementById('frame-row').style.display = 'block';

var dimensions = {
	width: canvas.clientWidth,
	height: canvas.clientHeight
};

canvas.width = dimensions.width;
canvas.height = dimensions.height;

var urlType = function(url) {
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
	var loc = window.location;
	return util.format('%s//%s%s', loc.protocol, loc.host, loc.pathname).replace(/\/$/, '');
};

var update = function(x, y) {
	var url = address.value.trim();
	var body = text.value;
	var html = body;

	if(urlType(url) === 'markdown') {
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

		var layoutHeight = page.layout.visibleHeight();
		if(Math.abs(layoutHeight - height) > 1) {
			height = layoutHeight;
			scroll.value = 0;
			scroll.max = layoutHeight - dimensions.height;
		}
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

if(query.url) {
	address.value = query.url;
	fetch();
}

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
