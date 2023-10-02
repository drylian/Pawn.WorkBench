const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const yargs = require('yargs');

const argv = yargs
  .option('work', {
    alias: 'w',
    describe: 'Diretório de trabalho com base na raiz do projeto',
    default: './localdowork',
    type: 'string',
  }).argv;

const workDirectory = "Works/" + argv.work;
const buildDirectory = path.join(__dirname, "../..", workDirectory, 'build');
const buildedDirectory = path.join(__dirname, "../..", workDirectory, 'builded');
const buildedZipPath = path.join(__dirname, "../..", workDirectory, 'builded.zip');

// Pastas e extensões a serem excluídas por padrão
const excludedFolders = ['pawno', 'include', 'builded'];
const excludedExtensions = ['.pwn'];

async function createBuildedDirectory() {
  try {
    const exists = await fsPromises.access(buildedDirectory, fsPromises.constants.F_OK)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      await fsPromises.mkdir(buildedDirectory);
      console.log(`Pasta 'builded' criada em ${buildedDirectory}`);
    } else {
      console.log(`A pasta 'builded' já existe em ${buildedDirectory}`);
    }
  } catch (error) {
    console.error(`Erro ao criar a pasta 'builded': ${error.message}`);
  }
}

async function ensureDirectoryExists(directoryPath) {
  try {
    await fsPromises.access(directoryPath, fsPromises.constants.F_OK);
  } catch (error) {
    // Se o diretório não existe, crie-o
    await fsPromises.mkdir(directoryPath, { recursive: true });
  }
}

async function createIgnoreMeFile(directoryPath) {
  try {
    const ignoreMePath = path.join(directoryPath, '.ignore_me');
    await fsPromises.writeFile(ignoreMePath, '');
    console.log(`Arquivo .ignore_me criado em ${ignoreMePath}`);
  } catch (error) {
    console.error(`Erro ao criar o arquivo .ignore_me: ${error.message}`);
  }
}

async function collectFilesForWindowsAndLinux() {
  try {
    const foldersToInclude = [];
    const scriptfilesPath = path.join(buildedDirectory, "..", 'scriptfiles');

    async function findFoldersWithAmxOrSo(dir) {
      const files = await fsPromises.readdir(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fsPromises.stat(filePath);

        if (stat.isDirectory()) {
          const folderFiles = await fsPromises.readdir(filePath);
          const containsAmxOrSo = folderFiles.some((folderFile) =>
            ['.amx', '.so', '.dll'].includes(path.extname(folderFile))
          );

          if (containsAmxOrSo) {
            foldersToInclude.push(filePath);
            if (filePath !== scriptfilesPath) {
              await createIgnoreMeFile(filePath);
            }
          } else {
            await findFoldersWithAmxOrSo(filePath);
          }
        }
      }
    }

    await findFoldersWithAmxOrSo(scriptfilesPath);

    const sourceFolders = ['filterscripts', 'gamemodes'];
    for (const folder of sourceFolders) {
      const sourcePath = path.join(buildedDirectory, "..", folder);
      const destinationPath = path.join(buildedDirectory, folder);

      // Certifique-se de que o diretório de destino exista
      await ensureDirectoryExists(destinationPath);

      const files = await fsPromises.readdir(sourcePath);
      for (const file of files) {
        if (['.amx', '.so', '.dll'].includes(path.extname(file))) {
          const sourceFile = path.join(sourcePath, file);
          const destinationFile = path.join(destinationPath, file);

          // Certifique-se de que o diretório de destino exista
          await ensureDirectoryExists(path.dirname(destinationFile));

          await fsPromises.copyFile(sourceFile, destinationFile);
        }
      }
    }

    const output = fs.createWriteStream(buildedZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Arquivo builded.zip criado em ${buildedZipPath}`);
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    for (const folder of foldersToInclude) {
      archive.directory(folder, path.relative(scriptfilesPath, folder));
    }

    // Incluir todas as pastas da raiz do diretório de trabalho no arquivo ZIP
    await includeAllFoldersInRoot(archive);

    archive.finalize();
  } catch (error) {
    console.error(`Erro ao criar os arquivos de zip: ${error.message}`);
  }
}

// Função para verificar se uma pasta deve ser excluída com base no build.json
function isExcludedFolder(folderName) {
  // Verifique se a pasta está na lista de pastas excluídas por padrão
  if (excludedFolders.includes(folderName)) {
    return true;
  }

  const buildJsonPath = path.join(workDirectory, 'build.json');
  try {
    const buildJson = require(buildJsonPath);
    if (buildJson && buildJson.exclude && buildJson.exclude.includes(folderName)) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Verifique o arquivo build.json ou inclua todas as pastas da raiz no ZIP
async function checkBuildJson() {
  const buildJsonPath = path.join(workDirectory, 'build.json');
  try {
    await fsPromises.access(buildJsonPath, fsPromises.constants.F_OK);
  } catch (error) {
    // Se o arquivo build.json não existe, inclua todas as pastas da raiz no ZIP
    const output = fs.createWriteStream(buildedZipPath, { flags: 'w' });
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Arquivo builded.zip criado em ${buildedZipPath}`);
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    await includeAllFoldersInRoot(archive);

    archive.finalize();
  }
}

// Função para incluir todas as pastas da raiz do diretório de trabalho no ZIP
async function includeAllFoldersInRoot(archive) {
  const rootFiles = await fsPromises.readdir(workDirectory);
  for (const file of rootFiles) {
    const filePath = path.join(workDirectory, file);
    const stat = await fsPromises.stat(filePath);

    if (stat.isDirectory() && !isExcludedFolder(file)) {
      archive.directory(filePath, file);
      if ((await fsPromises.readdir(filePath)).length === 0) {
        await createIgnoreMeFile(filePath); // Adicione .ignore_me em pastas vazias
      }
    } else if (!file.endsWith('.pwn')) {
      // Se não for um diretório e não for um arquivo .pwn, copie-o para o ZIP
      archive.file(filePath, { name: file });
    }
  }
}

// Verifique o arquivo build.json ou inclua todas as pastas da raiz no ZIP
async function main() {
  await createBuildedDirectory();
  await checkBuildJson();
  await collectFilesForWindowsAndLinux();
}

main().catch((error) => {
  console.error(`Ocorreu um erro: ${error.message}`);
});
