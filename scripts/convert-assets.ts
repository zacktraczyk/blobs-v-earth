import sharp from "sharp";
import fs from "fs";
import path from "path";

const assetsDir = path.join(process.cwd(), "public", "assets");

async function convertSvgToPng(svgFile: string) {
  const svgPath = path.join(assetsDir, svgFile);
  const pngPath = path.join(assetsDir, svgFile.replace(".svg", ".png"));

  try {
    await sharp(svgPath).png().toFile(pngPath);
    console.log(`Converted ${svgFile} to PNG`);
  } catch (error) {
    console.error(`Error converting ${svgFile}:`, error);
  }
}

async function main() {
  const files = fs.readdirSync(assetsDir);
  const svgFiles = files.filter((file) => file.endsWith(".svg"));

  for (const file of svgFiles) {
    await convertSvgToPng(file);
  }
}

main().catch(console.error);
