// Copyright 2013, Small Picture, Inc.

// jshint esversion: 6, unused:true

$(function () {
    if ($.fn.tooltip !== undefined) {
        $("a[rel=tooltip]").tooltip({
            live: true
        });
    }
});

$(function () {
    if ($.fn.popover !== undefined) {
        $("a[rel=popover]").on("mouseenter mouseleave", function() {
            $(this).popover("toggle");
        });
    }
});

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = (obj, start) => {
        for (let i = (start || 0), j = this.length; i < j; i++) {
            if (this[i] === obj) {
                return i;
            }
        }
        return -1;
    };
}

let concord = {
    version: "2.49",
    mobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent),
    ready: false,
    handleEvents: true,
    resumeCallbacks: [],
    onResume: function(cb) {
        this.resumeCallbacks.push(cb);
    },
    resumeListening: function() {
        if (!this.handleEvents) {
            this.handleEvents = true;
            let r = this.getFocusRoot();
            if (r !== null) {
                let c = new ConcordOutline(r.parent());
                if (c.op.inTextMode()) {
                    c.op.focusCursor();
                    c.editor.restoreSelection();
                } else {
                    c.pasteBinFocus();
                }
                for (let i in this.resumeCallbacks) {
                    let cb = this.resumeCallbacks[i];
                    cb();
                }
                this.resumeCallbacks = [];
            }
        }
    },
    stopListening: function() {
        if (this.handleEvents) {
            this.handleEvents = false;
            let r = this.getFocusRoot();
            if (r !== null) {
                let c = new ConcordOutline(r.parent());
                if (c.op.inTextMode()) {
                    c.editor.saveSelection();
                }
            }
        }
    },
    focusRoot: null,
    getFocusRoot: function() {
        if ($(".concord-root:visible").length === 1) {
            return this.setFocusRoot($(".concord-root:visible:first"));
        }
        if ($(".modal").is(":visible")) {
            if ($(".modal").find(".concord-root:visible:first").length === 1) {
                return this.setFocusRoot($(".modal").find(".concord-root:visible:first"));
            }
        }
        if (this.focusRoot === null) {
            if ($(".concord-root:visible").length > 0) {
                return this.setFocusRoot($(".concord-root:visible:first"));
            } else {
                return null;
            }
        }
        if (!this.focusRoot.is(":visible")) {
            return this.setFocusRoot($(".concord-root:visible:first"));
        }
        return this.focusRoot;
    },
    setFocusRoot: function(root) {
        const origRoot = this.focusRoot;
        const concordInstance = new ConcordOutline(root.parent());
        if (origRoot != null && origRoot[0] !== root[0]) {
            const origConcordInstance = new ConcordOutline(origRoot.parent());
            origConcordInstance.editor.hideContextMenu();
            origConcordInstance.editor.dragModeExit();
            if (concordInstance.op.inTextMode()) {
                concordInstance.op.focusCursor();
            } else {
                concordInstance.pasteBinFocus();
            }
        }
        this.focusRoot = root;
        return this.focusRoot;
    },
    updateFocusRootEvent: function(event) {
        const root = $(event.target).parents(".concord-root:first");
        if (root.length == 1) {
            concord.setFocusRoot(root);
        }
    }
};

let concordClipboard;

jQuery.fn.reverse = [].reverse;

//Constants
const down = "down";
const left = "left";
const right = "right";
const up = "up";
const flatup = "flatup";
const flatdown = "flatdown";
const XML_CHAR_MAP = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&'+'quot;'
};

let ConcordUtil = {
    escapeXml: function(s) {
        s = s.toString();
        s = s.replace(/\u00A0/g, " ");
        let escaped = s.replace(/[<>&"]/g, function(ch) {
            return XML_CHAR_MAP[ch];
        });
        return escaped;
    }
};

function ConcordOutline(container, options) {
    this.container = container;
    this.options = options;
    this.id = null;
    this.root = null;
    this.editor = null;
    this.op = null;
    this.script = null;
    this.pasteBin = null;

    this.pasteBinFocus = () => {
        if (!concord.ready) {
            return;
        }
        if (concord.mobile) {
            return;
        }
        if (this.root.is(":visible")) {
            let node = this.op.getCursor();
            let nodeOffset = node.offset();
            this.pasteBin.offset(nodeOffset);
            this.pasteBin.css("z-index","1000");
            if (this.pasteBin.text() == "" || this.pasteBin.text() == "\n") {
                this.pasteBin.text("...");
            }
            this.op.focusCursor();
            this.pasteBin.focus();
            if (this.pasteBin[0] === document.activeElement) {
                document.execCommand("selectAll");
            }
        }
    };

    this.callbacks = callbacks => {
        if (callbacks) {
            this.root.data("callbacks", callbacks);
            return callbacks;
        } else if (this.root.data("callbacks")) {
          return this.root.data("callbacks");
        } else {
            return {};
        }
    };

    this.fireCallback = (name, value) => {
        let cb = this.callbacks()[name];
        if (cb) {
            cb(value);
        }
    };

    this.prefs = newprefs => {
        let prefs = this.root.data("prefs");

        if (prefs === undefined) {
            prefs = {};
        }

        if (newprefs) {
            for (let key in newprefs) {
                prefs[key] = newprefs[key];
            }
            this.root.data("prefs", prefs);
            if (prefs.readonly) {
                this.root.addClass("readonly");
            }
            if (prefs.renderMode !== undefined) {
                this.root.data("renderMode", prefs.renderMode);
            }
            if (prefs.contextMenu) {
                $(prefs.contextMenu).hide();
            }
            let style = {};

            if (prefs.outlineFont) {
                style["font-family"] = prefs.outlineFont;
            }
            if (prefs.outlineFontSize) {
                prefs.outlineFontSize = parseInt(prefs.outlineFontSize);
                style["font-size"] = prefs.outlineFontSize + "px";
                style["min-height"] = (prefs.outlineFontSize + 6) + "px";
                style["line-height"] = (prefs.outlineFontSize + 6) + "px";
            }
            if (prefs.outlineLineHeight) {
                prefs.outlineLineHeight = parseInt(prefs.outlineLineHeight);
                style["min-height"] = prefs.outlineLineHeight + "px";
                style["line-height"] = prefs.outlineLineHeight + "px";
            }
	    
	    /* fix for NextCloud 13 */
	        style["margin"] = prefs.margin;
	        style["padding"] = prefs.padding;
	        style["border"] = prefs.border;
	        style["border-radius"] = prefs["border-radius"];
	        style["width"] = prefs.width;
	        style["background-color"] = prefs["background-color"];

            this.root.parent().find("style.prefsStyle").remove();
            let css = '<style type="text/css" class="prefsStyle">\n';
            let cssId = "";
            if (this.root.parent().attr("id")) {
                cssId = "#" + this.root.parent().attr("id");
            }
            css += cssId + ' .concord .concord-node .concord-wrapper .concord-text {';
            for (let attribute in style) {
                css += attribute + ': ' + style[attribute] + ';';
            }
            css += '}\n';
            css += cssId + ' .concord .concord-node .concord-wrapper .node-icon {';
	    delete style["width"];
            for (let attribute in style) {
                if (attribute != "font-family") {
                    css += attribute + ': ' + style[attribute] + ';';
                }
            }

            css += '}\n';

            let wrapperPaddingLeft = prefs.outlineLineHeight;
            if (wrapperPaddingLeft === undefined) {
                wrapperPaddingLeft = prefs.outlineFontSize;
            }

            if (wrapperPaddingLeft !== undefined) {
                css += cssId + ' .concord .concord-node .concord-wrapper {';
                css += "padding-left: " + wrapperPaddingLeft + "px";
                css += "}\n";
                css += cssId + ' .concord ol {';
                css += "padding-left: " + wrapperPaddingLeft + "px";
                css += "}\n";
            }
            css += '</style>\n';
            this.root.before(css);
            if (newprefs.css) {
                this.op.setStyle(newprefs.css);
            }
        }
        return prefs;
    };

    this.afterInit = () => {
        this.editor = new ConcordEditor(this.root, this);
        this.op = new ConcordOp(this.root, this);
        this.script = new ConcordScript(this.root, this);
        if (options) {
            if (options.prefs) {
                this.prefs(options.prefs);
            }
            if (options.open) {
                this.root.data("open", options.open);
            }
            if (options.save) {
                this.root.data("save", options.save);
            }
            if (options.callbacks) {
                this.callbacks(options.callbacks);
            }
            if (options.id) {
                this.root.data("id", options.id);
                this.open();
            }
        }
    };

    this.init = () => {
        if ($(container).find(".concord-root:first").length > 0) {
            this.root = $(container).find(".concord-root:first");
            this.pasteBin = $(container).find(".pasteBin:first");
            this.afterInit();
            return;
        }

        const root = $("<ol></ol>");
        root.addClass("concord concord-root");
        root.appendTo(container);
        this.root = root;

        const pasteBin = $('<div class="pasteBin" contenteditable="true" style="display: none; position: absolute; height: 1px; width:1px; outline:none; overflow:hidden;"></div>');
        pasteBin.appendTo(container);
        this.pasteBin = pasteBin;
        this.afterInit();
        this.events = new ConcordEvents(this.root, this.editor, this.op, this);
    };

    this["new"] = () => {
        this.op.wipe();
    };

    this["export"] = () => {
        let context = this.root.find(".concord-cursor:first");
        if (context.length === 0) {
            context = this.root.find(".concord-root:first");
        }
        return this.editor.opml(context);
    };

    this.init();
}

