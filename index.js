let MaxRectsPacker = require("maxrects-packer").MaxRectsPacker;
const canvas = require("canvas");
const fs = require("fs");
const gifFrames = require("decode-gif");
const cliProgress = require('cli-progress');

const getDirectories = async (source) =>
  (await fs.promises.readdir(source, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

const getConfig = async () =>
  JSON.parse(await fs.promises.readFile("./config.json"));

const options = {
  smart: true,
  pot: true,
  square: false,
  allowRotation: false,
  tag: false,
  border: 0,
};

const barformat = {
  format: '\x1b[33mCurrent progress: [{bar}] {percentage}% | {value}/{total} sprites packed | Time elapsed: {duration_formatted}\x1b[37m',
}

let packer = undefined;
let config = undefined;

async function packAndExport(texturename, config) {
  console.log("\x1b[36mPacking language - " + texturename);
  const bar1 = new cliProgress.SingleBar({ barCompleteString: '|' }, barformat);
  packer = new MaxRectsPacker(2048, 2048, 0, options);

  let struct = { sprites: [] };

  let texturesToPack = await fs.promises.readdir("./" + texturename);
  let r2 = texturesToPack.length;
  bar1.start(r2, 0);
  for (i = 0; i < r2; i++) {
    if (texturesToPack[i] != ".DS_Store") {
      let offset = { x: 0, y: 0 };
      if (config.default != undefined) {
        if (config.default[texturesToPack[i].split(".")[0]] != undefined)
          offset = config.default[texturesToPack[i].split(".")[0]];
      }
      if (config[texturename] != undefined) {
        if (config[texturename][texturesToPack[i].split(".")[0]] != undefined)
          offset = config[texturename][texturesToPack[i].split(".")[0]];
      }
      //FUCK YOU APPLE
      let imgPath = await fs.promises.readFile(
        "./" + texturename + "/" + texturesToPack[i]
      );
      let img = new canvas.Image();
      img.src = imgPath;
      let frames = [];
      switch (texturesToPack[i].split(".")[1]) {
        case "png":
        case "jpeg":
        case "jfif":
        case "webp":
        case "bmp":
        case "ico":
          frames = [
            await exportFrame(
              img,
              texturesToPack[i].split(".")[0],
              texturename,
              offset
            ),
          ];
          break;
        case "gif":
          frames = await getGifFrames(
            imgPath,
            texturesToPack[i].split(".")[0],
            texturename,
            offset
          );
          break;
        default:
          continue;
      }
      struct.sprites.push({
        name: texturesToPack[i].split(".")[0],
        frames: frames,
      });
      bar1.update(i + 1);
    }
  }
  for (v = 0; v < packer.bins.length; v++) {
    const rects = packer.bins[v].rects;
    const exportCanvas = canvas.createCanvas(2048, 2048);
    const context = exportCanvas.getContext("2d");
    for (n = 0; n < rects.length; n++) {
      const img = await imageDataToCanvas(rects[n].data.image);
      context.drawImage(
        img,
        rects[n].x - rects[n].data.place_offset.x,
        rects[n].y - rects[n].data.place_offset.y,
        rects[n].data.ow,
        rects[n].data.oh
      );
    }
    const buffer = exportCanvas.toBuffer("image/png");
    if (!fs.existsSync('./export')) {
      fs.mkdirSync('./export');
    }
    else {
      fs.rmSync('./export', { recursive: true, force: true })
      fs.mkdirSync('./export');
    }
    fs.writeFileSync("./export/" + texturename + String(v) + ".png", buffer);
  }
  let json = JSON.stringify(struct);
  fs.writeFileSync("./export/" + texturename + ".json", json);
  bar1.stop();
}
async function exportFrame(img, name, texturename, offset) {
  if (!(img instanceof canvas.ImageData)) img = await imageToImageData(img);
  let trimmed = trimImageData(img);
  packer.add(trimmed.width, trimmed.height, {
    name: name,
    image: img,
    place_offset: { x: trimmed.margins.left, y: trimmed.margins.top },
    ow: img.width,
    oh: img.height,
  });
  let index = 0;
  for (const bin of packer.bins) {
    for (rect of bin.rects) {
      if (rect.data.name == name) {
        return {
          texture: texturename + String(index) + ".png",
          x: rect.x,
          y: rect.y,
          offset: {
            x: offset.x - trimmed.margins.left,
            y: offset.y - trimmed.margins.top,
          },
          width: rect.width,
          height: rect.height,
          frameOrder: name.includes("@") ? Number(name.split("@")[1]) : 0,
          crop_x: trimmed.margins.left,
          crop_y: trimmed.margins.top,
        };
      }
    }
    index++;
  }
  return undefined;
}

async function getGifFrames(img, name, texturename, offset) {
  let frames = gifFrames(img);
  let returnful = [];
  for (l = 0; l < frames.frames.length; l++) {
    let img2 = new canvas.ImageData(
      frames.frames[l].data,
      frames.width,
      frames.height
    );
    returnful.push(
      await exportFrame(img2, `${name}@${l}`, texturename, offset)
    );
  }
  return returnful;
}

async function imageToImageData(img) {
  const exportCanvas = canvas.createCanvas(img.width, img.height);
  const context = exportCanvas.getContext("2d");
  context.drawImage(img, 0, 0, img.width, img.height);
  return context.getImageData(0, 0, img.width, img.height);
}

async function imageDataToCanvas(img) {
  const exportCanvas = canvas.createCanvas(img.width, img.height);
  const context = exportCanvas.getContext("2d");
  context.putImageData(img, 0, 0);
  return exportCanvas;
}

function trimImageData(img) {
  let margin_left = 0;
  let margin_top = 0;

  let margin_right = 0;
  let margin_bottom = 0;

  //Left Margin
  for (let x = 0; x < img.width; x++) {
    let hasPixels = false;
    for (let y = 0; y < img.height; y++) {
      if (img.data[4 * (img.width * y + x) + 3] > 0) {
        hasPixels = true;
        break;
      }
    }
    margin_left = x;
    if (hasPixels)
      break;
  }

  //Right Margin
  for (let x = img.width - 1; x > 0; x--) {
    let hasPixels = false;
    for (let y = 0; y < img.height; y++) {
      if (img.data[4 * (img.width * y + x) + 3] > 0) {
        hasPixels = true;
        break;
      }
    }
    margin_right = x;
    if (hasPixels)
      break;
  }


  //Top Margin
  for (let y = 0; y < img.height; y++) {
    let hasPixels = false;
    for (let x = 0; x < img.width; x++) {
      if (img.data[4 * (img.width * y + x) + 3] > 0) {
        hasPixels = true;
        break;
      }
    }
    margin_top = y;
    if (hasPixels)
      break;
  }

  //Bottom Margin
  for (let y = img.height - 1; y > 0; y--) {
    let hasPixels = false;
    for (let x = 0; x < img.width; x++) {
      if (img.data[4 * (img.width * y + x) + 3] > 0) {
        hasPixels = true;
        break;
      }
    }
    margin_bottom = y;
    if (hasPixels)
      break;
  }

  return {
    width: margin_right - margin_left,
    height: margin_bottom - margin_top,
    margins: {
      left: margin_left,
      right: margin_right,
      top: margin_top,
      bottom: margin_bottom,
    },
  };
}

async function main() {
  config = await getConfig();
  const directories = await getDirectories("./");
  for (let directory of directories) {
    if (directory != "node_modules" && directory != "export" && directory != "default" && !directory.startsWith('.')) {
      await packAndExport(directory, config);
    }
  }
  console.log('\x1b[32mDone! Enjoy.\x1b[37m')
}
main();