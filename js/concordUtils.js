// Copyright 2013-2014, Small Picture, Inc.
// jshint esversion : 6

const appTypeIcons = {
	"blogpost": "file-text-alt",
	"code": "laptop",
	"html": "file-text-alt",
	"include": "share-alt", //5/19/13 by DW
	"index": "file-text-alt",
	"link": "bookmark-empty",
	"outline": "file-text-alt",
	"photo": "camera",
	"presentation": "file-text-alt",
	"redirect": "refresh",
	"river": "file-text-alt",
	"rss": "rss",
	"tabs": "file-text-alt",
	"thread": "comments",
	"thumblist": "th",
	"profile": "user", //5/14/13 by DW
	"calendar": "calendar", //6/3/13 by DW
	"markdown": "file-text-alt", //6/3/13 by DW
	"tweet": "twitter", //6/10/13 by DW
	"metaWeblogPost": "file-text-alt"
};

const defaultUtilsOutliner = "#outliner";

//op glue routines
const opUndo = () => {
	return $(defaultUtilsOutliner).concord().op.undo();
};

const opCut = () => {
	return $(defaultUtilsOutliner).concord().op.cut();
};

const opCopy = () => {
	return $(defaultUtilsOutliner).concord().op.copy();
};

const opPaste = () => {
	return $(defaultUtilsOutliner).concord().op.paste();
};

const opReorg = (dir, count) => {
	return $(defaultUtilsOutliner).concord().op.reorg(dir, count);
};

const opSetFont = (font, fontsize, lineheight) => {
	$(defaultUtilsOutliner).concord().prefs({
	   "outlineFont": font, 
	   "outlineFontSize": fontsize, 
	   "outlineLineHeight": lineheight
	});
};

const opPromote = () => {
	$(defaultUtilsOutliner).concord().op.promote();
};

const opDemote = () => {
	$(defaultUtilsOutliner).concord().op.demote();
};

const opBold = () => {
	return $(defaultUtilsOutliner).concord().op.bold();
};

const opItalic = () => {
	return $(defaultUtilsOutliner).concord().op.italic();
};

const opStrikeThrough = () => {
	return $(defaultUtilsOutliner).concord().op.strikeThrough();
};

const opUnderscore = () => {
	return $(defaultUtilsOutliner).concord().op.underline();
};

const opLink = url => {
	return $(defaultUtilsOutliner).concord().op.link(url);
};

const opSetTextMode = fltextmode => {
	$(defaultUtilsOutliner).concord().op.setTextMode(fltextmode);
};

const opInTextMode = () => {
	return $(defaultUtilsOutliner).concord().op.inTextMode();
};

const opGetAtts = () => {
	return $(defaultUtilsOutliner).concord().op.attributes.getAll();
};

const opGetOneAtt = name => {
	return $(defaultUtilsOutliner).concord().op.attributes.getOne(name);
};

const opHasAtt = name => {
	return opGetOneAtt(name) !== undefined;
};

const opSetOneAtt = (name, value) => {
	return $(defaultUtilsOutliner).concord().op.attributes.setOne(name, value);
};

const opSetAtts = atts => {
	return $(defaultUtilsOutliner).concord().op.attributes.setGroup(atts);
};

const opAddAtts = atts => {
	return $(defaultUtilsOutliner).concord().op.attributes.addGroup(atts);
};

const opSetStyle = css => {
	return $(defaultUtilsOutliner).concord().op.setStyle(css);
};

const opGetLineText = () => {
	return $(defaultUtilsOutliner).concord().op.getLineText();
};

const opExpand = () => {
	return $(defaultUtilsOutliner).concord().op.expand();
};

const opExpandAllLevels = () => {
	return $(defaultUtilsOutliner).concord().op.expandAllLevels();
};

const opExpandEverything = () => {
	return $(defaultUtilsOutliner).concord().op.fullExpand();
};

const opCollapse = () => {
	return $(defaultUtilsOutliner).concord().op.collapse();
};