function ConcordEditor(root, concordInstance) {
    this.makeNode = () => {
        const node = $("<li></li>");
        node.addClass("concord-node");

        const wrapper = $("<div class='concord-wrapper'></div>");
        wrapper.append('<i class="node-icon icon-caret-right"></i>');
        wrapper.addClass("type-icon");

        const text = $("<div class='concord-text' contenteditable='true'></div>");
        const outline = $("<ol></ol>");
        text.appendTo(wrapper);
        wrapper.appendTo(node);
        outline.appendTo(node);
        return node;
    };

    this.dragMode = () => {
        root.data("draggingChange", root.children().clone(true, true));
        root.addClass("dragging");
        root.data("dragging", true);
    };

    this.dragModeExit = () => {
        if (root.data("dragging")) {
            concordInstance.op.markChanged();
            root.data("change", root.data("draggingChange"));
            root.data("changeTextMode", false);
            root.data("changeRange", undefined);
        }

        root.find(".draggable").removeClass("draggable");
        root.find(".drop-sibling").removeClass("drop-sibling");
        root.find(".drop-child").removeClass("drop-child");
        root.removeClass("dragging");
        root.data("dragging", false);
        root.data("mousedown", false);
    };

    this.edit = (node, empty) => {
        const text = node.children(".concord-wrapper:first").children(".concord-text:first");
        if (empty) {
            text.html("");
        }
        text.focus();

        const el = text.get(0);
        if (el && el.childNodes && el.childNodes[0]) {
            if (typeof window.getSelection != "undefined" &&
                typeof document.createRange != "undefined") {
                const range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);

                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } else if (typeof document.body.createTextRange != "undefined") {
                const textRange = document.body.createTextRange();
                textRange.moveToElementText(el);
                textRange.collapse(false);
                textRange.select();
            }
        }
        text.addClass("editing");
        if (!empty) {
            if (root.find(".concord-node.dirty").length > 0) {
                concordInstance.op.markChanged();
            }
        }
    };

    this.editable = target => {
        if (!target.hasClass("concord-text")) {
            target = target.parents(".concord-text:first");
        }
        if (target.length == 1) {
            return target.hasClass("concord-text") &&
                        target.hasClass("editing");
        }
        return false;
    };

    this.editorMode = () => {
        root.find(".selected").removeClass("selected");
        root.find(".editing").each(function() {
            $(this).removeClass("editing");
        });
        root.find(".selection-toolbar").remove();
    };

    this.opml = (_root, flsubsonly) => {
        if (flsubsonly === undefined) { //8/5/13 by DW
            flsubsonly = false;
        }

        if (_root) {
            root = _root;
        }

        let title = root.data("title");
        if (!title) {
            if (root.hasClass("concord-node")) {
                title = root.children(".concord-wrapper:first").
                                children(".concord-text:first").text();
            }
            else {
                title = "";
            }
        }

        let opml = '<?xml version="1.0"?>\n';
        opml += '<opml version="2.0">\n';
        opml += '<head>\n';
        opml += '<title>' + ConcordUtil.escapeXml(title) + '</title>\n';
        opml += '</head>\n';
        opml += '<body>\n';

        if (root.hasClass("concord-cursor")) {
            opml += this.opmlLine(root, 0, flsubsonly);
        } else {
            const editor = this;
            root.children(".concord-node").each(function() {
                opml += editor.opmlLine($(this));
            });
        }

        opml += '</body>\n';
        opml += '</opml>\n';
        return opml;
    };

    this.opmlLine = (node, indent, flsubsonly) => {
        if (indent === undefined) {
            indent = 0;
        }

        if (flsubsonly === undefined) { //8/5/13 by DW
            flsubsonly = false;
        }

        let text = this.unescape(
            node.children(".concord-wrapper:first").
                children(".concord-text:first").html());

        let textMatches = text.match(/^(.+)<br>\s*$/);
        if (textMatches) {
            text = textMatches[1];
        }

        let opml = '\t'.repeat(indent);

        let subheads;
        if (!flsubsonly) { //8/5/13 by DW
            opml += '<outline text="' + ConcordUtil.escapeXml(text) + '"';
            let attributes = node.data("attributes");
            if (attributes === undefined) {
                attributes = {};

            }
            for (let name in attributes) {
                if (name !== undefined && name != "" && name != "text") {
                    if (attributes[name] !== undefined) {
                        opml += ' ' + name + '="' + ConcordUtil.escapeXml(attributes[name]) + '"';
                    }
                }
            }
            subheads = node.children("ol").children(".concord-node");
            if (subheads.length === 0) {
                return opml + "/>\n";
            }
            opml += ">\n";
        } else {
            subheads = node.children("ol").children(".concord-node");
        }

        let editor = this;
        indent++;
        subheads.each(function() {
            opml += editor.opmlLine($(this), indent);
        });

        if (!flsubsonly) { //8/5/13 by DW
            opml += '\t'.repeat(indent);
            opml += '</outline>\n';
        }

        return opml;
    };

    this.textLine = (node, indent) => {
        if (indent < 0) {
            indent = 0;
        }
        let text = "\t".repeat(indent);

        text += this.unescape(
            node.children(".concord-wrapper:first").
                 children(".concord-text:first").html());
        text += "\n";

        const editor = this;
        node.children("ol").children(".concord-node").each(function() {
            text += editor.textLine($(this), indent + 1);
        });
        return text;
    };

    this.select = function(node, multiple, multipleRange) {
        if (multiple === undefined) {
            multiple = false;
        }
        if (multipleRange === undefined) {
            multipleRange = false;
        }
        if (node.length == 1) {
            this.selectionMode(multiple);
            if (multiple) {
                node.parents(".concord-node.selected").removeClass("selected");
                node.find(".concord-node.selected").removeClass("selected");
            }
            if (multiple && multipleRange) {
                let prevNodes = node.prevAll(".selected");
                if (prevNodes.length > 0) {
                    let stamp = false;
                    node.prevAll().reverse().each(function() {
                        if ($(this).hasClass("selected")) {
                            stamp = true;
                        } else if (stamp) {
                            $(this).addClass("selected");
                        }
                    });
                } else {
                    let nextNodes = node.nextAll(".selected");
                    if (nextNodes.length > 0) {
                        let stamp = true;
                        node.nextAll().each(function() {
                            if ($(this).hasClass("selected")) {
                                stamp = false;
                            } else if (stamp) {
                                $(this).addClass("selected");
                            }
                        });
                    }
                }
            }

            let text = node.children(".concord-wrapper:first").children(".concord-text:first");
            if (text.hasClass("editing")) {
                text.removeClass("editing");
            }

            node.addClass("selected");
            this.dragModeExit();
        }
        if (root.find(".concord-node.dirty").length>0) {
            concordInstance.op.markChanged();
        }
    };

    this.selectionMode = function(multiple) {
        if (multiple === undefined) {
            multiple = false;
        }

        if (!multiple) {
            root.find(".selected").removeClass("selected");
        }
        root.find(".selection-toolbar").remove();
    };

    this.build = function(outline,collapsed, level) {
        if (!level) {
            level = 1;
        }
        let node = $("<li></li>");
        node.addClass("concord-node");
        node.addClass("concord-level-" + level);
        let attributes = {};

        $(outline[0].attributes).each(function() {
            if (this.name != 'text') {
                attributes[this.name] = this.value;
                if (this.name == "type") {
                    node.attr("opml-" + this.name, this.value);
                }
            }
        });

        node.data("attributes", attributes);
        let wrapper = $("<div class='concord-wrapper'></div>");

        let nodeIcon = attributes.icon ? attributes.icon : attributes.type;

        let iconName = "caret-right";
        if (nodeIcon) {
            if (nodeIcon == node.attr("opml-type") &&
                concordInstance.prefs() &&
                concordInstance.prefs().typeIcons &&
                concordInstance.prefs().typeIcons[nodeIcon]) {
                iconName = concordInstance.prefs().typeIcons[nodeIcon];
            } else if (nodeIcon == attributes.icon) {
                iconName = nodeIcon;
            }
        }

        let icon = "<i"+" class=\"node-icon icon-"+ iconName +"\"><"+"/i>";
        wrapper.append(icon);
        wrapper.addClass("type-icon");
        if (attributes.isComment == "true") {
            node.addClass("concord-comment");
        }

        const text = $("<div class='concord-text' contenteditable='true'></div>");
        text.addClass("concord-level-" + level + "-text");
        text.html(this.escape(outline.attr('text')));

        if (attributes.cssTextClass !== undefined) {
            let cssClasses = attributes.cssTextClass.split(/\s+/);
            for (let c in cssClasses) {
                text.addClass(cssClasses[c]);
            }
        }

        let children = $("<ol></ol>");
        const editor = this;
        outline.children("outline").each(function() {
            editor.build($(this), collapsed, level + 1).appendTo(children);
        });

        if (collapsed) {
            if (outline.children("outline").length > 0) {
                node.addClass("collapsed");
            }
        }
        text.appendTo(wrapper);
        wrapper.appendTo(node);
        children.appendTo(node);
        return node;
    };

    this.hideContextMenu = () => {
        if (root.data("dropdown")) {
            root.data("dropdown").hide();
            root.data("dropdown").remove();
            root.removeData("dropdown");
        }
    };

    this.showContextMenu = (x, y) => {
        if (concordInstance.prefs().contextMenu) {
            this.hideContextMenu();
            root.data("dropdown",
                $(concordInstance.prefs().contextMenu).clone().appendTo(concordInstance.container));

            const editor = this;
            root.data("dropdown").on("click", "a", function(event) {
                editor.hideContextMenu();
            });

            root.data("dropdown").css({
                "position" : "absolute",
                "top" : y + "px",
                "left" : x + "px",
                "cursor" : "default"
            });

            root.data("dropdown").show();
        }
    };

    this.sanitize = () => {
        root.find(".concord-text.paste").each(function() {
            let concordText = $(this);
            if (concordInstance.pasteBin.text() == "...") {
                return;
            }

            let h = concordInstance.pasteBin.html().replace(
                new RegExp("<(div|p|blockquote|pre|li|br|dd|dt|code|h\\d)[^>]*(/)?>","gi"),"\n"
            );
            h = $("<div/>").html(h).text();

            let clipboardMatch = false;
            if (concordClipboard !== undefined) {
                let trimmedClipboardText = concordClipboard.text.replace(/^[\s\r\n]+|[\s\r\n]+$/g,'');
                let trimmedPasteText = h.replace(/^[\s\r\n]+|[\s\r\n]+$/g,'');
                if (trimmedClipboardText == trimmedPasteText) {
                    let clipboardNodes = concordClipboard.data;
                    if (clipboardNodes) {
                        let collapseNode = function(node) {
                            node.find("ol").each(function() {
                                if ($(this).children().length > 0) {
                                    $(this).parent().addClass("collapsed");
                                }
                            });
                        };

                        clipboardNodes.each(function() {
                            collapseNode($(this));
                        });
                        root.data("clipboard", clipboardNodes);
                        concordInstance.op.setTextMode(false);
                        concordInstance.op.paste();
                        clipboardMatch = true;
                    }
                }
            }

            if (!clipboardMatch) {
                concordClipboard = undefined;
                let numberoflines = 0;
                let lines = h.split("\n");
                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i];
                    if (line != "" && !line.match(/^\s+$/)) {
                        numberoflines++;
                    }
                }
                if (!concordInstance.op.inTextMode() || numberoflines > 1) {
                    concordInstance.op.insertText(h);
                } else {
                    concordInstance.op.saveState();
                    concordText.focus();
                    let range = concordText.parents(".concord-node:first").data("range");
                    if (range) {
                        try{
                            let sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                        catch(e) {
                            console.log(e);
                        }
                        finally {
                            concordText.parents(".concord-node:first").removeData("range");
                        }
                    }
                    document.execCommand("insertText",null,h);
                    concordInstance.root.removeData("clipboard");
                    concordInstance.op.markChanged();
                }
            }
            concordText.removeClass("paste");
        });
    };

    this.escape = function(s) {
        let h = $("<div/>").text(s).html().replace(/\u00A0/g, " ");

        if (concordInstance.op.getRenderMode()) {
        // Render HTML if op.getRenderMode() returns true - 2/17/13 by KS
            let allowedTags = ["b","strong","i","em","a","img","strike","del","p","u","br"];

            for (let tagIndex in allowedTags) {
                let tag = allowedTags[tagIndex];
                if (tag == "img") {
                    h = h.replace(
                        new RegExp("&lt;" + tag + "((?!&gt;).+)(/)?&gt;","gi"),
                        "<" + tag + "$1/>"
                    );
                } else if (tag == "a") {
                    h = h.replace(
                        new RegExp(
                            "&lt;" + tag + "((?!&gt;).*?)&gt;((?!&lt;/" +
                                    tag + "&gt;).+?)&lt;/" + tag + "&gt;","gi"),
                        "<"+tag+"$1"+">$2"+"<"+"/"+tag+">");
                } else if (tag == "br") {
                    h = h.replace(
                        new RegExp("&lt;" + tag + "４&gt;"),
                        "<" + tag + ">");
                } else {
                    h = h.replace(
                        new RegExp(
                            "&lt;" + tag + "&gt;((?!&lt;/" + tag + "&gt;).+?)&lt;/"+tag+"&gt;","gi"),
                            "<" + tag + ">$1" + "<" + "/" + tag + ">");
                }
            }
        }
        return h;
    };

    this.unescape = s => {
        return $("<div/>").html(s.replace(/</g,"&lt;").replace(/>/g,"&gt;")).text();
    };

    this.getSelection = () => {
        let range;

        if (window.getSelection) {
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                if ($(range.startContainer).parents(".concord-node:first").length === 0) {
                    range = undefined;
                }
            }
        }
        return range;
    };

    this.saveSelection = () => {
        let range = this.getSelection();
        if (range !== undefined) {
            concordInstance.op.getCursor().data("range", range.cloneRange());
        }
        return range;
    };

    this.restoreSelection = range => {
        let cursor = concordInstance.op.getCursor();
        if (range === undefined) {
            range = cursor.data("range");
        }
        if (range !== undefined) {
            if (window.getSelection) {
                //let concordText = cursor.children(".concord-wrapper").children(".concord-text");
                try{
                    const cloneRanger = range.cloneRange();
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(cloneRanger);
                }
                catch(e) {
                    console.log(e);
                }
                finally {
                    cursor.removeData("range");
                }
            }
        }
        return range;
    };

    this.recalculateLevels = context => {
        if (!context) {
            context = root.find(".concord-node");
        }
        context.each(function() {
            let text = $(this).children(".concord-wrapper").children(".concord-text");
            let levelMatch = $(this).attr("class").match(/.*concord-level-(\d+).*/);
            if (levelMatch) {
                $(this).removeClass("concord-level-"+levelMatch[1]);
                text.removeClass("concord-level-"+levelMatch[1]+"-text");
            }
            let level = $(this).parents(".concord-node").length+1;
            $(this).addClass("concord-level-"+level);
            text.addClass("concord-level-"+level+"-text");
        });
    };
}

