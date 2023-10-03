const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const yargs = require('yargs');

class ErrorLogger {
  constructor() {
    this.errors = [];
  }

  logError(filename, log) {
    this.errors.push({ filename, log });
  }

  printErrors() {
    if (this.errors.length > 0) {
      console.error('Erros de compilação:'.red);
      this.errors.forEach((error) => {
        console.error(`Arquivo: ${error.filename}`);
        console.error('Log de Erro:');
        console.error(error.log.red);
      });
      console.log(
        `====================== [ COMPILAÇÃO FINALIZADA COM FALHAS ] =======================`.red
      );
    } else {
      console.log('Todos os arquivos compilados com sucesso.'.green);
      console.log(
        `====================== [ COMPILAÇÃO FINALIZADA ] =======================`.magenta
      );
    }
  }
}

const errorLogger = new ErrorLogger();
const { argv } = yargs
  .options('work', {
    alias: 'w',
    describe: 'Diretório de trabalho com base na raiz do projeto',
    default: './localdowork',
    type: 'string',
  });

const localDoWork = argv.work;
const sourceDirectories = [
  path.join(__dirname, "../../Works", localDoWork, 'gamemodes'),
  path.join(__dirname, "../../Works", localDoWork, 'filterscripts'),
];
const isWindows = process.platform === 'win32';
const workerdir = path.join(__dirname, '../../Works', localDoWork, 'pawno')
const compileCommand = isWindows
    ? path.join(workerdir, 'pawncc.exe')
    : path.join(workerdir, 'pawncc')
if (fs.existsSync(compileCommand)) {
  console.log("iniciando compilador na plataforma : " + process.platform)
  const compileCommand = isWindows
    ? path.join(workerdir, 'pawncc.exe')
    : path.join(workerdir, 'pawncc');

  // Verifica se a pasta 'pawno' existe e a cria se não existir
  if (!fs.existsSync(workerdir)) {
    console.log('pasta pawno não encontrada. Criando uma...');
    try {
      fs.copyFileSync("./workcore/core/pawno", workerdir);
      console.log('pasta pawno criada com sucesso.');

    } catch (err) {
      console.error(`Erro ao tentar criar a pasta pawno básica: ${err.message}`);
      return process.exit(1)
    }
  }

  // Verifica se o executável de compilação 'pawncc' existe e o copia se não existir
  if (!fs.existsSync(compileCommand)) {
    console.log('Arquivo não encontrado. Copiando...');

    // Copiar o arquivo a partir de um local existente para o destino
    const sourcePath = isWindows
      ? './workcore/core/pawno/pawncc.exe'
      : './workcore/core/pawno/pawncc';

    fs.copyFile(sourcePath, compileCommand, (err) => {
      if (err) {
        console.error(`Erro ao copiar o arquivo: ${err.message}`);
        return;
      }
      if (!isWindows) {
        try {
          // Executa o comando chmod para dar permissão 777 ao arquivo.
          execSync(`chmod 777 ${compileCommand}`);

          console.log('Permissão 777 concedida ao pawncc com sucesso.');
        } catch (error) {
          console.error('Erro ao conceder permissão 777 ao pawncc, conceda a permissão manualmente:', error.message);
          return process.exit(1);
        }
      }
      console.log('Arquivo copiado com sucesso.');
      console.log('Continuando com o código...');
    });
  }
}
console.log(
  `==================== [ INICIANDO NOVA COMPILAÇÃO ] =====================`.magenta
);

// Função para compilar um arquivo
const compileFile = async (filePath, sourceDirectory) => {
  const compileProcess = spawn(compileCommand, [
    filePath,
    `-D${path.dirname(filePath)}`,
    '-;+',
    '-(+)',
    '-d3',
  ]);

  console.log(
    `==================== [ Compilando ${path.basename(filePath)} ] =====================`.cyan
  );

  const compileOutput = [];
  const compileError = [];

  compileProcess.stdout.on('data', (data) => {
    compileOutput.push(data.toString());
  });

  compileProcess.stderr.on('data', (data) => {
    compileError.push(data.toString());
  });

  await new Promise((resolve) => {
    compileProcess.on('close', (code) => {
      if (code === 0) {
        console.log(
          `==================== [ Compilado ${path.basename(filePath)}  ] =====================`.green
        );
      } else {
        console.error(
          `==================== [ Compilação com Falha ${path.basename(filePath)}] =====================`.red
        );
        errorLogger.logError(filePath, compileError.join(''));
      }
      resolve();
    });
  });
};

// Função para compilar todos os arquivos nas pastas de origem
const compileAll = async () => {
  for (const sourceDirectory of sourceDirectories) {
    if (!fs.existsSync(sourceDirectory)) {
      console.log(`A pasta ${sourceDirectory} não existe. Pulando...`.yellow);
      continue;
    }

    const files = fs.readdirSync(sourceDirectory);

    for (const file of files) {
      const filePath = path.join(sourceDirectory, file);

      if (path.extname(filePath) === '.pwn') {
        await compileFile(filePath, sourceDirectory);
      }
    }
  }

  errorLogger.printErrors();
};

// Inicia a compilação de todos os arquivos
compileAll();
