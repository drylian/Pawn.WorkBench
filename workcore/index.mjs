import fs from 'fs/promises';
import fss from 'fs';

import inquirer from 'inquirer';
import * as path from 'path';
import axios from 'axios';
import extract from 'extract-zip';
import { NodemonStart } from './core/nodemon.mjs';

const worksDirectory = path.join('Works'); // Pasta onde estão os projetos

async function createWorksFolder() {
  console.log("A pasta 'Works' não existe.");

  // Pergunte ao usuário se deseja criar a pasta "Works"
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'createWorksFolder',
      message: 'Deseja criar a pasta "Works"?',
      default: true,
    },
  ]);

  if (answers.createWorksFolder) {
    // Crie a pasta 'Works'
    await fs.mkdir(worksDirectory);
    console.log('A pasta "Works" foi criada.');
  } else {
    console.log('A pasta "Works" não foi criada. Você pode criar manualmente e colocar seus projetos dentro dela.');
  }
}
async function promptForValidDirectory() {
  let localdir;

  for (;;) {
    const localedir = await inquirer.prompt([
      {
        type: 'input',
        name: 'originalDirectory',
        message: 'Coloque o diretório da pasta onde se encontra o projeto original:',
      },
    ]);

    const directoryPath = localedir.originalDirectory;

    // // Verifica se o diretório contém espaços em branco
    // if (/\s/.test(directoryPath)) {
    //   console.log('O diretório não pode conter espaços em branco. Tente novamente.');
    // }
    // Verifica se o diretório existe
    // else
     if (fss.existsSync(directoryPath) && fss.lstatSync(directoryPath).isDirectory()) {
      localdir = localedir.originalDirectory;
      break; // Sai do loop quando um diretório válido for fornecido
    } else {
      console.log('Diretório inválido. Tente novamente.');
    }
  }

  return localdir;
}



async function selectAndCreateProject() {
  // Verifique se a pasta 'Works' existe
  try {
    await fs.access(worksDirectory);
  } catch (error) {
    await createWorksFolder();
  }

  // A pasta 'Works' existe, continue com o código original
  const worksFolders = await fs.readdir(worksDirectory);
  const projectChoices = worksFolders.filter(async (file) => {
    const stat = await fs.stat(path.join(worksDirectory, file));
    return stat.isDirectory();
  });

  // Adicione a opção de criar um novo projeto
  projectChoices.push('Criar um novo projeto');
  projectChoices.push('localizar um projeto existente');


  // Pergunte ao usuário qual projeto eles querem criar ou selecionar
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedProject',
      message: 'Selecione o projeto que você deseja criar ou escolher:',
      choices: projectChoices,
    },
  ]);

  const selectedProject = answers.selectedProject;

  if (selectedProject === 'localizar um projeto existente') {

    const pastaOriginal = await promptForValidDirectory()

    // Extrair o nome da última pasta do caminho original
    const pastaNome = path.basename(pastaOriginal);

    const atalho = path.join(`./Works/${pastaNome}`);

    // Use o método fs.symlink para criar o link simbólico
    fs.symlink(pastaOriginal, atalho, 'junction', (err) => {
      if (err) {
        console.error('Erro ao criar o link simbólico:', err);
      } else {
        console.log('Link simbólico criado com sucesso, iniciando worker!');
      }
    });

    // Pergunte ao usuário o tipo de projeto (base ou padrão)
    const projectmodels = await inquirer.prompt([
      {
        type: 'list',
        name: 'projectType',
        message: 'Selecione o oque fazer no projeto:',
        choices: ['desenvolver', 'produção'],
      },
    ]);

    await NodemonStart(projectmodels.projectType, pastaNome);

  } else if (selectedProject === 'Criar um novo projeto') {
    // Pergunte ao usuário o nome do novo projeto
    const newProjectName = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Digite o nome do novo projeto:',
      },
    ]);

    // Pergunte ao usuário o tipo de projeto (base ou padrão)
    const projectType = await inquirer.prompt([
      {
        type: 'list',
        name: 'projectType',
        message: 'Selecione o tipo de projeto:',
        choices: ['Base', 'Padrão'],
      },
    ]);

    // URLs para projetos base e padrão
    const baseProjectURL = 'https://github.com/drylian/Eggs/raw/main/Connect/Open-MP/SampGmBase.zip';
    const standardProjectURL = 'https://github.com/drylian/Eggs/raw/main/Connect/SAMP/server/samp037_svr_R2-1-1_win32.zip';

    const projectURL = projectType.projectType === 'Base' ? baseProjectURL : standardProjectURL;

    // Lógica para criar um novo projeto com o nome, tipo e URL fornecidos
    const newProjectDirectory = path.join(worksDirectory, newProjectName.projectName);

    // Faça o download do arquivo ZIP
    const response = await axios.get(projectURL, { responseType: 'arraybuffer' });

    if (response.status === 200) {
      await fs.mkdir(newProjectDirectory);

      const zipFilePath = path.join(newProjectDirectory, 'project.zip');

      // Salve o arquivo ZIP no sistema de arquivos
      await fs.writeFile(zipFilePath, response.data);

      // Extraia o arquivo ZIP
      await extract(zipFilePath, { dir: path.resolve(newProjectDirectory) });

      // Exclua o arquivo ZIP após a extração
      await fs.unlink(zipFilePath);

      console.log(`O novo projeto "${newProjectName.projectName}" (${projectType.projectType}) foi criado em ${newProjectDirectory}.`);

      // Pergunte ao usuário o tipo de projeto (base ou padrão)
      const projectmodels = await inquirer.prompt([
        {
          type: 'list',
          name: 'projectType',
          message: 'Selecione o oque fazer no projeto:',
          choices: ['desenvolver', 'produção'],
        },
      ]);

      await NodemonStart(projectmodels.projectType, newProjectName.projectName);
    } else {
      console.error('O download do arquivo ZIP falhou.');
    }
  } else {
    console.log(`Você selecionou o projeto "${selectedProject}".`);

    // Pergunte ao usuário o tipo de projeto (base ou padrão)
    const projectType = await inquirer.prompt([
      {
        type: 'list',
        name: 'projectType',
        message: 'Selecione o oque fazer no projeto:',
        choices: ['desenvolver', 'produção'],
      },
    ]);

    await NodemonStart(projectType.projectType, selectedProject);
    // Aqui você pode continuar com a lógica para trabalhar com o projeto selecionado.
  }
}

selectAndCreateProject().catch((error) => {
  console.error('Ocorreu um erro:', error);
});


// Manipule Ctrl+C para finalizar o Nodemon
process.on('SIGINT', () => {
  console.log('Finalizando o WorkBench.');
  process.exit(0);
});
