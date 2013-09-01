(function() {
    CodeMirror.defineOption("queryAutoSpace", false, function(cm, val, old) {
		if (old != CodeMirror.Init && old)
			cm.removeKeyMap("queryAutoSpace");
		if (!val) return;
		
		cm.addKeyMap(buildKeymap());
	  });

  
	function startswith(str, prefix) {
		return str.search(prefix) === 0;
	}

	var BROKEN_VALUE_ERROR = 'error broken-value';
	
	function buildKeymap() {
		return {
			name : "queryAutoSpace",
			Space: function (cm) {
				var cur = cm.getCursor(), token = cm.getTokenAt(cur), line = cm.getLine(cur.line);
				
				if (cur.ch === token.end && token.type !== null && token.type !== BROKEN_VALUE_ERROR) {
					var nextToken = cm.getTokenAt(CodeMirror.Pos(cur.line, cur.ch + 1)), start = cur, end, literal = ',';
						
					if (line[cur.ch] === ';')
						literal = ';';
					
					if (token.type !== 'quote' && !startswith(token.type, 'error'))
						literal = '';
						
					literal = literal + ' ';
						
					// If quote, replace the full literal.
					if (token.type === 'quote') {
						var state = token.state, 
							  key = state.lastKey;
							  
						literal = key + ' ' + state.dict[key].operator + ' ' + state.dict[key].originalString + literal;
						start = CodeMirror.Pos(cur.line, state.lastKeyStart);
					}
					
					// Set the end of the replacement.
					if (nextToken.start === token.start) // End of line.
						end = cur;
					else if (nextToken.type === null) // There are spaces and saperators after this token.
						end = CodeMirror.Pos(cur.line, nextToken.end);
					else
						end = CodeMirror.Pos(cur.line, nextToken.start);
					
					// Replace.
					cm.replaceRange(literal, start, end);
						
					return;
				}
				return CodeMirror.Pass;
			},
		};
	}
})();
