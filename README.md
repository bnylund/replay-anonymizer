# replay-anonymizer

To convert replays, dump your `.replay` files into the `replays` folder in this directory. The `replays` folder will get created on first run. Then, upon running `node index.js`, it will convert all of your replays into an anonymous version in the `replays/out` directory and put the player mappings in the `players.json` file.



## Usage

```sh
mkdir replays
# ... Copy over .replay files to replays directory ...
node index.js
```