function ConcordEvents(root, editor, op, concordInstance) {
    let instance = this;
    this.wrapperDoubleClick = event => {
        if (!concord.handleEvents) {
            return;
        }
        if (root.data("dropdown")) {
            editor.hideContextMenu();
            return;
        }
        if (!editor.editable($(event.target))) {
            let wrapper = $(event.target);
            if (wrapper.hasClass("node-icon")) {
                wrapper = wrapper.parent();
            }
            if (wrapper.hasClass("concord-wrapper")) {
                event.stopPropagation();
                //let node = wrapper.parents(".concord-node:first");
                op.setTextMode(false);
                if (op.subsExpanded()) {
                    op.collapse();
                } else {
                    op.expand();
                }
            }
        }
    };

    this.clickSelect = event => {
        if (!concord.handleEvents) {
            return;
        }
        if (root.data("dropdown")) {
            event.stopPropagation();
            editor.hideContextMenu();
            return;
        }
        if (concord.mobile) {
            const node = $(event.target);
            if (concordInstance.op.getCursor()[0] === node[0]) {
                instance.doubleClick(event);
                return;
            }
        }
        if (event.which == 1 && !editor.editable($(event.target))) {
            let node = $(event.target);
            if (!node.hasClass("concord-node")) {
                return;
            }
            if (node.length == 1) {
                event.stopPropagation();
                if (event.shiftKey && node.parents(".concord-node.selected").length > 0) {
                    return;
                }
                op.setTextMode(false);
                op.setCursor(node, event.shiftKey || event.metaKey, event.shiftKey);
            }
        }
    };

    this.doubleClick = event => {
        if (!concord.handleEvents) {
            return;
        }

        if (root.data("dropdown")) {
            editor.hideContextMenu();
            return;
        }

        if (!editor.editable($(event.target))) {
            let node = $(event.target);
            if (node.hasClass("concord-node") && node.hasClass("concord-cursor")) {
                event.stopPropagation();
                op.setTextMode(false);
                op.setCursor(node);

                if (op.subsExpanded()) {
                    op.collapse();
                } else {
                    op.expand();
                }
            }
        }
    };

    this.wrapperClickSelect = event => {
        if (!concord.handleEvents) {
            return;
        }

        if (root.data("dropdown")) {
            editor.hideContextMenu();
            return;
        }

        if (concord.mobile) {
            const node = $(event.target).parents(".concord-node:first");

            if (concordInstance.op.getCursor()[0] === node[0]) {
                instance.wrapperDoubleClick(event);
                return;
            }
        }

        if (event.which === 1 && !editor.editable($(event.target))) {
            let wrapper = $(event.target);

            if (wrapper.hasClass("node-icon")) {
                wrapper = wrapper.parent();
            }

            if (wrapper.hasClass("concord-wrapper")) {
                let node = wrapper.parents(".concord-node:first");
                if (event.shiftKey && node.parents(".concord-node.selected").length > 0) {
                    return;
                }
                op.setTextMode(false);
                op.setCursor(node, event.shiftKey || event.metaKey, event.shiftKey);
            }
        }
    };

    this.contextmenu = event => {
        if (!concord.handleEvents) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        let node = $(event.target);
        if (node.hasClass("concord-wrapper") || node.hasClass("node-icon")) {
            op.setTextMode(false);
        }
        if (!node.hasClass("concord-node")) {
            node = node.parents(".concord-node:first");
        }
        concordInstance.fireCallback("opContextMenu", op.setCursorContext(node));
        op.setCursor(node);
        editor.showContextMenu(event.pageX, event.pageY);
    };

    root.on("dblclick", ".concord-wrapper", this.wrapperDoubleClick);
    root.on("dblclick", ".concord-node", this.doubleClick);
    root.on("dblclick", ".concord-text", function(event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs().readonly) {
            event.preventDefault();
            event.stopPropagation();

            let node = $(event.target).parents(".concord-node:first");
            op.setCursor(node);

            if (op.subsExpanded()) {
                op.collapse();
            } else {
                op.expand();
            }
        }
    });
    root.on("click", ".concord-wrapper", this.wrapperClickSelect);
    root.on("click", ".concord-node", this.clickSelect);
    root.on("mouseover", ".concord-wrapper", function(event) {
        if (!concord.handleEvents) {
            return;
        }
        let node = $(event.target).parents(".concord-node:first");
        concordInstance.fireCallback("opHover", op.setCursorContext(node));
    });
    if (concordInstance.prefs.contextMenu) {
        root.on("contextmenu", ".concord-text", this.contextmenu);
        root.on("contextmenu", ".concord-node", this.contextmenu);
        root.on("contextmenu", ".concord-wrapper", this.contextmenu);
    }
    root.on("blur", ".concord-text", function(event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs().readonly) {
            return;
        }
        if ($(this).html().match(/^\s*<br>\s*$/)) {
            $(this).html("");
        }
        //let concordText = $(this);
        let node = $(this).parents(".concord-node:first");
        if (concordInstance.op.inTextMode()) {
            editor.saveSelection();
        }
        if (concordInstance.op.inTextMode() && node.hasClass("dirty")) {
            node.removeClass("dirty");
        }
    });
    root.on("paste", ".concord-text", function(event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs().readonly) {
            return;
        }
        $(this).addClass("paste");
        concordInstance.editor.saveSelection();
        concordInstance.pasteBin.html("");
        concordInstance.pasteBin.focus();
        setTimeout(editor.sanitize,10);
    });
    concordInstance.pasteBin.on("copy", function() {
        if (!concord.handleEvents) {
            return;
        }
        let copyText = "";
        root.find(".selected").each(function() {
            copyText+= concordInstance.editor.textLine($(this));
        });
        if (copyText != "" && copyText != "\n") {
            concordClipboard = {text: copyText, data: root.find(".selected").clone(true, true)};

            concordInstance.pasteBin.html("<pre>"+$("<div/>").text(copyText).html()+"</pre>");
            concordInstance.pasteBin.focus();
            document.execCommand("selectAll");
        }
    });
    concordInstance.pasteBin.on("paste", function(event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs().readonly) {
            return;
        }

        const concordText = concordInstance.op.getCursor().
                            children(".concord-wrapper").children(".concord-text");
        concordText.addClass("paste");
        concordInstance.pasteBin.html("");
        setTimeout(editor.sanitize,10);
    });
    concordInstance.pasteBin.on("cut", function() {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs().readonly) {
            return;
        }
        let copyText = "";
        root.find(".selected").each(function() {
            copyText += concordInstance.editor.textLine($(this));
        });

        if (copyText != "" && copyText != "\n") {
            concordClipboard = {text: copyText, data: root.find(".selected").clone(true, true)};

            concordInstance.pasteBin.html("<pre>"+$("<div/>").text(copyText).html()+"</pre>");
            concordInstance.pasteBinFocus();
        }
        concordInstance.op.deleteLine();
        setTimeout(() => concordInstance.pasteBinFocus(), 200);
    });

    root.on("mousedown", function(event) {
        if (!concord.handleEvents) {
            return;
        }
        let target = $(event.target);
        if (target.is("a")) {
            if (target.attr("href")) {
                event.preventDefault();
                window.open(target.attr("href"));
            }
            return;
        }
        if (concordInstance.prefs().readonly) {
            event.preventDefault();
            let target = $(event.target);
            if (target.parents(".concord-text:first").length == 1) {
                target = target.parents(".concord-text:first");
            }
            if (target.hasClass("concord-text")) {
                let node = target.parents(".concord-node:first");
                if (node.length == 1) {
                    op.setCursor(node);
                }
            }
            return;
        }
        if (event.which == 1) {
            if (root.data("dropdown")) {
                editor.hideContextMenu();
                return;
            }
            if (target.parents(".concord-text:first").length == 1) {
                target = target.parents(".concord-text:first");
            }
            if (target.hasClass("concord-text")) {
                let node = target.parents(".concord-node:first");
                if (node.length == 1) {
                    if (!root.hasClass("textMode")) {
                        root.find(".selected").removeClass("selected");
                        root.addClass("textMode");
                    }
                    if (node.children(".concord-wrapper").children(".concord-text").hasClass("editing")) {
                        root.find(".editing").removeClass("editing");
                        node.children(".concord-wrapper").children(".concord-text").addClass("editing");
                    }
                    if (!node.hasClass("concord-cursor")) {
                        root.find(".concord-cursor").removeClass("concord-cursor");
                        node.addClass("concord-cursor");
                        concordInstance.fireCallback("opCursorMoved", op.setCursorContext(node));
                    }
                }
            } else {
                    event.preventDefault();
                    root.data("mousedown", true);
                }
        }
    });
    root.on("mousemove", function(event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs().readonly) {
            return;
        }
        if (!editor.editable($(event.target))) {
            event.preventDefault();
            if (root.data("mousedown") && !root.data("dragging")) {
                let target = $(event.target);
                if (target.hasClass("node-icon")) {
                    target = target.parent();
                }
                if (target.hasClass("concord-wrapper") && target.parent().hasClass("selected")) {
                    editor.dragMode();
                }
            }
        }
    });
    root.on("mouseup", function(event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs().readonly) {
            return;
        }
        let target = $(event.target);
        if (target.hasClass("concord-node")) {
            target = target.children(".concord-wrapper:first").children(".concord-text:first");
        } else if (target.hasClass("concord-wrapper")) {
                target = target.children(".concord-text:first");
            }
        if (!editor.editable(target)) {
            root.data("mousedown", false);
            if (root.data("dragging")) {
                let target = $(event.target);
                let node = target.parents(".concord-node:first");
                let draggable = root.find(".selected");
                if (node.length == 1 && draggable.length >= 1) {
                    let isDraggableTarget = false;
                    draggable.each(function() {
                        if (this == node[0]) {
                            isDraggableTarget = true;
                        }
                    });
                    if (!isDraggableTarget) {
                        let draggableIsTargetParent = false;
                        node.parents(".concord-node").each(function() {
                            let nodeParent = $(this)[0];
                            draggable.each(function() {
                                if ($(this)[0] == nodeParent) {
                                    draggableIsTargetParent = true;
                                }
                            });
                        });
                        if (!draggableIsTargetParent) {
                            if (target.hasClass("concord-wrapper") || target.hasClass("node-icon")) {
                                let clonedDraggable = draggable.clone(true, true);
                                clonedDraggable.insertAfter(node);
                                draggable.remove();
                            } else {
                                    let clonedDraggable = draggable.clone(true, true);
                                    let outline = node.children("ol");
                                    clonedDraggable.prependTo(outline);
                                    node.removeClass("collapsed");
                                    draggable.remove();
                                }
                        }
                    } else {
                            let prev = node.prev();
                            if (prev.length == 1) {
                                if (prev.hasClass("drop-child")) {
                                    let clonedDraggable = draggable.clone(true, true);
                                    let outline = prev.children("ol");
                                    clonedDraggable.appendTo(outline);
                                    prev.removeClass("collapsed");
                                    draggable.remove();
                                }
                            }
                        }
                }
                editor.dragModeExit();
                concordInstance.editor.recalculateLevels();
            }
        }
    });
    root.on("mouseover", function(event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs().readonly) {
            return;
        }
        if (root.data("dragging")) {
            event.preventDefault();

            const target = $(event.target);
            const node = target.parents(".concord-node:first");
            const draggable = root.find(".selected");

            if (node.length == 1 && draggable.length >= 1) {
                let isDraggableTarget = false;
                draggable.each(function() {
                    if (this == node[0]) {
                        isDraggableTarget = true;
                    }
                });

                if (!isDraggableTarget) {
                    let draggableIsTargetParent = false;
                    node.parents(".concord-node").each(function() {
                        let nodeParent = $(this)[0];
                        draggable.each(function() {
                            if ($(this)[0] == nodeParent) {
                                draggableIsTargetParent = true;
                            }
                        });
                    });
                    if (!draggableIsTargetParent) {
                        node.removeClass("drop-sibling").remove("drop-child");
                        if (target.hasClass("concord-wrapper") || target.hasClass("node-icon")) {
                            node.addClass("drop-sibling");
                        } else {
                            node.addClass("drop-child");
                        }
                    }
                } else if (draggable.length == 1) {
                    let prev = node.prev();
                    if (prev.length == 1) {
                        prev.removeClass("drop-sibling").remove("drop-child");
                        prev.addClass("drop-child");
                    }
                }
            }
        }
    });
    root.on("mouseout", function(event) {
        if (!concord.handleEvents) {
            return;
        }

        if (concordInstance.prefs().readonly) {
            return;
        }

        if (root.data("dragging")) {
            root.find(".drop-sibling").removeClass("drop-sibling");
            root.find(".drop-child").removeClass("drop-child");
        }
    });
}

