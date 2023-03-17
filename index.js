/**
 * Converts all replays in the ./replays folder into anonymized replays outputted in ./replays/out
 * Will also keep track of Steam IDs for all replays, and will use the same name if a Steam ID is
 * present in multiple replays.
 */
const fs = require("fs");

const namePool = require("./pool.json");
const { convert } = require("./convert");

let players = [];

if (!fs.existsSync("players.json")) fs.writeFileSync("players.json", "[]");
if (!fs.existsSync("replays")) fs.mkdirSync("replays");

try {
  players = JSON.parse(fs.readFileSync("players.json", { encoding: "utf-8" }));
} catch (err) {
  console.error("Failed to read players file.", err);
}

const getNewName = () => {
  for (let i = 0; i < namePool.length; i++) {
    if (!players.find((x) => x.anonymous_name === namePool[i]))
      return namePool[i];
  }
};

const files = fs
  .readdirSync("replays", { withFileTypes: false })
  .filter((x) => x.endsWith(".replay"))
  .map((v) => v.replaceAll(".replay", ""));

console.log();

(async () => {
  for (let i = 0; i < files.length; i++) {
    process.stdout.write(
      `\x1b[1;34m[${i + 1}/${files.length}] Converting .replay file \x1b[1;33m${
        files[i]
      }.replay\x1b[1;32m`
    );
    await convert(files[i], players, getNewName);
    process.stdout.write("\x1b[0m");
  }

  fs.writeFileSync("players.json", JSON.stringify(players, undefined, 2));
  console.log();
  console.log(
    `  \x1b[1;32m\u2713 Successfully converted ${files.length} replay${
      files.length === 1 ? "" : "s"
    }`
  );
})();
