import {
  Config,
  EntityType,
  FactorioBlueprint,
  FactorioEntity,
} from "../types/types";

const scale = 6;

const tilesWithSubstation = [
  [0, 2],
  [1, 2],
  [2, 2],
  [2, 1],
  [2, 0],
];
const tilesWithRoboport = [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [1, 0],
  [1, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 5],
  [2, 0],
  [2, 1],
  [3, 0],
  [3, 1],
  [4, 0],
  [4, 1],
  [5, 0],
  [5, 1],
];
const tilesWithBoth = [
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 5],
  [2, 0],
  [2, 1],
  [3, 0],
  [3, 1],
  [4, 0],
  [4, 1],
  [5, 0],
  [5, 1],
];

/**
 * 2d to 1d index maping
 */
const index = (x: number, y: number, width: number, size: number) =>
  (y * width + x) * size;

/**
 * maps a color to a type
 */
const mapColor = (
  color: number[],
  config: Config
): EntityType | "transparent" => {
  const isTransparent = config.transparency && color[3] === 0;
  const brightness =
    ((color[0] + color[1] + color[2]) * color[3]) / 255 / 255 / 3;

  return isTransparent
    ? "transparent"
    : config.walls && brightness > 0.9
    ? "stone-wall"
    : brightness > config.threshold
    ? "accumulator"
    : "solar-panel";
};

/**
 * Creates a blueprint object
 */
export const calculateBlueprint = async (
  data: Uint8ClampedArray,
  size: { width: number; height: number },
  config: Config
) => {
  const then = performance.now();

  let entity_number = 1;

  const blueprint: FactorioBlueprint = {
    blueprint: {
      item: "blueprint",
      label: config.name,
      entities: [],
      tiles: [],
      label_color: { r: 0, g: 0, b: 0, a: 0 },
      icons: [],
      schedules: [],
      version: 1,
    },
  };

  const scaledWidth = size.width * scale;
  const scaledHeight = size.height * scale;
  const halfWidth = Math.floor(scaledWidth / 2);
  const halfHeight = Math.floor(scaledHeight / 2);

  for (
    let fileY = 0, scaledY = 0;
    fileY < size.height;
    fileY++, scaledY += scale
  ) {
    for (
      let fileX = 0, scaledX = 0;
      fileX < size.width;
      fileX++, scaledX += scale
    ) {
      const i = index(fileX, fileY, size.width, 4);
      const color = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      const type = mapColor(color, config);

      if (type === "transparent") {
        continue;
      }

      const needsPowerPole = (fileX + 2) % 3 === 0 && (fileY + 2) % 3 === 0;
      const needsRoboPort =
        config.roboports && (fileX + 1) % 9 === 0 && (fileY + 1) % 9 === 0;

      const entityX = scaledX - halfWidth;
      const entityY = scaledY - halfHeight;

      if (type === "stone-wall") {
        console.log("wall", entityX, entityY);
        const wallPositions =
          needsPowerPole && needsRoboPort
            ? tilesWithBoth
            : needsPowerPole
            ? tilesWithSubstation
            : needsRoboPort
            ? tilesWithRoboport
            : null;

        if (wallPositions) {
          for (let [x, y] of wallPositions) {
            console.log(" - pushing");
            blueprint.blueprint.entities.push({
              entity_number: entity_number++,
              name: "stone-wall",
              position: { x: entityX + x, y: entityY + y },
            });
          }
        } else {
          for (let yi = 0; yi < 6; yi++) {
            for (let xi = 0; xi < 6; xi++) {
              console.log(" - pushing");
              blueprint.blueprint.entities.push({
                entity_number: entity_number++,
                name: "stone-wall",
                position: { x: entityX + xi, y: entityY + yi },
              });
            }
          }
        }
      }

      if (type === "accumulator") {
        for (let yi = 0; yi < 3; yi++) {
          for (let xi = 0; xi < 3; xi++) {
            if (needsPowerPole && yi === 0 && xi === 0) {
              continue;
            }

            if (needsRoboPort && yi > 0 && xi > 0) {
              continue;
            }

            blueprint.blueprint.entities.push({
              entity_number: entity_number++,
              name: "accumulator",
              position: { x: entityX + xi * 2, y: entityY + yi * 2 },
            } as FactorioEntity);
          }
        }
      }

      // cant place any solar panels on the robo port pixels
      if (type === "solar-panel") {
        if (needsRoboPort) {
          const tilePositions = needsPowerPole
            ? tilesWithBoth
            : tilesWithRoboport;
          tilePositions.forEach(([x, y]) => {
            blueprint.blueprint.tiles.push({
              name: "concrete-reinforced",
              position: { x: entityX + x, y: entityY + y },
            });
          });
        } else {
          for (let yi = 0; yi < 2; yi++) {
            for (let xi = 0; xi < 2; xi++) {
              if (yi === 0 && xi === 0 && needsPowerPole) {
                if (config.tiles) {
                  tilesWithSubstation.forEach(([x, y]) => {
                    blueprint.blueprint.tiles.push({
                      name: "concrete-reinforced",
                      position: { x: entityX + x, y: entityY + y },
                    });
                  });
                }

                continue;
              }

              blueprint.blueprint.entities.push({
                entity_number: entity_number++,
                name: "solar-panel",
                position: { x: entityX + xi * 3, y: entityY + yi * 3 },
              } as FactorioEntity);
            }
          }
        }
      }

      if (needsPowerPole) {
        blueprint.blueprint.entities.push({
          entity_number: entity_number++,
          name: "substation",
          position: { x: entityX, y: entityY },
        } as FactorioEntity);
      }

      if (needsRoboPort) {
        blueprint.blueprint.entities.push({
          entity_number: entity_number++,
          name: "roboport",
          position: { x: entityX + 3, y: entityY + 3 },
        } as FactorioEntity);
      }
    }
  }

  const now = performance.now();

  console.log("Calculating blueprint:", now - then + "ms");

  return blueprint;
};