function ConcordOp(root, concordInstance, _cursor) {
    this._walk_up = context => {
        let prev = context.prev();
        if (prev.length === 0) {
            let parent = context.parents(".concord-node:first");
            return parent.length == 1 ? parent : null;
        } else {
            return this._last_child(prev);
        }
    };

    this._walk_down = context => {
        let next = context.next();
        if (next.length == 1) {
            return next;
        } else {
            let parent = context.parents(".concord-node:first");
            return parent.length == 1 ? this._walk_down(parent) : null;
        }
    };

    this._last_child = context => {
        if (context.hasClass("collapsed")) {
            return context;
        }
        let outline = context.children("ol");
        if (outline.length === 0) {
            return context;
        } else {
            let lastChild = outline.children(".concord-node:last");
            return lastChild.length == 1 ? this._last_child(lastChild) : context;
        }
    };

    this.bold = () => {
        this.formatText("bold");
    };

    this.strikeThrough = () => {
        this.formatText("strikeThrough");
    };

    this.italic = () => {
        this.formatText("italic");
    };

    this.underline = () => {
        this.formatText("underline");
    };

    this.formatText = modification => {
        this.saveState();
        if (this.inTextMode()) {
            document.execCommand(modification);
        } else {
                this.focusCursor();
                document.execCommand("selectAll");
                document.execCommand(modification);
                document.execCommand("unselect");
                this.blurCursor();
                concordInstance.pasteBinFocus();
            }
        this.markChanged();
    };

    this.changed = () => {
        return root.data("changed");
    };

    this.clearChanged = () => {
        root.data("changed", false);
        return true;
    };

    this.collapse = triggerCallbacks => {
        if (triggerCallbacks === undefined) {
            triggerCallbacks = true;
        }

        let node = this.getCursor();
        if (node.length == 1) {
            if (triggerCallbacks) {
                concordInstance.fireCallback("opCollapse", this.setCursorContext(node));
            }
            node.addClass("collapsed");
            node.find("ol").each(function() {
                if ($(this).children().length > 0) {
                    $(this).parent().addClass("collapsed");
                }
            });
            this.markChanged();
        }
    };

    this.copy = () => {
        if (!this.inTextMode()) {
            root.data("clipboard", root.find(".selected").clone(true, true));
        }
    };

    this.countSubs = () => {
        let node = this.getCursor();
        if (node.length == 1) {
            return node.children("ol").children().length;
        }
        return 0;
    };

    this.cursorToXml = () => {
        return concordInstance.editor.opml(this.getCursor());
    };

    this.cursorToXmlSubsOnly = () => { //8/5/13 by DW
        return concordInstance.editor.opml(this.getCursor(), true);
    };

    this.cut = () => {
        if (!this.inTextMode()) {
            this.copy();
            this.deleteLine();
        }
    };

    this.deleteLine = () => {
        this.saveState();
        if (this.inTextMode()) {
            let cursor = this.getCursor();
            let p = cursor.prev();
            if (p.length === 0) {
                p = cursor.parents(".concord-node:first");
            }

            cursor.remove();
            if (p.length === 1) {
                this.setCursor(p);
            } else {
                if (root.find(".concord-node:first").length === 1) {
                    this.setCursor(root.find(".concord-node:first"));
                } else {
                    this.wipe();
                }
            }
        } else {
            let selected = root.find(".selected");
            if (selected.length == 1) {
                let p = selected.prev();
                if (p.length === 0) {
                    p = selected.parents(".concord-node:first");
                }
                selected.remove();
                if (p.length === 1) {
                    this.setCursor(p);
                } else {
                    if (root.find(".concord-node:first").length === 1) {
                        this.setCursor(root.find(".concord-node:first"));
                    } else {
                        this.wipe();
                    }
                }
            } else if (selected.length > 1) {
                    let first = root.find(".selected:first");
                    let p = first.prev();
                    if (p.length === 0) {
                        p = first.parents(".concord-node:first");
                    }
                    selected.each(function() {
                        $(this).remove();
                    });
                    if (p.length === 1) {
                        this.setCursor(p);
                    } else {
                        if (root.find(".concord-node:first").length === 1) {
                            this.setCursor(root.find(".concord-node:first"));
                        } else {
                            this.wipe();
                        }
                    }
                }
            }
        if (root.find(".concord-node").length === 0) {
            this.setCursor(this.insert("", down));
        }
        this.markChanged();
    };

    this.deleteSubs = () => {
        const node = this.getCursor();
        if (node.length === 1) {
            if (node.children("ol").children().length > 0) {
                this.saveState();
                node.children("ol").empty();
            }
        }
        this.markChanged();
    };

    this.demote = () => {
        const node = this.getCursor();
        //let movedSiblings = false;
        if (node.nextAll().length > 0) {
            this.saveState();
            node.nextAll().each(function() {
                let sibling = $(this).clone(true, true);
                $(this).remove();
                sibling.appendTo(node.children("ol"));
                node.removeClass("collapsed");
            });
            concordInstance.editor.recalculateLevels(node.find(".concord-node"));
            this.markChanged();
        }
    };

    this.expand = triggerCallbacks => {
        if (triggerCallbacks === undefined) {
            triggerCallbacks = true;
        }

        const node = this.getCursor();
        if (node.length == 1) {
            if (triggerCallbacks) {
                concordInstance.fireCallback("opExpand", this.setCursorContext(node));
            }
            if (!node.hasClass("collapsed")) {
                return;
            }
            node.removeClass("collapsed");
            let cursorPosition = node.offset().top;
            let cursorHeight = node.height();
            let windowPosition = $(window).scrollTop();
            let windowHeight = $(window).height();

            if (cursorPosition < windowPosition || cursorPosition + cursorHeight > windowPosition + windowHeight) {
                if (cursorPosition < windowPosition) {
                    $(window).scrollTop(cursorPosition);
                } else if (cursorPosition + cursorHeight > windowPosition + windowHeight) {
                    let lineHeight = parseInt(node.children(".concord-wrapper").children(".concord-text").css("line-height")) + 6;
                    if (cursorHeight + lineHeight < windowHeight) {
                        $(window).scrollTop(cursorPosition - (windowHeight-cursorHeight)+lineHeight);
                    } else {
                        $(window).scrollTop(cursorPosition);
                    }
                }
            }
            this.markChanged();
        }
    };

    this.expandAllLevels = () => {
        const node = this.getCursor();
        if (node.length == 1) {
            node.removeClass("collapsed");
            node.find(".concord-node").removeClass("collapsed");
        }
    };

    this.focusCursor = () => {
        this.getCursor().children(".concord-wrapper").children(".concord-text").focus();
    };

    this.blurCursor = () => {
        this.getCursor().children(".concord-wrapper").children(".concord-text").blur();
    };

    this.fullCollapse = () => {
        root.find(".concord-node").each(function() {
            if ($(this).children("ol").children().length > 0) {
                $(this).addClass("collapsed");
            }
        });
        const cursor = this.getCursor();
        const topParent = cursor.parents(".concord-node:last");
        if (topParent.length == 1) {
            concordInstance.editor.select(topParent);
        }
    };

    this.fullExpand = () => {
        root.find(".concord-node").removeClass("collapsed");
    };

    this.getCursor = () => {
        if (_cursor) {
            return _cursor;
        }
        return root.find(".concord-cursor:first");
    };

    this.getCursorRef = () => {
        return this.setCursorContext(this.getCursor());
    };

    this.getHeaders = () => {
        let headers = {};

        if (root.data("head")) {
            headers = root.data("head");
        }
        headers.title = this.getTitle();
        return headers;
    };

    this.getLineText = () => {
        const node = this.getCursor();
        if (node.length == 1) {
            let text = node.children(".concord-wrapper:first").children(".concord-text:first").html();
            const textMatches = text.match(/^(.+)<br>\s*$/);
            if (textMatches) {
                text = textMatches[1];
            }
            return concordInstance.editor.unescape(text);
        } else {
            return null;
        }
    };

    this.getRenderMode = () => {
        return root.data("renderMode") === undefined || root.data("renderMode");
    };

    this.getTitle = () => {
        return root.data("title");
    };

    this.getNext = cursor => {
        if (!cursor.hasClass("collapsed") &&
            cursor.children("ol").length == 1 &&
            cursor.children("ol").children(".concord-node:first").length == 1) {
            return cursor.children("ol").children(".concord-node:first");
        }
        return null;
    };

    this.go = (direction, count, multiple, textMode) => {
        if (count === undefined) {
            count = 1;
        }
        let cursor = this.getCursor();
        if (textMode === undefined) {
            textMode = false;
        }

        this.setTextMode(textMode);
        let ableToMoveInDirection = false;

        let nodeCount = 0;
        switch(direction) {
            case up:
                for (let i = 0; i < count; i++) {
                    let prev = cursor.prev();
                    if (prev.length == 1) {
                        cursor = prev;
                        ableToMoveInDirection = true;
                    } else {
                        break;
                    }
                }
                this.setCursor(cursor, multiple);
                break;

            case down:
                for (let i = 0; i < count; i++) {
                    let next = cursor.next();
                    if (next.length == 1) {
                        cursor = next;
                        ableToMoveInDirection = true;
                    } else {
                        break;
                    }
                }
                this.setCursor(cursor, multiple);
                break;

            case left:
                for (let i = 0; i < count; i++) {
                    let parent = cursor.parents(".concord-node:first");
                    if (parent.length == 1) {
                        cursor = parent;
                        ableToMoveInDirection = true;
                    } else {
                        break;
                    }
                }
                this.setCursor(cursor, multiple);
                break;

            case right:
                for (let i = 0; i < count; i++) {
                    let firstSibling = cursor.children("ol").children(".concord-node:first");
                    if (firstSibling.length == 1) {
                        cursor = firstSibling;
                        ableToMoveInDirection = true;
                    } else {
                        break;
                    }
                }
                this.setCursor(cursor, multiple);
                break;

            case flatup:
                while (cursor && nodeCount < count) {
                    cursor = this._walk_up(cursor);
                    if (cursor) {
                        if (!cursor.hasClass("collapsed") && (cursor.children("ol").children().length > 0)) {
                            nodeCount++;
                            ableToMoveInDirection = true;
                            if (nodeCount == count) {
                                this.setCursor(cursor, multiple);
                                break;
                            }
                        }
                    }
                }
                break;

            case flatdown:
                while(cursor && (nodeCount < count)) {
                    let next = this.getNext(cursor);
                    if (!next) {
                        next = this._walk_down(cursor);
                    }
                    cursor = next;
                    if (cursor) {
                        if (!cursor.hasClass("collapsed") && (cursor.children("ol").children().length > 0)) {
                            nodeCount++;
                            ableToMoveInDirection = true;
                            if (nodeCount == count) {
                                this.setCursor(cursor, multiple);
                            }
                        }
                    }
                }
                break;
        }
        this.markChanged();
        return ableToMoveInDirection;
    };

    this.insert = (insertText, insertDirection) => {
        this.saveState();
        let level = this.getCursor().parents(".concord-node").length + 1;

        const node = $("<li></li>");
        node.addClass("concord-node");

        level = insertDirection == right ? level + 1 : level - 1;

        node.addClass("concord-level-" + level);

        const wrapper = $("<div class='concord-wrapper'></div>");
        wrapper.append('<i class="node-icon icon-caret-right"></i>');
        wrapper.addClass("type-icon");

        const text = $("<div class='concord-text' contenteditable='true'></div>");
        text.addClass("concord-level-" + level + "-text");
        text.appendTo(wrapper);
        wrapper.appendTo(node);

        const outline = $("<ol></ol>");
        outline.appendTo(node);

        if (insertText && insertText != "") {
            text.html(concordInstance.editor.escape(insertText));
        }

        let cursor = this.getCursor();
        if (!insertDirection) {
            insertDirection = down;
        }

        switch(insertDirection) {
            case down:
                cursor.after(node);
                break;
            case right:
                cursor.children("ol").prepend(node);
                this.expand(false);
                break;
            case up:
                cursor.before(node);
                break;
            case left:
                let parent = cursor.parents(".concord-node:first");
                if (parent.length == 1) {
                    parent.after(node);
                }
                break;
        }
        this.setCursor(node);
        this.markChanged();
        concordInstance.fireCallback("opInsert", this.setCursorContext(node));
        return node;
    };

    this.insertImage = url => {
        if (this.inTextMode()) {
            document.execCommand("insertImage", null, url);
        } else {
            this.insert('<img src="' + url + '">', down);
        }
    };

    this.insertText = text => {
        let nodes = $("<ol></ol>");
        let lastLevel = 0;
        let startingline = 0;
        let startinglevel = 0;
        let lastNode = null;
        let parent = null;
        let parents = {};

        let lines = text.split("\n");
        let workflowy = true;
        let workflowyParent = null;
        let firstlinewithcontent = 0;
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            if (!line.match(/^\s*$/)) {
                firstlinewithcontent = i;
                break;
            }
        }
        if (lines.length > (firstlinewithcontent + 2)) {
            if (lines[firstlinewithcontent].match(/^([\t\s]*)\-.*$/) == null &&
                lines[firstlinewithcontent].match(/^.+$/) &&
                lines[firstlinewithcontent+1] == "") {
                startingline = firstlinewithcontent + 2;
                let workflowyParent = concordInstance.editor.makeNode();
                workflowyParent.children(".concord-wrapper").
                                children(".concord-text").html(lines[firstlinewithcontent]);
            }
        }
        for (let i = startingline; i < lines.length; i++) {
            let line = lines[i];
            if (line != "" && !line.match(/^\s+$/) && line.match(/^([\t\s]*)\-.*$/) == null) {
                workflowy = false;
                break;
            }
        }
        if (!workflowy) {
            startingline = 0;
            workflowyParent = null;
        }

        for (let i = startingline; i < lines.length; i++) {
            let line = lines[i];
            if (line != "" && !line.match(/^\s+$/)) {
                let matches = line.match(/^([\t\s]*)(.+)$/);
                let node = concordInstance.editor.makeNode();
                let nodeText = concordInstance.editor.escape(matches[2]);
                if (workflowy) {
                    let nodeTextMatches = nodeText.match(/^([\t\s]*)\-\s*(.+)$/);
                    if (nodeTextMatches !== null) {
                        nodeText = nodeTextMatches[2];
                    }
                }
                node.children(".concord-wrapper").children(".concord-text").html(nodeText);
                let level = startinglevel;
                if (matches[1]) {
                    if (workflowy) {
                        level = (matches[1].length / 2) + startinglevel;
                    } else {
                        level = matches[1].length + startinglevel;
                    }

                    if (level > lastLevel) {
                        parents[lastLevel] = lastNode;
                        parent = lastNode;
                    } else if (level > 0 && level < lastLevel) {
                        parent = parents[level-1];
                    }
                }
                if (parent && (level > 0)) {
                    parent.children("ol").append(node);
                    parent.addClass("collapsed");
                } else {
                    parents = {};
                    nodes.append(node);
                }
                lastNode = node;
                lastLevel = level;
            }
        }
        if (workflowyParent) {
            if (nodes.children().length > 0) {
                workflowyParent.addClass("collapsed");
            }
            let clonedNodes = nodes.clone();
            clonedNodes.children().appendTo(workflowyParent.children("ol"));
            nodes = $("<ol></ol>");
            nodes.append(workflowyParent);
        }
        if (nodes.children().length>0) {
            this.saveState();
            this.setTextMode(false);
            let cursor = this.getCursor();
            nodes.children().insertAfter(cursor);
            this.setCursor(cursor.next());
            concordInstance.root.removeData("clipboard");
            this.markChanged();
            concordInstance.editor.recalculateLevels();
        }
    };

    this.insertXml = (opmltext, dir) => {
        this.saveState();

        let nodes = $("<ol></ol>");
        let cursor = this.getCursor();
        let level = cursor.parents(".concord-node").length+1;
        if (!dir) {
            dir = down;
        }
        switch(dir) {
            case right:
                level++;
                break;
            case left:
                level--;
                break;
        }

        let doc = typeof opmltext == "string" ? $($.parseXML(opmltext)) : $(opmltext);

        doc.find("body").children("outline").each(function() {
            nodes.append(concordInstance.editor.build($(this), true, level));
        });

        let expansionState = doc.find("expansionState");
        if (expansionState && expansionState.text() && expansionState.text() != "") {
            let expansionStates = expansionState.text().split(",");
            let nodeId = 1;
            nodes.find(".concord-node").each(function() {
                if (expansionStates.indexOf(""+nodeId) >= 0) {
                    $(this).removeClass("collapsed");
                }
                nodeId++;
            });
        }
        switch(dir) {
            case down:
                nodes.children().insertAfter(cursor);
                break;
            case right:
                nodes.children().prependTo(cursor.children("ol"));
                this.expand(false);
                break;
            case up:
                nodes.children().insertBefore(cursor);
                break;
            case left:
                let parent = cursor.parents(".concord-node:first");
                if (parent.length == 1) {
                    nodes.children().insertAfter(parent);
                }
                break;
        }
        this.markChanged();
        return true;
    };

    this.inTextMode = () => {
        return root.hasClass("textMode");
    };

    this.level = () => {
        return this.getCursor().parents(".concord-node").length + 1;
    };

    this.link = url => {
        if (this.inTextMode()) {
            if (!concord.handleEvents) {
                let instance = this;
                concord.onResume(function() {
                    instance.link(url);
                });
                return;
            }
            let range = concordInstance.editor.getSelection();
            if (range === undefined) {
                concordInstance.editor.restoreSelection();
            }
            if (concordInstance.editor.getSelection()) {
                this.saveState();
                document.execCommand("createLink", null, url);
                this.markChanged();
            }
        }
    };

    this.markChanged = () => {
        root.data("changed", true);
        if (!this.inTextMode()) {
            root.find(".concord-node.dirty").removeClass("dirty");
        }
        return true;
    };

    this.paste = () => {
        if (!this.inTextMode()) {
            if (root.data("clipboard") !== null) {
                let pasteNodes = root.data("clipboard").clone(true,true);
                if (pasteNodes.length>0) {
                    this.saveState();
                    root.find(".selected").removeClass("selected");
                    pasteNodes.insertAfter(this.getCursor());
                    this.setCursor($(pasteNodes[0]), (pasteNodes.length>1));
                    this.markChanged();
                }
            }
        }
    };

    this.promote = () => {
        let node = this.getCursor();
        if (node.children("ol").children().length > 0) {
            this.saveState();
            node.children("ol").children().reverse().each(function() {
                let child = $(this).clone(true, true);
                $(this).remove();
                node.after(child);
            });
            concordInstance.editor.recalculateLevels(node.parent().find(".concord-node"));
            this.markChanged();
        }
    };

    this.redraw = () => {
        let ct = 1;
        let cursorIndex = 1;
        const wasChanged = this.changed();
        root.find(".concord-node:visible").each(function() {
            if ($(this).hasClass("concord-cursor")) {
                cursorIndex = ct;
                return false;
            }
            ct++;
        });
        this.xmlToOutline(this.outlineToXml());
        ct = 1;

        let thisOp = this;
        root.find(".concord-node:visible").each(function() {
            if (cursorIndex == ct) {
                thisOp.setCursor($(this));
                return false;
            }
            ct++;
        });

        if (wasChanged) {
            this.markChanged();
        }
    };

    this.reorg = (direction, count) => {
        if (count === undefined) {
            count = 1;
        }

        let ableToMoveInDirection = false;
        let cursor = this.getCursor();

        let toMove = this.getCursor();
        let selected = root.find(".selected");
        let iteration = 1;

        if (selected.length > 1) {
            cursor = root.find(".selected:first");
            toMove = root.find(".selected");
        }

        let prev = cursor.prev();

        switch(direction) {
            case up:
                if (prev.length == 1) {
                    while(iteration < count) {
                        if (prev.prev().length == 1) {
                            prev = prev.prev();
                        }
                        else {
                            break;
                        }
                        iteration++;
                    }
                    this.saveState();
                    let clonedMove = toMove.clone(true, true);
                    toMove.remove();
                    clonedMove.insertBefore(prev);
                    ableToMoveInDirection = true;
                }
                break;
            case down:
                if (!this.inTextMode()) {
                    cursor = root.find(".selected:last");
                }
                let next = cursor.next();
                if (next.length == 1) {
                    while(iteration < count) {
                        if (next.next().length == 1) {
                            next = next.next();
                        }
                        else {
                            break;
                        }
                        iteration++;
                    }
                    this.saveState();
                    const clonedMove = toMove.clone(true, true);
                    toMove.remove();
                    clonedMove.insertAfter(next);
                    ableToMoveInDirection = true;
                }
                break;
            case left:
                let outline = cursor.parent();
                if (!outline.hasClass("concord-root")) {
                    let parent = outline.parent();
                    while(iteration < count) {
                        let parentParent = parent.parents(".concord-node:first");
                        if (parentParent.length == 1) {
                            parent = parentParent;
                        }
                        else {
                            break;
                        }
                        iteration++;
                    }
                    this.saveState();
                    let clonedMove = toMove.clone(true, true);
                    toMove.remove();
                    clonedMove.insertAfter(parent);
                    concordInstance.editor.recalculateLevels(parent.nextAll(".concord-node"));
                    ableToMoveInDirection = true;
                }
                break;
            case right:
                if (prev.length == 1) {
                    this.saveState();
                    while(iteration < count) {
                        if (prev.children("ol").length == 1) {
                            let prevNode = prev.children("ol").children(".concord-node:last");
                            if (prevNode.length == 1) {
                                prev = prevNode;
                            }
                            else {
                                break;
                            }
                        }
                        else {
                            break;
                        }
                        iteration++;
                    }
                    let prevOutline = prev.children("ol");
                    if (prevOutline.length == 0) {
                        prevOutline = $("<ol></ol>");
                        prevOutline.appendTo(prev);
                    }
                    let clonedMove = toMove.clone(true, true);
                    toMove.remove();
                    clonedMove.appendTo(prevOutline);
                    prev.removeClass("collapsed");
                    concordInstance.editor.recalculateLevels(prev.find(".concord-node"));
                    ableToMoveInDirection = true;
                }
                break;
        }
        if (ableToMoveInDirection) {
            if (this.inTextMode()) {
                this.setCursor(this.getCursor());
            }
            this.markChanged();
        }
        return ableToMoveInDirection;
    };

    this.runSelection = () => {
        let value = eval(this.getLineText());
        this.deleteSubs();
        this.insert(value, "right");
        concordInstance.script.makeComment();
        this.go("left", 1);
    };

    this.saveState = () => {
        root.data("change", root.children().clone(true, true));
        root.data("changeTextMode", this.inTextMode());
        if (this.inTextMode()) {
            let range = concordInstance.editor.getSelection();
            if (range) {
                root.data("changeRange",range.cloneRange());
            } else {
                root.data("changeRange", undefined);
            }
        } else {
            root.data("changeRange", undefined);
        }
        return true;
    };

    this.setCursor = (node, multiple, multipleRange) => {
        root.find(".concord-cursor").removeClass("concord-cursor");
        node.addClass("concord-cursor");

        if (this.inTextMode()) {
            concordInstance.editor.edit(node);
        } else {
            concordInstance.editor.select(node, multiple, multipleRange);
            concordInstance.pasteBinFocus();
        }

        concordInstance.fireCallback("opCursorMoved", this.setCursorContext(node));
        concordInstance.editor.hideContextMenu();
    };

    this.setCursorContext = cursor => {
        return new ConcordOp(root,concordInstance,cursor);
    };

    this.setHeaders = headers => {
        root.data("head", headers);
        this.markChanged();
    };

    this.setLineText = text => {
        this.saveState();
        let node = this.getCursor();

        if (node.length == 1) {
            node.children(".concord-wrapper:first").
                    children(".concord-text:first").html(concordInstance.editor.escape(text));
            return true;
        } else {
            return false;
        }

        this.markChanged(); // Unreachable code
    };

    this.setRenderMode = mode => {
        root.data("renderMode", mode);
        this.redraw();
        return true;
    };

    this.setStyle = css => {
        root.parent().find("style.customStyle").remove();
        root.before('<style type="text/css" class="customStyle">'+ css + '</style>');
        return true;
    };

    this.setTextMode = textMode => {
        let readonly = concordInstance.prefs().readonly;

        if (readonly === undefined) {
            readonly = false;
        }
        if (readonly) {
            return;
        }

        if (root.hasClass("textMode") == textMode) {
            return;
        }

        if (textMode) {
            root.addClass("textMode");
            concordInstance.editor.editorMode();
            concordInstance.editor.edit(this.getCursor());
        } else {
            root.removeClass("textMode");
            root.find(".editing").removeClass("editing");
            this.blurCursor();
            concordInstance.editor.select(this.getCursor());
        }
    };

    this.setTitle = title => {
        root.data("title", title);
        return true;
    };

    this.subsExpanded = () => {
        let node = this.getCursor();
        if (node.length == 1) {
            return !node.hasClass("collapsed") && node.children("ol").children().length > 0;
        }
        return false;
    };

    this.outlineToText = () => {
        let text = "";
        root.children(".concord-node").each(function() {
            text += concordInstance.editor.textLine($(this));
        });
        return text;
    };

    this.outlineToXml = (ownerName, ownerEmail, ownerId) => {
        let head = this.getHeaders();
        if (ownerName) {
            head.ownerName = ownerName;
        }
        if (ownerEmail) {
            head.ownerEmail = ownerEmail;
        }
        if (ownerId) {
            head.ownerId = ownerId;
        }
        let title = this.getTitle();
        if (!title) {
            title = "";
        }
        head.title = title;
        head.dateModified = (new Date()).toGMTString();
        let expansionStates = [];
        let nodeId = 1;
        let cursor = root.find(".concord-node:first");
        do {
            if (cursor) {
                if (!cursor.hasClass("collapsed") && (cursor.children("ol").children().length > 0)) {
                    expansionStates.push(nodeId);
                }
                nodeId++;
            } else {
                break;
            }
            let next = this.getNext(cursor);
            if (!next) {
                next = this._walk_down(cursor);
            }
            cursor = next;
        } while (cursor !== null);

        head.expansionState = expansionStates.join(",");

        let opml = '';

        let indent = 0;

        const add = s => {
            for (let i = 0; i < indent; i++) {
                opml += '\t';
            }
            opml += s + '\n';
        };

        add('<?xml version="1.0"?>');
        add('<opml version="2.0">');

        indent++;
        add('<head>');
        indent++;

        for (let headName in head) {
            if (head[headName] !== undefined) {
                add('<' + headName + '>' +
                    ConcordUtil.escapeXml(head[headName]) +
                    '</' + headName + '>');
            }
        }

        indent--;
        add('</head>');
        indent--;
        add('<body>');
        indent++;

        root.children(".concord-node").each(function() {
            opml += concordInstance.editor.opmlLine($(this), indent);
        });

        add('</body>');
        indent--;
        add('</opml>');

        return opml;
    };

    this.undo = () => {
        let beforeRange;
        if (this.inTextMode()) {
            let range = concordInstance.editor.getSelection();
            if (range) {
                beforeRange = range.cloneRange();
            }
        }

        if (root.data("change")) {
            root.empty();
            root.data("change").appendTo(root);
            this.setTextMode(root.data("changeTextMode"));
            if (this.inTextMode()) {
                this.focusCursor();
                let range = root.data("changeRange");
                if (range) {
                    concordInstance.editor.restoreSelection(range);
                }
            }
            root.data("change", root.children().clone(true, true));
            root.data("changeTextMode", this.inTextMode());
            root.data("changeRange", beforeRange);
            return true;
        }
        return false;
    };

    this.visitLevel = cb => {
        let cursor = this.getCursor();
        let op = this;
        cursor.children("ol").children().each(function() {
            cb(op.setCursorContext($(this)));
        });
        return true;
    };

    this.visitToSummit = cb => {
        let cursor = this.getCursor();
        while(cb(this.setCursorContext(cursor))) {
            const parent = cursor.parents(".concord-node:first");

            if (parent.length == 1) {
                cursor = parent;
            } else {
                break;
            }
        }
        return true;
    };

    this.visitAll = cb => {
        let op = this;
        root.find(".concord-node").each(function() {
            let retVal = cb(op.setCursorContext($(this)));
            if (retVal !== undefined && !retVal) {
                return false;
            }
        });
    };

    this.wipe = () => {
        if (root.find(".concord-node").length > 0) {
            this.saveState();
        }
        root.empty();

        const node = concordInstance.editor.makeNode();
        root.append(node);
        this.setTextMode(false);
        this.setCursor(node);
        this.markChanged();
    };

    this.xmlToOutline = (xmlText, flSetFocus) => {
        //2/22/14 by DW -- new param, flSetFocus
        if (flSetFocus === undefined) { //2/22/14 by DW
            flSetFocus = true;
        }

        let doc = typeof xmlText == "string" ? $($.parseXML(xmlText)) : $(xmlText);

        root.empty();
        let title = "";
        if (doc.find("title:first").length === 1) {
            title = doc.find("title:first").text();
        }

        this.setTitle(title);
        let headers = {};

        doc.find("head").children().each(function() {
            headers[$(this).prop("tagName")] = $(this).text();
        });

        root.data("head", headers);
        doc.find("body").children("outline").each(function() {
            root.append(concordInstance.editor.build($(this), true));
        });
        root.data("changed", false);
        root.removeData("previousChange");
        let expansionState = doc.find("expansionState");
        if (expansionState && expansionState.text() && (expansionState.text() != "")) {
            let expansionStates = expansionState.text().split(/\s*,\s*/);
            let nodeId = 1;
            let cursor = root.find(".concord-node:first");
            do {
                if (cursor) {
                    if (expansionStates.indexOf(""+nodeId) >= 0) {
                        cursor.removeClass("collapsed");
                    }
                    nodeId++;
                } else {
                    break;
                }

                let next = this.getNext(cursor);
                if (!next) {
                    next = this._walk_down(cursor);
                }
                cursor = next;
            } while (cursor !== null);
        }
        this.setTextMode(false);

        if (flSetFocus) {
            this.setCursor(root.find(".concord-node:first"));
        }

        root.data("currentChange", root.children().clone(true, true));
        return true;
    };

    this.attributes = new ConcordOpAttributes(concordInstance, this.getCursor());
}

