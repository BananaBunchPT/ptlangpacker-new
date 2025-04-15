# ptlangpacker
A simplistic Node.js CLI tool to pack Pizza Tower language atlases.

## What you'll need:
- [node.js](https://nodejs.org/en) (Most versions will do)

Run `npm i`, then run `node .` in your favourite terminal and watch it go! Supports most image formats.

## Folder Setup
Create a new folder (with the exception of reserved `export` and `default`) in the root that has the name of your language internally. Then, just drop both static and animated images with the ***EXACT*** names of the sprites you're packing. **Do not** crop the images; ptlangpacker will automatically do so itself to save space. Once run, ptlangpacker will take care of the rest.

## config.json
Simple to follow, I hope. Entries are in the following format:
```json
"spritename": {"x": 0, "y": 0}
```
where x and y are the sprite's offsets within GameMaker. Offsets for sprites replaced in the Language Update are already included.

`default` is the object all languages load from by default. If for any reason an override, create a new object. `ie` is included as example.