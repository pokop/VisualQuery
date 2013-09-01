VisualQuery
===========

An extension of CodeMirror for VisualQuery language. 




VisualQuery Language Syntax(BNF)
---------------------------------
`expresion` __::=__ `literal` __|__ `literal` `separator` `expresion`<br />
`literal` __::=__ `key` `operator` `value`<br />
`key` __::=__ *An element from the keys list.*<br />
`operator` __::=__ *An element from the key's operators list.*<br />
`value` __::=__ `[^.;\\s]+` __|__ `'` `[^']*` `'` __|__ `"` `[^"]*` `"` __|__ `(` `values` `)` __|__ `[` `values` `]` __|__ `{` `values` `}`<br />
`values` __::=__ `values-list` __|__ ` `<br />
`values-list` __::=__ `values-list` `separator` `value` __|__ `value`<br />
`separator` __::=__ `separator` `single-separator` __|__ `single-separator`<br />
`single-separator` __::=__ `,` __|__ `;` __|__ `<space>`<br />