function ConcordOpAttributes(concordInstance, cursor) {
    this._cssTextClassName = "cssTextClass";
    this._cssTextClass = newValue => {
        if (newValue === undefined) {
            return;
        }
        let newCssClasses = newValue.split(/\s+/);
        let concordText = cursor.children(".concord-wrapper:first").children(".concord-text:first");
        let currentCssClass = concordText.attr("class");
        if (currentCssClass) {
            let cssClassesArray = currentCssClass.split(/\s+/);
            for (let i in cssClassesArray) {
                let className = cssClassesArray[i];
                if (className.match(/^concord\-.+$/) == null) {
                    concordText.removeClass(className);
                }
            }
        }

        for (let j in newCssClasses) {
            let newClass = newCssClasses[j];
            concordText.addClass(newClass);
        }
    };

    this.addGroup = attributes => {
        if (attributes.type) {
            cursor.attr("opml-type", attributes.type);
        } else {
            cursor.removeAttr("opml-type");
        }
        this._cssTextClass(attributes[this._cssTextClassName]);
        let finalAttributes = this.getAll();
        let iconAttribute = "type";
        if (attributes.icon) {
            iconAttribute = "icon";
        }

        for (let name in attributes) {
            finalAttributes[name] = attributes[name];

            if (name == iconAttribute) {
                let value = attributes[name];
                let wrapper = cursor.children(".concord-wrapper");
                let iconName = null;

                if (name == "type" && concordInstance.prefs() &&
                    concordInstance.prefs().typeIcons &&
                    concordInstance.prefs().typeIcons[value]) {
                    iconName = concordInstance.prefs().typeIcons[value];
                } else if (name == "icon") {
                    iconName = value;
                }

                if (iconName) {
                    let icon = "<i"+" class=\"node-icon icon-"+ iconName +"\"><"+"/i>";
                    wrapper.children(".node-icon:first").replaceWith(icon);
                }
            }
        }
        cursor.data("attributes", finalAttributes);
        concordInstance.op.markChanged();
        return finalAttributes;
    };

    this.setGroup = attributes => {
        if (attributes[this._cssTextClassName] !== undefined) {
            this._cssTextClass(attributes[this._cssTextClassName]);
        } else {
            this._cssTextClass("");
        }
        cursor.data("attributes", attributes);

        $(cursor[0].attributes).each(function() {
            let matches = this.name.match(/^opml-(.+)$/);
            if (matches) {
                let name = matches[1];
                if (!attributes[name]) {
                    cursor.removeAttr(this.name);
                }
            }
        });

        let iconAttribute = "type";
        if (attributes.icon) {
            iconAttribute = "icon";
        }
        if (name == "type") {
            cursor.attr("opml-" + name, attributes[name]);
        }
        for (let name in attributes) {
            if (name == iconAttribute) {
                let value = attributes[name];
                let wrapper = cursor.children(".concord-wrapper");
                let iconName = null;
                if (name == "type" && concordInstance.prefs() &&
                    concordInstance.prefs().typeIcons &&
                    concordInstance.prefs().typeIcons[value]) {
                    iconName = concordInstance.prefs().typeIcons[value];
                } else if (name == "icon") {
                    iconName = value;
                }

                if (iconName) {
                    let icon = "<i"+" class=\"node-icon icon-"+ iconName +"\"><"+"/i>";
                    wrapper.children(".node-icon:first").replaceWith(icon);
                }
            }
        }
        concordInstance.op.markChanged();
        return attributes;
    };

    this.getAll = () => {
        return cursor.data("attributes") !== undefined ? cursor.data("attributes") : {};
    };

    this.getOne = name => {
        return this.getAll()[name];
    };

    this.makeEmpty = () => {
        this._cssTextClass("");
        let numAttributes = 0;
        let atts = this.getAll();
        if (atts !== undefined) {
            numAttributes += atts.length;
        }
        cursor.removeData("attributes");
        let removedAnyAttributes = numAttributes > 0;

        $(cursor[0].attributes).each(function() {
            if (this.name.match(/^opml-(.+)$/)) {
                cursor.removeAttr(this.name);
            }
        });
        if (removedAnyAttributes) {
            concordInstance.op.markChanged();
        }
        return removedAnyAttributes;
    };

    this.setOne = (name, value) => {
        if (name == this._cssTextClassName) {
            this._cssTextClass(value);
        }

        let atts = this.getAll();
        atts[name] = value;
        cursor.data("attributes", atts);

        if (name == "type" || name == "icon") {
            cursor.attr("opml-" + name, value);
            let wrapper = cursor.children(".concord-wrapper");
            let iconName = null;

            if (name == "type" && concordInstance.prefs() &&
                    concordInstance.prefs().typeIcons &&
                    concordInstance.prefs().typeIcons[value]) {
                iconName = concordInstance.prefs().typeIcons[value];
            } else if (name == "icon") {
                iconName = value;
            }

            if (iconName) {
                let icon = "<i"+" class=\"node-icon icon-"+ iconName +"\"><"+"/i>";
                wrapper.children(".node-icon:first").replaceWith(icon);
            }
        }
        concordInstance.op.markChanged();
        return true;
    };

    this.exists = name => {
        return this.getOne(name) !== undefined;
    };

    this.removeOne = name => {
        if (this.getAll()[name]) {
            if (name == this._cssTextClassName) {
                this._cssTextClass("");
            }
            delete this.getAll()[name];
            concordInstance.op.markChanged();
            return true;
        }
        return false;
    };
}

