const fs = require('fs')
const path = require('path')

function parseSteamVdfFile(filePath) {
  const vdfContents = fs.readFileSync(filePath, 'utf8')
  let indentLevel = 0,
      foundApps = false,
      libraryFolders,
      data,
      pathStr
  
  vdfContents.split('\n').forEach(line => {
    if (/libraryfolder/.test(line)) {
      libraryFolders = []
    }
    if (libraryFolders && /^\s*"\d"\s*$/.test(line)) {
      data = []
    }
    if (data && /^\s*"path"\s*/.test(line)) {
      pathStr = line.match( /^\s*"path"\s*"(.*?)"\s*$/)[1]
    }
    if (data && /^\s*"apps"\s*$/.test(line)) {
      foundApps = true
    }
    if (foundApps && /^\s*"(\d+)"/.test(line)) {
      data.push(line.match(/^\s*"(\d+)"/)[1])
    }
    if (/^\s*{\s*$/.test(line)) {
      indentLevel++
    } else if (/^\s*}\s*$/.test(line)) {
      indentLevel--
      if (foundApps) {
        foundApps = false
      } else {
        pathStr && data && libraryFolders.push({ path: path.normalize(pathStr), apps: data })
        pathStr = undefined
        data = undefined
      }
    }
  })
  return libraryFolders
}

function copyPakFile(filename) {
  const srcPath = path.join(__dirname, '../paks', filename)
  const destPath = path.join(installPath, filename)
  const readStream = fs.createReadStream(srcPath);
  const writeStream = fs.createWriteStream(destPath);

  readStream.on('error', e => { throw e });
  writeStream.on('error',  e => { throw e });

  readStream.on('close', function () {
      fs.unlink(srcPath, () => {});
  });

  readStream.pipe(writeStream);
}


const steamFoldersVdfPath = path.join('C:', 'Program Files (x86)', 'Steam/steamapps/libraryfolders.vdf')
const libraryFolders = parseSteamVdfFile(steamFoldersVdfPath)
const destLibrary = libraryFolders?.filter(val => val.apps.includes('1149460'))?.[0]?.path

if (!destLibrary) {
  throw new Error('Cannot find appid in Steam Library')
}

const gamePakFolder = path.join(destLibrary, '/steamapps/common/Icarus/Icarus/Content/Paks')

if (!fs.existsSync(gamePakFolder)) throw new Error('Game is not installed in Steam Library')

const installPath = path.join(gamePakFolder, 'mods')

if (!fs.existsSync(installPath)) fs.mkdirSync(installPath)

fs.readdirSync(path.join(__dirname, '../paks'))
  .forEach(copyPakFile)
