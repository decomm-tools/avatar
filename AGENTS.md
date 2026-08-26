# decomm avatar

TypeScript in this repo uses arrow functions only (`const foo = () => {}`, including class fields).
Do not add `function` declarations. Constructors are the exception.

The face is the decomm mark without the plug: one rounded socket, two vertical eyes. Every avatar
uses the same square ink background. Vary the face: color, size, corners, eyes, outline vs filled.
Do not swap light/dark tiles or circle vs square canvases. Do not add a plug, a mouth, or extra
ornaments. Runtime files must not import the network. Tests may use `@std/assert`.