function ConcordScript(root, concordInstance) {
    this.isComment = () => {
        if (concordInstance.op.attributes.getOne("isComment") !== undefined) {
            return concordInstance.op.attributes.getOne("isComment") == "true";
        }

        let parentIsAComment = false;
        concordInstance.op.getCursor().parents(".concord-node").each(function() {
            if (concordInstance.op.setCursorContext($(this)).attributes.getOne("isComment") == "true") {
                parentIsAComment = true;
                return;
            }
        });
        return parentIsAComment;
    };

    this.makeComment = () => {
        concordInstance.op.attributes.setOne("isComment", "true");
        concordInstance.op.getCursor().addClass("concord-comment");
        return true;
    };

    this.unComment = () => {
        concordInstance.op.attributes.setOne("isComment", "false");
        concordInstance.op.getCursor().removeClass("concord-comment");
        return true;
    };
}

function Op(opmltext) {
    const fakeDom = $("<div></div>");
    fakeDom.concord().op.xmlToOutline(opmltext);
    return fakeDom.concord().op;
}

(function($) {
    $.fn.concord = function(options) {
        return new ConcordOutline($(this), options);
    };

    const preventDefaultandTrue = event => {
        event.preventDefault();
        return true;
    };

    $(document).on("keydown", function(event) {
        if (!concord.handleEvents) {
            return;
        }

        if ($(event.target).is("input") || $(event.target).is("textarea")) {
            return;
        }

        const focusRoot = concord.getFocusRoot();
        if (focusRoot == null) {
            return;
        }

        const context = focusRoot;
        context.data("keydownEvent", event);
        let concordInstance = new ConcordOutline(context.parent());
        let readonly = concordInstance.prefs().readonly;
        if (readonly === undefined) {
            readonly = false;
        }
        // Readonly exceptions for arrow keys and cmd-comma
        if (readonly) {
            if (event.which >= 37 && event.which <= 40 ||
                (event.metaKey || event.ctrlKey) && event.which == 188) {
                readonly = false;
            }
        }

        if (!readonly) {
            concordInstance.fireCallback("opKeystroke", event);

            let keyCaptured = false;
            const commandKey = event.metaKey || event.ctrlKey;
            let active = false;

            switch(event.which) {
                case 8:
                    // (CMD+)Backspace
                    if (commandKey) {
                        keyCaptured = preventDefaultandTrue(event);
                        concordInstance.op.strikeThrough();
                        break;
                    }
                    if (concord.mobile) {
                        if (concordInstance.op.getLineText() == "" ||
                            concordInstance.op.getLineText() == "<br>") {
                            event.preventDefault();
                            concordInstance.op.deleteLine();
                        }
                    } else {
                        if (concordInstance.op.inTextMode()) {
                            if (!concordInstance.op.getCursor().hasClass("dirty")) {
                                concordInstance.op.saveState();
                                concordInstance.op.getCursor().addClass("dirty");
                            }
                        } else {
                            keyCaptured = true;
                            event.preventDefault();
                            concordInstance.op.deleteLine();
                        }
                    }
                    break;
                case 9:
                    keyCaptured = true;
                    event.preventDefault();
                    event.stopPropagation();
                    concordInstance.op.reorg(event.shiftKey ? left : right);
                    break;
                case 65:
                    //CMD+A
                    if (commandKey) {
                        keyCaptured = preventDefaultandTrue(event);
                        let cursor = concordInstance.op.getCursor();
                        if (concordInstance.op.inTextMode()) {
                            concordInstance.op.focusCursor();
                            document.execCommand('selectAll',false,null);
                        } else {
                                concordInstance.editor.selectionMode();
                                cursor.parent().children().addClass("selected");
                            }
                    }
                    break;
                case 85:
                    //CMD+U
                    if (commandKey) {
                        keyCaptured = preventDefaultandTrue(event);
                        concordInstance.op.underline();
                    }
                    break;
                case 219:
                    // CMD+[
                    if (commandKey) {
                        keyCaptured = preventDefaultandTrue(event);
                        concordInstance.op.promote();
                    }
                    break;
                case 221:
                    // CMD+]
                    if (commandKey) {
                        keyCaptured = preventDefaultandTrue(event);
                        concordInstance.op.demote();
                    }
                    break;
                case 13:
                    // Enter
                    if (concord.mobile) {
                        //Mobile
                        event.preventDefault();
                        keyCaptured = true;

                        const cursor = concordInstance.op.getCursor();
                        const clonedCursor = cursor.clone(true, true);

                        clonedCursor.removeClass("concord-cursor");
                        cursor.removeClass("selected");
                        cursor.removeClass("dirty");
                        cursor.removeClass("collapsed");
                        concordInstance.op.setLineText("");

                        let icon = "<i"+" class=\"node-icon icon-caret-right\"><"+"/i>";
                        cursor.children(".concord-wrapper").children(".node-icon").replaceWith(icon);
                        clonedCursor.insertBefore(cursor);
                        concordInstance.op.attributes.makeEmpty();
                        concordInstance.op.deleteSubs();
                        concordInstance.op.focusCursor();
                        concordInstance.fireCallback(
                            "opInsert",
                            concordInstance.op.setCursorContext(cursor)
                        );
                    } else {
                        event.preventDefault();
                        keyCaptured = true;

                        if(event.originalEvent && (
                                event.originalEvent.keyLocation &&
                                event.originalEvent.keyLocation != 0 ||
                                event.originalEvent.location &&
                                event.originalEvent.location !== 0)) {
                            concordInstance.op.setTextMode(!concordInstance.op.inTextMode());
                        } else {
                            concordInstance.op.insert(
                                "", concordInstance.op.subsExpanded() ? right : down);
                            concordInstance.op.setTextMode(true);
                            concordInstance.op.focusCursor();
                        }
                    }
                    break;
                case 37:
                    // left
                        if ($(event.target).hasClass("concord-text") &&
                                event.target.selectionStart > 0) {
                            active = false;
                        }

                        if (context.find(".concord-cursor.selected").length == 1) {
                            active = true;
                        }

                        if (active) {
                            keyCaptured = true;
                            event.preventDefault();
                            const prev = concordInstance.op._walk_up(concordInstance.op.getCursor());
                            if (prev) {
                                concordInstance.op.setCursor(prev);
                            }
                        }
                        break;
                case 38:
                    // up
                        keyCaptured = preventDefaultandTrue(event);

                        if (concordInstance.op.inTextMode()) {
                            let prev = concordInstance.op._walk_up(concordInstance.op.getCursor());
                            if (prev) {
                                concordInstance.op.setCursor(prev);
                            }
                        } else {
                            concordInstance.op.go(
                                up,1,event.shiftKey, concordInstance.op.inTextMode());
                        }
                        break;
                case 39:
                    // right
                        if (context.find(".concord-cursor.selected").length == 1) {
                            active = true;
                        }
                        if (active) {
                            keyCaptured = true;
                            event.preventDefault();

                            const cursor = concordInstance.op.getCursor();
                            let next = concordInstance.op.getNext(cursor);
                            if (!next) {
                                next = concordInstance.op._walk_down(cursor);
                            }
                            if (next) {
                                concordInstance.op.setCursor(next);
                            }
                        }
                        break;
                case 40:
                    // down
                        keyCaptured = preventDefaultandTrue(event);
                        if (concordInstance.op.inTextMode()) {
                            const cursor = concordInstance.op.getCursor();
                            let next = concordInstance.op.getNext(cursor);
                            if (!next) {
                                next = concordInstance.op._walk_down(cursor);
                            }
                            if (next) {
                                concordInstance.op.setCursor(next);
                            }
                        } else {
                            concordInstance.op.go(
                                down,1, event.shiftKey, concordInstance.op.inTextMode());
                            }
                        break;
                case 46:
                    // delete
                        if (concordInstance.op.inTextMode()) {
                            if (!concordInstance.op.getCursor().hasClass("dirty")) {
                                concordInstance.op.saveState();
                                concordInstance.op.getCursor().addClass("dirty");
                            }
                        } else {
                                keyCaptured = true;
                                event.preventDefault();
                                concordInstance.op.deleteLine();
                            }
                        break;
                case 90:
                    //CMD+Z
                    if (commandKey) {
                        keyCaptured = preventDefaultandTrue(event);
                        concordInstance.op.undo();
                    }
                    break;
                case 88:
                    //CMD+X
                    if (commandKey) {
                        if (concordInstance.op.inTextMode()) {
                            if (concordInstance.op.getLineText() == "") {
                                keyCaptured = true;
                                event.preventDefault();
                                concordInstance.op.deleteLine();
                            }
                            else {
                                concordInstance.op.saveState();
                            }
                        }
                    }
                    break;
                case 67:
                    //CMD+C
                    if (false && commandKey) { // WHY?
                        if (concordInstance.op.inTextMode()) {
                            if (concordInstance.op.getLineText() != "") {
                                concordInstance.root.removeData("clipboard");
                            }
                        } else {
                            keyCaptured = true;
                            event.preventDefault();
                            concordInstance.op.copy();
                        }
                    }
                    break;
                case 86:
                    //CMD+V
                    break;
                case 220:
                    // CMD+Backslash
                    if (commandKey) {
                        if (concordInstance.script.isComment()) {
                            concordInstance.script.unComment();
                        } else {
                            concordInstance.script.makeComment();
                        }
                    }
                    break;
                case 73:
                    //CMD+I
                    if (commandKey) {
                        keyCaptured = preventDefaultandTrue(event);
                        concordInstance.op.italic();
                    }
                    break;
                case 66:
                    //CMD+B
                    if (commandKey) {
                        keyCaptured = preventDefaultandTrue(event);
                        concordInstance.op.bold();
                    }
                    break;
                case 192:
                    //CMD+`
                    if (commandKey) {
                        keyCaptured = preventDefaultandTrue(event);
                        concordInstance.op.setRenderMode(!concordInstance.op.getRenderMode());
                    }
                    break;
                case 188:
                    //CMD+,
                    if (commandKey) {
                        keyCaptured = preventDefaultandTrue(event);
                        if (concordInstance.op.subsExpanded()) {
                            concordInstance.op.collapse();
                        } else {
                            concordInstance.op.expand();
                        }
                    }
                    break;
                case 191:
                    //CMD+/
                    if (commandKey) {
                        keyCaptured = preventDefaultandTrue(event);
                        concordInstance.op.runSelection();
                    }
                    break;
                default:
                    keyCaptured = false;
            }
            if (!keyCaptured) {
                if (event.which >= 32 && (event.which < 112 || event.which > 123) &&
                    event.which < 1000 && !commandKey) {
                    let node = concordInstance.op.getCursor();
                    if (concordInstance.op.inTextMode()) {
                        if (!node.hasClass("dirty")) {
                            concordInstance.op.saveState();
                        }
                        node.addClass("dirty");
                    } else {
                        concordInstance.op.setTextMode(true);
                        concordInstance.op.saveState();
                        concordInstance.editor.edit(node, true);
                        node.addClass("dirty");
                    }
                    concordInstance.op.markChanged();
                }
            }
        }
    });

    $(document).on("mouseup", function(event) {
        if (!concord.handleEvents) {
            return;
        }

        if ($(".concord-root").length === 0) {
            return;
        }

        if ($(event.target).is("a") || $(event.target).is("input") ||
            $(event.target).is("textarea") || $(event.target).parents("a:first").length === 1 ||
            $(event.target).hasClass("dropdown-menu") || $(event.target).parents(".dropdown-menu:first").length > 0) {
            return;
        }

        let context = $(event.target).parents(".concord-root:first");
        if (context.length == 0) {
            $(".concord-root").each(function() {
                let concordInstance = new ConcordOutline($(this).parent());
                concordInstance.editor.hideContextMenu();
                concordInstance.editor.dragModeExit();
            });
            concord.getFocusRoot();
        }
    });

    $(document).on("click", concord.updateFocusRootEvent);
    $(document).on("dblclick", concord.updateFocusRootEvent);
    $(document).on('show', function(e) {
        if ($(e.target).is(".modal")) {
            if ($(e.target).attr("concord-events") != "true") {
                concord.stopListening();
            }
        }
    });
    $(document).on('hidden', function(e) {
        if ($(e.target).is(".modal")) {
            if ($(e.target).attr("concord-events") != "true") {
                concord.resumeListening();
            }
        }
    });
    concord.ready = true;
})(jQuery);
