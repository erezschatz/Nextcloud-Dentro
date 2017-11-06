// jshint esversion: 6, unused:true

const appConsts = {
	"productname": "Dentro",
	"productnameForDisplay": "Dentro Outliner",
	"domain": "dentro-outliner.com",
	"version": "0.52"
};

const appPrefs = {
	"outlineFont": "Arial", "outlineFontSize": 16, "outlineLineHeight": 24,
	"authorName": "", "authorEmail": ""
};

let whenLastKeystroke = new Date();
let cmdKeyPrefix = "Ctrl+";
let initialOpmltext;

const opInsertCallback = headline => {
	headline.attributes.setOne ("created", new Date().toUTCString());
};

const opHoverCallback = headline => {
	const atts = headline.attributes.getAll();
	//set cursor to pointer if there's a url attribute - 3/24/13  by DW
	document.body.style.cursor = atts.url !== undefined ||
								 atts.xmlUrl !== undefined ?
									"pointer" :
									"default";
};

const opKeystrokeCallback = event => {
	whenLastKeystroke = new Date();
};

const setOutlinerPrefs = (id, flRenderMode, flReadonly) => {
	$(id).concord ({
		"prefs": {
			"outlineFont": appPrefs.outlineFont,
			"outlineFontSize": appPrefs.outlineFontSize,
			"outlineLineHeight": appPrefs.outlineLineHeight,
			"renderMode": flRenderMode,
			"readonly": flReadonly,
			"typeIcons": appTypeIcons
		},
		"callbacks": {
			"opInsert": opInsertCallback,
			"opCursorMoved": () => {},
			"opExpand": () => {},
			"opHover": opHoverCallback,
			"opKeystroke": opKeystrokeCallback
		}
	});
};

const saveOutlineNow = () => {
    $.ajax({
        url: 'opml',
        method: 'POST',
        data: { 'content': opOutlineToXml(appPrefs.authorName, appPrefs.authorEmail) }
    }).done(function() {
        opClearChanged();
	});
};

const attachUrl = () => {
    const url = prompt("Enter URL for link:");
    if (url) {
        opLink(url);
    }
};

const backgroundProcess = () => {
    if (initialOpmltext) {
        opXmlToOutline(initialOpmltext);
        initialOpmltext = undefined;
    }
	if (opHasChanged() && secondsSince(whenLastKeystroke) >= 1) {
		saveOutlineNow();
	}
};

$(document).ready(function() {
	//9/20/13 by DW -- change initial value for renderMode from false to true
	setOutlinerPrefs("#outliner", true, false);
	opSetFont(appPrefs.outlineFont, appPrefs.outlineFontSize, appPrefs.outlineLineHeight);
	getOpml();
	self.setInterval(() => backgroundProcess(), 1000); //call every second
});

const getOpml = () => {
    $.ajax({
        url: 'opml',
        method: 'GET'
    }).done(function(data) {
        initialOpmltext = data.opml;
    });
};
