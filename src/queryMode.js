CodeMirror.initQueryMode = function (config) {
	CodeMirror.defineMode('query', function() {
		var brackets = {
								'(': ')',
								'[': ']',
								'{': '}'
							},
			  apostrophes = ['"', "'"],
			  escapeCharacter = '\\',
			  keys = [],
			  closingBrackets = [];

		// Preper the closingBrackets list.
		for (var bracket in brackets)
			closingBrackets.push(brackets[bracket]);
			  
		// Sort the operators by increasing order.
		for (var key in config) {
			config[key].operators.sort(function (item, item2) {return item.length - item2.length;});
			keys.push(key);
		}
		
		// Sort the keys by increasing order.
		keys.sort(function (item, item2) {return item.length - item2.length;});
		
		return {
			token: function(stream, state) {
				function getBrackets(ch) {
					if (ch === null)
						return null;
					return brackets[ch] || null;
				}
				
				function getApostrophe(ch) {
					if (ch === null)
						return null;
					if (apostrophes.indexOf(ch) >= 0)
						return ch;
					return null;
				}
				
				function advanceAfter(str) {
					stream.match(str, true, true);
				}
				
				function isOperator() {
					return (getOperator() !== null);
				}
				
				function getOperator() {
					return getStr(config[state.lastKey].operators);
				}
				
				function getKey() {
					return getStr(keys);
				}
				
				function getStr(options) {
					var i = options.length;
					while (i--) {
						if (stream.match(options[i], false, true))
							return options[i];
					}
					return null;
				}
				
				function handleError(errorType) {
					// Eat until a saperator.
					stream.eatWhile(/[^;,]/);
					state.lastKey = null;
					state.position = 'key';
					if (errorType)
						return 'error ' + errorType;
					return 'error';
				}
				
				function peek(stack) {
					return stack[stack.length - 1];
				}
				
				function saveMatch(pos1, pos2) {
					if (!state.matches[state.lineNumber])
						state.matches[state.lineNumber] = [];
					state.matches[state.lineNumber].push([pos1, pos2]);
				}
				
				function saveNoMatch(pos) {
					if (!state.noMatches[state.lineNumber])
						state.noMatches[state.lineNumber] = [];
					state.noMatches[state.lineNumber].push(pos);
				}
				
				function getValue() {
					var start = stream.pos, 
						  bracketChar = getBrackets(stream.peek()), 
						  apostropheChar = getApostrophe(stream.next()), 
						  ch = '';
					
					// If there is no wrapper to the current value.
					if (bracketChar === null && apostropheChar === null) { 
						stream.eatWhile(/[^\s\u00a0;,]/); // Eat while not a space or a separator.
					}
					else {
						var stack = [{ch: apostropheChar || bracketChar, pos: start}];
						
						while (stack.length > 0) {
							var expectedChar = peek(stack).ch;
								  
							// If expectedChar is apostrophe.
							if (getApostrophe(expectedChar) !== null) {
								while ((ch = stream.next()) != null && ch !== expectedChar) {
									if (ch === escapeCharacter) {
										stream.next(); // Escape!
									}
								}
								if (ch === expectedChar) {
									saveMatch(peek(stack).pos, stream.pos - 1);
									stack.pop();
								} else {
									saveNoMatch(peek(stack).pos);
									throw 'broken-value';
								}
							} else {
								while ((ch = stream.next()) != null && ch !== expectedChar && !getBrackets(ch) && !getApostrophe(ch)) {
									// If this is an unnecessary closing bracket, save it as noMatches.
									if (closingBrackets.indexOf(ch) >= 0)
										saveNoMatch(stream.pos - 1);
								}
								
								if (ch === expectedChar) {
									saveMatch(peek(stack).pos, stream.pos - 1);
									stack.pop();
								}
								else if (getApostrophe(ch)) {
									stack.push({ch: getApostrophe(ch), pos: stream.pos - 1});
								}
								else if (getBrackets(ch)) {
									stack.push({ch: getBrackets(ch), pos: stream.pos - 1});
								}
								else {
									// Save this broker as noMatches.
									saveNoMatch(peek(stack).pos);
									throw 'broken-value';
								}
							}
						}
					}
					
					if (start < stream.pos + 1)
						return stream.string.substr(start, stream.pos - start);
					return null;
				}
				
				if (stream.sol()) {
					state.lineNumber++
				}
				
				// Eat white space and saperators.
				if(stream.eatWhile(/[\s\u00a0;,]/)) {
					return null;
				}
				
				if (state.position === 'key') {
					var key = getKey();
					
					if (!key) {
						return handleError('unrecognized-key');
					}
					if (state.dict.hasOwnProperty(key)) {
						return handleError('duplicate-key');
					}
					state.lastKey = key;
					state.lastKeyStart = stream.pos;
					advanceAfter(key);
					state.position = 'operator';
					return 'def';
				}
				else if (state.position === 'operator') {
					var operator = getOperator()
					if (operator === null) {
						return handleError('missing-operator');
					}
					state.dict[state.lastKey] = {operator: operator, value: null};
					advanceAfter(operator);
					
					state.position = 'value';
					return 'operator';
				}
				else if (state.position === 'value') {
					try {
						var value = getValue();
					}
					catch (err) {
						return handleError(err);
					}
					
					if (value === null) {
						return handleError('missing-value');
					}
					state.dict[state.lastKey].value = value;
					state.position = 'key';
					return 'quote';
				}
				return null;
			},

			startState: function() {
				return {
					position : 'key',	   // Current position, 'key', 'operator', 'value'
					lastKey: null,
					lineNumber: -1,
					lastKeyStart: 0,
					dict: {},
					matches: [], // matches[i] - is the matching in the line i. the matching are pairs of offsets in the line.
					noMatches: [],
				};
			},
			
			copyState: deepCopyState,
		};
	});
	
	function deepCopyState(state) {
		return jQuery.extend(true, {}, state);
	}
	
	function startswith(str, prefix) {
		return (str.search(prefix) === 0);
	}
	
	function renderHint(elm, self, data) {
		var keyDiv = document.createElement('div'),
			  descriptionDiv = document.createElement('div');
			  
		keyDiv.className = 'CodeMirror-hint-key';
		keyDiv.appendChild(document.createTextNode(data.text));
		elm.appendChild(keyDiv);
		
		descriptionDiv.className = 'CodeMirror-hint-description';
		descriptionDiv.appendChild(document.createTextNode(data.description));
		elm.appendChild(descriptionDiv);
	}
	
	function getUnusedKeys(state, tryInclude, prefix) {
		var res = [];
		for (var key in config) {
			if (!state.dict.hasOwnProperty(key) || key === tryInclude) {
				if (!prefix || startswith(key, prefix))
					res.push({text: key, render: renderHint, description: config[key].description});
			}
		}
		return res;
	}
	
	function nextSpace(editor, pos) {
		var offset = editor.getLine(pos.line).substr(pos.ch).search(/[\s\u00a0]/);
		if (offset < 0)
			return Number.MAX_VALUE;
		return pos.ch + offset
	}
	
	CodeMirror.registerHelper("hint", "query", function(editor, options) {
		var cur = editor.getCursor(), token = editor.getTokenAt(cur);
		
		if (token.type === null) {
			var nextToken = editor.getTokenAt(CodeMirror.Pos(cur.line, token.end + 1)), list, from, to, saperatorIndex
					min = Math.min;
			
			saperatorIndex = token.string.substr(cur.ch - token.start).search(/[;,]/);
			
			if (token.state.position === 'key') {
				// Show all the keys that not in use in the final state + the current key (can be get by using the getTokenAt(cur.line, token.end { + 1 if needed}))
				list = getUnusedKeys(editor.getStateAfter(), (saperatorIndex >= 0) ? '' : nextToken.string);
				from = cur.ch;
				to = min(nextToken.end, nextSpace(editor, cur));
			}
			else if (token.state.position === 'operator') {
				// Show all the operators of the state.lastKey.
				list = config[token.state.lastKey].operators;
				from = cur.ch;
				to = min(nextToken.end, nextSpace(editor, cur));
			}
			
			// If a saperator is in token.string[cur:], from = cur.ch, to = cur.ch.
			if (saperatorIndex >= 0) {
				from = cur.ch;
				to = saperatorIndex + cur.ch;
			}
			
			return {list: list || [], from: CodeMirror.Pos(cur.line, from || 0), to: CodeMirror.Pos(cur.line, to || 0)};
		}
		else if (token.type === 'def' || token.type === 'error unrecognized-key') {
			// Show all the keys that not in use in the final state that starts with the token.string[:cur - token.start]  + the current key (can be get by token.string. {Make sure it is a real key before}))
			return {list: getUnusedKeys(editor.getStateAfter(), token.string, token.string.substr(0, cur.ch - token.start)), 
							 from: CodeMirror.Pos(cur.line, token.start), 
							 to: CodeMirror.Pos(cur.line, token.end)};
		}
		else if (token.type === 'operator') {
			// Show all the operators of the state.lastKey.
			return {list: config[token.state.lastKey].operators, 
						 from: CodeMirror.Pos(cur.line, token.start), 
						 to: CodeMirror.Pos(cur.line, token.end)};
		}
		
		
		return {list: [], from: CodeMirror.Pos(cur.line, 0), to: CodeMirror.Pos(cur.line, 0)};
	});

	function myEval(str) {
		var ch = str[0];
		
		if (ch === '(') { // If surrounded with ( ), replace them to [ ].
			str = '[' + str.substr(1, str.length - 2) + ']'
		}
		else if (ch !== '[' && ch !== '"' && ch !== "'") { // If not surrounded in anything, wrap it with " ".
			str = '"' + str + '"';
		}
		return eval(str);
	}
	
	CodeMirror.prototype.getQuery = function () {
		var res = {}, state = this.getStateAfter();
		
		for (var key in state.dict) {
			if (state.dict[key].value)
				res[key] = {
					operator: state.dict[key].operator,
					value: myEval(state.dict[key].value)
				};
		}
		
		return res;
	};
}