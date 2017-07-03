// Copyright � 2002-2010 Microchip Technology Inc.  All rights reserved.
// See Microchip TCP/IP Stack documentation for license information.

// Determines when a request is considered "timed out"
const timeOutMS = 5000; // ms

// Stores a queue of AJAX events to process
let ajaxList = [];

const LED_NAMES = [
	'ledAlarmStatus',
	'ledAC',
	'ledTemp1',
	'ledTemp2',
	'ledTemp3',
	'ledTemp4',
	'ledWater1',
	'ledWater2',
	'ledWater3',
	'ledWater4',
	'ledSmoke1',
	'ledSmoke2',
	'ledSmoke3',
	'ledSmoke4'
];

const BUTTONS_NAMES = [
	'ledAlarmEnabled',
	'ledPump1',
	'ledPump2',
	'ledPLC'
];

const TEMP_NAMES = [
	'temp1',
	'temp2',
	'temp3',
	'temp4',
];


// Initiates a new AJAX command
//	url: the url to access
//	container: the document ID to fill, or a function to call with response XML (optional)
//	repeat: true to repeat this call indefinitely (optional)
//	data: an URL encoded string to be submitted as POST data (optional)
function newAJAXCommand(url, container, repeat, data) {
	// Set up our object
	let newAjax = {};
	let theTimer = new Date();

	newAjax.url = url;
	newAjax.container = container;
	newAjax.repeat = repeat;
	newAjax.ajaxReq = null;

	// Create and send the request
	if (window.XMLHttpRequest) {
		newAjax.ajaxReq = new XMLHttpRequest();
		newAjax.ajaxReq.open(!data ? "GET" : "POST", newAjax.url, true);
		newAjax.ajaxReq.send(data);
		// If we're using IE6 style (maybe 5.5 compatible too)
	} else if (window.ActiveXObject) {
		newAjax.ajaxReq = new ActiveXObject("Microsoft.XMLHTTP");
		if (newAjax.ajaxReq) {
			newAjax.ajaxReq.open(!data ? "GET" : "POST", newAjax.url, true);
			newAjax.ajaxReq.send(data);
		}
	}

	newAjax.lastCalled = theTimer.getTime();

	// Store in our array
	ajaxList.push(newAjax);
}

// Loops over all pending AJAX events to determine if any action is required
function pollAJAX() {
	let curAjax = {};
	let theTimer = new Date();
	let elapsed;

	// Read off the ajaxList objects one by one
	for (i = ajaxList.length; i > 0; i--) {
		curAjax = ajaxList.shift();
		if (!curAjax)
			continue;
		elapsed = theTimer.getTime() - curAjax.lastCalled;

		// If we succeeded
		if (curAjax.ajaxReq.readyState === 4 && curAjax.ajaxReq.status === 200) {
			// If it has a container, write the result
			if (typeof(curAjax.container) === 'function') {
				curAjax.container(curAjax.ajaxReq.responseXML.documentElement);
			} else if (typeof(curAjax.container) === 'string') {
				document.getElementById(curAjax.container).innerHTML = curAjax.ajaxReq.responseText;
			} // (otherwise do nothing for null values)

			curAjax.ajaxReq.abort();
			curAjax.ajaxReq = null;

			// If it's a repeatable request, then do so
			if (curAjax.repeat)
				newAJAXCommand(curAjax.url, curAjax.container, curAjax.repeat);
			continue;
		}

		// If we've waited over 1 second, then we timed out
		if (elapsed > timeOutMS) {
			// Invoke the user function with null input
			if (typeof(curAjax.container) === 'function') {
				curAjax.container(null);
			} else {
				// Alert the user
				alert("Command failed.\nConnection to development board was lost.");
			}

			curAjax.ajaxReq.abort();
			curAjax.ajaxReq = null;

			// If it's a repeatable request, then do so
			if (curAjax.repeat)
				newAJAXCommand(curAjax.url, curAjax.container, curAjax.repeat);
			continue;
		}

		// Otherwise, just keep waiting
		ajaxList.push(curAjax);
	}

	// Call ourselves again in 10 ms
	setTimeout("pollAJAX()", 10);
}

// Parses the xmlResponse returned by an XMLHTTPRequest object
//	xmlData: the xmlData returned
//  field: the field to search for
function getXMLValue(xmlData, field) {
	try {
		if (xmlData.getElementsByTagName(field)[0].firstChild.nodeValue)
			return xmlData.getElementsByTagName(field)[0].firstChild.nodeValue;
		else
			return null;
	} catch (err) {
		return null;
	}
}

/**
 * this shit is to update your html
 */
function updateView(xmlData) {
	LED_NAMES.forEach(name => {
		const element = document.querySelector(`[data-indicator-name=${name}]`);
		const value = getXMLValue(xmlData, name);

		element.classList.remove('is-ok', 'is-not-ok');
		element.classList.add(value === 'on' ? 'is-ok' : 'is-not-ok');
	});

	TEMP_NAMES.forEach(name => {
		const element = document.querySelector(`[data-temp-name=${name}]`);

		element.innerHTML = getXMLValue(xmlData, name);
	});

	BUTTONS_NAMES.forEach(name => {
		const element = document.querySelector(`[data-button-name=${name}]`);
		const value = getXMLValue(xmlData, name);

		element.innerHTML = value;
		element.classList.remove('is-ok', 'is-not-ok');
		element.classList.add(value === 'on' ? 'is-ok' : 'is-not-ok');
	});

	const logsElement = document.querySelector('[data-system-logs]');

	logsElement.innerHTML = getXMLValue(xmlData, 'eventLog');
}

// Kick off the AJAX Updater
setTimeout("pollAJAX()", 500);

newAJAXCommand('/status.xml', updateView, true);


