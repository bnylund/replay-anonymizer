const { execSync } = require("child_process");
const fs = require("fs");

// Not exactly default blue, but my blue colors (got lazy)
const DEFAULT_BLUE = {
  accent_color: 90,
  accent_finish: 270,
  primary_color: 9,
  primary_finish: 270,
  team: 0,
};

const DEFAULT_ORANGE = {
  accent_color: 0,
  accent_finish: 270,
  primary_color: 33,
  primary_finish: 270,
  team: 1,
};

const DEFAULT_LOADOUT = [
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
];

const DEFAULT_OCTANE = {
  antenna: 0,
  banner: 2526,
  body: 23,
  decal: 0,
  engine_audio: 0,
  goal_explosion: 1903,
  rocket_trail: 32,
  topper: 0,
  trail: 1948,
  unknown1: 0,
  unknown2: 0,
  unknown3: 0,
  unknown4: 0,
  unknown5: 3085,
  unknown6: 0,
  version: 28,
  wheels: 376,
};

// Takes in a filename without the extension
module.exports.convert = async (file, players, getNewName) => {
  const start = Date.now();

  fs.mkdirSync("replays/out", { recursive: true });
  fs.mkdirSync("replays/processed", { recursive: true });

  const workFile = `replays/out/${file}.json`;
  if (fs.existsSync(workFile)) fs.unlinkSync(workFile);

  execSync(
    `bin\\rattletrap-12.0.1-windows.exe -m decode -i "replays/${file}.replay" -o "${workFile}"`
  );

  let REPLAY;

  try {
    const data = fs.readFileSync(workFile);
    REPLAY = JSON.parse(data);
  } catch (err) {
    return err;
  }

  /**
   * To change:
   * - TAGame.PRI_TA:ClientLoadouts (Car) [done]
   * - TAGame.PRI_TA:ClientLoadoutsOnline (UserColor, Title) [done]
   * - Engine.PlayerReplicationInfo:PlayerName [done]
   * - Engine.PlayerReplicationInfo:UniqueId [done]
   * - Engine.PlayerReplicationInfo:Ping [done]
   * - TAGame.CameraSettingsActor_TA:ProfileSettings (for camera settings) [done]
   * - ProjectX.GRI_X:Reservations [done]
   * - TAGame.Car_TA:TeamPaint [done]
   */

  const map = {};

  // Go frame-by-frame to save on performance.
  const FRAMES = REPLAY.header.body.properties.value.NumFrames.value.int;
  for (let i = 0; i < FRAMES; i++) {
    const replications = REPLAY.content.body.frames[i].replications;
    for (let y = 0; y < replications.length; y++) {
      const { value } = replications[y];

      if (value.updated) {
        const pribot = value.updated.find(
          (x) => x.name === "Engine.PlayerReplicationInfo:bBot"
        );

        // Don't update bots!!!!
        if (pribot && pribot.value.boolean) continue;

        const priuid = value.updated.find(
          (x) => x.name === "Engine.PlayerReplicationInfo:UniqueId"
        );
        const priname = value.updated.find(
          (x) => x.name === "Engine.PlayerReplicationInfo:PlayerName"
        );

        // Obtain UniqueId and Name if this "block" of replications contains player info
        const uid = priuid
          ? Object.values(priuid.value.unique_id.remote_id)[0]
          : null;
        const name = priname ? priname.value.string : null;

        if (uid && name) {
          let epl = players.find((x) => x.platform_id === uid);
          if (!epl) {
            const nn = getNewName();
            // console.log(`New player: ${name} -> ${nn} [${uid}]`);
            epl = {
              platform_id: uid,
              anonymous_name: nn,
              anonymous_platform_id: String(players.length + 50),
              name: name,
            };
            players.push(epl);
          }

          map[uid] = {
            platform_id: uid,
            anonymous_platform_id: epl.anonymous_platform_id,
            anonymous_name: epl.anonymous_name,
            name: name,
          };
        }

        for (let z = 0; z < value.updated.length; z++) {
          const upd = value.updated[z];
          // DO THE UPDATES HERE
          if (upd.name === "Engine.PlayerReplicationInfo:PlayerName") {
            upd.value.string = map[uid].anonymous_name;
          } else if (upd.name === "Engine.PlayerReplicationInfo:Ping") {
            upd.value.byte = 0;
          } else if (upd.name === "ProjectX.GRI_X:Reservations") {
            const muid = Object.values(
              upd.value.reservation.unique_id.remote_id
            )[0];

            let epl = players.find((x) => x.platform_id === muid);
            if (!epl) {
              const nn = getNewName();
              epl = {
                platform_id: muid,
                anonymous_name: getNewName(),
                anonymous_platform_id: String(players.length + 50),
                name: upd.value.reservation.name,
              };
              players.push(epl);
            }

            if (!map[muid]) {
              map[muid] = {
                platform_id: muid,
                anonymous_platform_id: epl.anonymous_platform_id,
                anonymous_name: epl.anonymous_name,
                name: upd.value.reservation.name,
              };
            }

            upd.value.reservation.name = map[muid].anonymous_name;
            upd.value.reservation.unique_id.remote_id.steam =
              map[muid].anonymous_platform_id;
            upd.value.reservation.unique_id.system_id = 1;
          } else if (upd.name === "Engine.PlayerReplicationInfo:UniqueId") {
            upd.value.unique_id.system_id = 1;
            upd.value.unique_id.remote_id.steam =
              map[uid].anonymous_platform_id;
          } else if (
            upd.name === "TAGame.CameraSettingsActor_TA:ProfileSettings"
          ) {
            upd.value.cam_settings = {
              angle: -3,
              distance: 270,
              fov: 110,
              height: 100,
              stiffness: 0.65,
              swivel_speed: 4,
              transition_speed: 1.8,
            };
          } else if (upd.name === "TAGame.PRI_TA:ClientLoadoutsOnline") {
            upd.value.loadouts_online.blue = DEFAULT_LOADOUT;
            upd.value.loadouts_online.orange = DEFAULT_LOADOUT;
          } else if (upd.name === "TAGame.PRI_TA:ClientLoadouts") {
            upd.value.loadouts.blue = DEFAULT_OCTANE;
            upd.value.loadouts.orange = DEFAULT_OCTANE;
          } else if (upd.name === "TAGame.Car_TA:TeamPaint") {
            upd.value.team_paint =
              upd.value.team_paint.team === 0 ? DEFAULT_BLUE : DEFAULT_ORANGE;
          }
        }
      } else if (value.spawned) {
      }
    }
  }

  // Write Replay Metadata
  const new_name = file;
  REPLAY.header.body.properties.value.ReplayName = {
    kind: "StrProperty",
    size: String(new_name.length),
    value: {
      str: new_name,
    },
  };

  const now = new Date();
  REPLAY.header.body.properties.value.Date.value.str = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()} ${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;

  try {
    const goals = REPLAY.header.body.properties.value.Goals.value.array;
    for (let i = 0; i < goals.length; i++) {
      try {
        const nn =
          map[
            Object.keys(map).find(
              (x) => map[x].name === goals[i].value.PlayerName.value.str
            )
          ];
        goals[i].value.PlayerName.value.str = nn.anonymous_name;
        goals[i].value.PlayerName.size = String(nn.anonymous_name.length + 5);
      } catch (err) {
        /* Will throw an error for bots */
      }
    }
  } catch (err) {}

  try {
    const stats = REPLAY.header.body.properties.value.PlayerStats.value.array;
    for (let i = 0; i < stats.length; i++) {
      try {
        const pl =
          map[
            Object.keys(map).find(
              (x) => map[x].name === stats[i].value.Name.value.str
            )
          ];
        stats[i].value.Name.value.str = pl.name;
        stats[i].value.Name.size = String(pl.name.length + 5);
        stats[i].value.OnlineID.value.q_word = pl.anonymous_platform_id;
        stats[i].value.Platform.value.byte = [
          "OnlinePlatform",
          "OnlinePlatform_Steam",
        ];
      } catch (err) {
        /* Will also throw an error for bots */
      }
    }
  } catch (err) {}

  if (!REPLAY.header.body.properties.keys.includes("ReplayName"))
    REPLAY.header.body.properties.keys.push("ReplayName");

  REPLAY.content.body.names = REPLAY.content.body.names.filter(
    (x) => !x.startsWith("RP") && !x.startsWith("S") && !x.startsWith("E")
  );

  // Write to file
  const REPLAY_JSON = JSON.stringify(REPLAY, undefined, 2);
  fs.writeFileSync(workFile, REPLAY_JSON);
  fs.renameSync(`replays/${file}.replay`, `replays/processed/${file}.replay`);

  execSync(
    `bin\\rattletrap-12.0.1-windows.exe -m encode -i "${workFile}" -o "replays/out/${file}.anonymous.replay"`
  );

  fs.rmSync(workFile);

  console.log(`  \u2713 ${((Date.now() - start) / 1000).toFixed(3)}s`);
};