const opIsComment = () => {
	return $(defaultUtilsOutliner).concord().script.isComment();
};

const opMakeComment = () => {
	return $(defaultUtilsOutliner).concord().script.makeComment();
};

const opUnComment = () => {
	return $(defaultUtilsOutliner).concord().script.unComment();
};

const opToggleComment = () => {
	if (opIsComment()) {
		opUnComment();
	} else {
		opMakeComment();
	}
};

const opCollapseEverything = () => {
	return $(defaultUtilsOutliner).concord().op.fullCollapse();
};

const opInsert = (s, dir) => {
	return $(defaultUtilsOutliner).concord().op.insert(s, dir);
};

const opInsertImage = url => {
	return $(defaultUtilsOutliner).concord().op.insertImage(url);
};

const opSetLineText = s => {
	return $(defaultUtilsOutliner).concord().op.setLineText(s);
};

const opDeleteSubs = () => {
	return $(defaultUtilsOutliner).concord().op.deleteSubs();
};

const opCountSubs = () => {
	return $(defaultUtilsOutliner).concord().op.countSubs();
};

const opHasSubs = () => {
	return opCountSubs() > 0;
};

const opSubsExpanded = () => {
	return $(defaultUtilsOutliner).concord().op.subsExpanded();
};

const opGo = (dir, ct) => {
	return $(defaultUtilsOutliner).concord().op.go(dir, ct);
};

const opFirstSummit = () => {
	opGo(left, 32767);
	opGo(up, 32767);
};

const opXmlToOutline = xmltext => {
	return $(defaultUtilsOutliner).concord().op.xmlToOutline(xmltext);
};

const opInsertXml = (xmltext, dir) => {
	return $(defaultUtilsOutliner).concord().op.insertXml(xmltext, dir);
};

const opOutlineToXml = (ownerName, ownerEmail, ownerId) => {
	return $(defaultUtilsOutliner).concord().op.outlineToXml(ownerName, ownerEmail, ownerId);
};

const opCursorToXml = () => {
	return $(defaultUtilsOutliner).concord().op.cursorToXml();
};

const opSetTitle = title => {
	return $(defaultUtilsOutliner).concord().op.setTitle(title);
};

const opGetTitle = () => {
	return $(defaultUtilsOutliner).concord().op.getTitle();
};

const opHasChanged = () => {
	return $(defaultUtilsOutliner).concord().op.changed();
};

const opClearChanged = () => {
	return $(defaultUtilsOutliner).concord().op.clearChanged();
};

const opMarkChanged = () => {
	return $(defaultUtilsOutliner).concord().op.markChanged();
};

const opRedraw = () => {
	return $(defaultUtilsOutliner).concord().op.redraw();
};

const opVisitAll = callback => { //9/13/13 by DW
	return $(defaultUtilsOutliner).concord().op.visitAll(callback);
};

const opWipe = () => {
	return $(defaultUtilsOutliner).concord().op.wipe();
};

const opToggleRenderMode = () => {
	return $(defaultUtilsOutliner).concord().op.setRenderMode(
	   !$(defaultUtilsOutliner).concord().op.getRenderMode());
};

//string routines
const filledString = (s, ct) => {
	return s.repeat(ct.length);
};

const multipleReplaceAll = (s, adrTable, flCaseSensitive, startCharacters, endCharacters) => {
	if (flCaseSensitive === undefined) {
		flCaseSensitive = false;
	}

	if (startCharacters === undefined) {
		startCharacters = "";
	}

	if (endCharacters === undefined) {
		endCharacters = "";
	}

	for (const item in adrTable) {
		const regularExpressionString =
		  (startCharacters + item + endCharacters).replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
		const regularExpression = new RegExp(regularExpressionString, flCaseSensitive ? "g" : "gi");
		
		s = s.replace(regularExpression, adrTable[item]);
	}
	return s;
};

//misc
const secondsSince = when => {
	const now = new Date();
	return (now - when) / 1000;
};
