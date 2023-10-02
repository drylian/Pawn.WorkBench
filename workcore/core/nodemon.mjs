import nodemon from 'nodemon';
import { exec } from 'child_process';

// Diretórios a serem monitorados

export const NodemonStart = async (type, WorkBench) => {
  // Função para executar o comando de compilação quando as pastas são editadas

  const compileOnChange = () => {
        const buildFile = './workcore/core/compiler.js';
    const command = `node ${buildFile} -w Works/${WorkBench}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro durante a execução do comando: ${error}`);
        return;
      }

      if (stderr) {
        console.error(`Erro padrão: ${stderr}`);
      }

      console.log(stdout);

      if (stdout.includes('Compilação concluída com sucesso.')) {
        console.log('Compilação concluída com sucesso.');
      } else {
        console.error('Erro durante a compilação.');
      }
    });
  };

  if (type == "desenvolver") {
    const buildFile = './workcore/core/compiler.js';

    // Inicie o Nodemon para monitorar as pastas
    nodemon({
      script: buildFile,
      ext: 'inc,pwn',
      args: ['-w', `${WorkBench}`], // Passar argumentos aqui
      watch: [`./Works/${WorkBench}/*`],
      ignore: ['node_modules'], // Pastas a serem ignoradas
      verbose: true, // Exibir informações detalhadas
      delay: 1000, // Tempo de atraso para evitar compilação duplicada
    });

    // Ouça o evento 'restart' do Nodemon e execute a compilação
    nodemon.on('restart', () => {
      console.log('Arquivos alterados. Reiniciando compilação...');
      compileOnChange();
    });
  } else {
    const buildFile = './workcore/core/build.js';
    const command = `node ${buildFile} -w ${WorkBench}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro durante a execução do comando: ${error}`);
        return;
      }

      if (stderr) {
        console.error(`Erro padrão: ${stderr}`);
      }

      console.log(stdout);

      if (stdout.includes('Compilação concluída com sucesso.')) {
        console.log('Compilação concluída com sucesso.');
      } else {
        console.error('Erro durante a compilação.');
      }
    });
  }
}
