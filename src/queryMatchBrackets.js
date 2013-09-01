(function() {
  var ie_lt8 = /MSIE \d/.test(navigator.userAgent) &&
    (document.documentMode == null || document.documentMode < 8);

  var Pos = CodeMirror.Pos;

  function findMatchingBracket(cm, where, strict) {
	var cur = cm.getCursor(), state = cm.getStateAfter();
	
	if (state.matches.length > cur.line) {
		var matches = state.matches[cur.line], i = matches.length;
		while (i--) {
			var pos = matches[i];
			if (pos[0] === cur.ch || pos[0] === cur.ch - 1 || pos[1] === cur.ch || pos[1] === cur.ch - 1)
				return {from: Pos(cur.line, pos[0]), to: Pos(cur.line, pos[1]),
					match: true};
		}
	}
	if (state.noMatches.length > cur.line) {
		var noMatches = state.noMatches[cur.line], i;
		if (noMatches) {
			i = noMatches.length;
			while (i--) {
				var pos = noMatches[i];
				if (pos === cur.ch || pos === cur.ch - 1)
					return {from: Pos(cur.line, pos), to: false,
						match: false};
			}
		}
	}
	return null;
  }

	function matchBrackets(cm, autoclear) {
		var found = findMatchingBracket(cm);
		if (!found)
			return;

		var style = found.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
		var one = cm.markText(found.from, Pos(found.from.line, found.from.ch + 1), {className: style});
		var two = found.to && cm.markText(found.to, Pos(found.to.line, found.to.ch + 1), {className: style});
		// Kludge to work around the IE bug from issue #1193, where text
		// input stops going to the textare whever this fires.
		if (ie_lt8 && cm.state.focused) cm.display.input.focus();
		var clear = function() {
			cm.operation(function() { one.clear(); two && two.clear(); });
		};
		if (autoclear) setTimeout(clear, 800);
		else return clear;
	}

  var currentlyHighlighted = null;
  function doMatchBrackets(cm) {
    cm.operation(function() {
      if (currentlyHighlighted) {currentlyHighlighted(); currentlyHighlighted = null;}
      if (!cm.somethingSelected()) currentlyHighlighted = matchBrackets(cm, false);
    });
  }

  CodeMirror.defineOption("queryMatchBrackets", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init)
      cm.off("cursorActivity", doMatchBrackets);
    if (val) {
      cm.state.matchBrackets = typeof val == "object" ? val : {};
      cm.on("cursorActivity", doMatchBrackets);
    }
  });

  CodeMirror.defineExtension("queryMatchBrackets", function() {matchBrackets(this, true);});
})();
