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

const initLocalStorage = () => {
	if (localStorage.savedOpmltext === undefined) {
		localStorage.savedOpmltext = initialOpmltext;
		editSource(urlConcordDocs); //9/14/13 by DW
	}
	if (localStorage.ctOpmlSaves === undefined) {
		localStorage.ctOpmlSaves = 0;
	}
	if (localStorage.whenLastSave === undefined) {
		localStorage.whenLastSave = new Date().toString();
	}
	if (localStorage.flTextMode === undefined) {
		localStorage.flTextMode = "true";
	}
};

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
	localStorage.savedOpmltext = opOutlineToXml(appPrefs.authorName, appPrefs.authorEmail);
	localStorage.ctOpmlSaves++;
	
	// const request = new XMLHttpRequest();
	// request.open('POST', 'erezschatz.net:5000', true);
	// request.send(opOutlineToXml("Erez Schatz", "erez.schatz@gmail.com", "erez"));
	
	opClearChanged();
};

const attachUrl = () => {
    const url = prompt("Enter URL for link:");
    if (url) {
        opLink(url);
    }
};

const backgroundProcess = () => {
	if (opHasChanged() && secondsSince(whenLastKeystroke) >= 1) {
		saveOutlineNow();
	}
};

const saveAsOpml = () => {
	const content = opOutlineToXml("Erez Schatz", "erez.schatz@gmail.com", "erez");
	const contentType = 'text/x-opml+xml';
	const blob = new Blob([content], {'type':contentType});
	saveAs(blob, "dentro.opml");
}

(function startup () {
	initLocalStorage();
	document.querySelector("#idMenuProductName").textContent = appConsts.productname;

	//init menu keystrokes
		if (navigator.platform.toLowerCase().substr (0, 3) == "mac") {
			cmdKeyPrefix = "&#8984;";
		}
		document.querySelectorAll("#idMenubar .dropdown-menu li").forEach(() => {
			const li = document.querySelector(this);
			li.innerHTML = li.innerHTML.replace("Cmd-", cmdKeyPrefix);
	});

	setOutlinerPrefs("#outliner", true, false); //9/20/13 by DW -- change initial value for renderMode from false to true
	opSetFont(appPrefs.outlineFont, appPrefs.outlineFontSize, appPrefs.outlineLineHeight);
	opXmlToOutline(localStorage.savedOpmltext);
	self.setInterval(() => backgroundProcess(), 1000); //call every second
})();

const handleFileSelect = evt => {
	const f = evt.target.files[0];
	if (!f || !f.name.match(/\.opml$/)) return;

	const reader = new FileReader();

	reader.onload = (e => {
		opXmlToOutline(e.target.result);
	});

	reader.readAsText(f);
};
