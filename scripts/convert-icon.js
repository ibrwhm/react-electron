const pngToIco = require("png-to-ico");
const fs = require("fs");
const path = require("path");

async function convertToIco() {
  try {
    const pngPath = path.join(__dirname, "../public/assets/icon.ico");
    const icoPath = path.join(__dirname, "../build/icon.ico");

    // build klasörünü oluştur
    if (!fs.existsSync(path.join(__dirname, "../build"))) {
      fs.mkdirSync(path.join(__dirname, "../build"));
    }

    const buf = await pngToIco(pngPath);
    fs.writeFileSync(icoPath, buf);

    console.log("Icon başarıyla dönüştürüldü:", icoPath);
  } catch (error) {
    console.error("Icon dönüştürme hatası:", error);
    process.exit(1);
  }
}

convertToIco();
