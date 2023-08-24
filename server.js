const express = require('express');
const app = express();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { PDFDocument, rgb } = require('pdf-lib');
const { execSync } = require('child_process');

console.log("estou aqui", express, app, multer, path, fs, csv)
// Configuração do multer para lidar com o upload de arquivos
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Definição dos formatos de imagem suportados
const supportedImageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.tif'];

// Rota inicial para exibir o formulário
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para processar o formulário e gerar o PDF
app.post('/processar', upload.single('csvFile'), function (req, res) {
  const { orderNumber, orderDate, frontColumns, backColumns, columnWidth } = req.body;
  const csvFilePath = req.file.path;
  const outputPath = `impressao_${orderNumber}_${orderDate}.pdf`;

  const frontFiles = [];
  const backFiles = [];

  // Ler o arquivo CSV e extrair os nomes dos arquivos de frente e verso
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      frontFiles.push(row.Frente);
      backFiles.push(row.Verso);
    })
    .on('end', async () => {
      // Iniciar a criação do PDF
      const doc = await PDFDocument.create();
      const pages = doc.getPages();
      const [firstPage] = pages;
      let frontX = 0;
      let backX = 850 - (columnWidth * backColumns) - 0.5;

      // Função para converter uma imagem para o espaço de cor CMYK
      const convertToCMYK = (imagePath) => {
        const outputPath = `${imagePath}.cmyk.tif`;
        execSync(`convert "${imagePath}" -colorspace CMYK "${outputPath}"`);
        return outputPath;
      };

      // Percorrer os arquivos de frente
      for (let i = 0; i < frontFiles.length; i++) {
        const frontFile = frontFiles[i];
        const frontPath = path.join(__dirname, 'PDF', frontFile);
        const fileExt = path.extname(frontFile).toLowerCase();

        if (supportedImageFormats.includes(fileExt)) {
          const cmykImagePath = convertToCMYK(frontPath);
          doc.image(cmykImagePath, frontX, 0, { width: columnWidth, height: 450 });
          fs.unlinkSync(cmykImagePath);
        } else {
          console.error('Arquivo de imagem inválido:', frontFile);
        }

        // Atualizar a posição da próxima coluna de frente
        frontX += columnWidth + 0.5;

        // Quebrar a página se atingir o número máximo de colunas
        if ((i + 1) % frontColumns === 0) {
          doc.addPage();
          frontX = 0;
        }
      }

      // Percorrer os arquivos de verso
      for (let i = 0; i < backFiles.length; i++) {
        const backFile = backFiles[i];
        const backPath = path.join(__dirname, 'PDF', backFile);
        const fileExt = path.extname(backFile).toLowerCase();

        if (supportedImageFormats.includes(fileExt)) {
          const cmykImagePath = convertToCMYK(backPath);
          doc.image(cmykImagePath, backX, 470, { width: columnWidth, height: 450 });
          fs.unlinkSync(cmykImagePath);
        } else {
          console.error('Arquivo de imagem inválido:', backFile);
        }

        // Atualizar a posição da próxima coluna de verso
        backX += columnWidth + 0.5;

        // Quebrar a página se atingir o número máximo de colunas
        if ((i + 1) % backColumns === 0) {
          doc.addPage();
          backX = 850 - (columnWidth * backColumns) - 0.5;
        }
      }

      // Salvar o PDF finalizado no disco
      const pdfBytes = await doc.save();
      fs.writeFileSync(outputPath, pdfBytes);

      // Enviar o PDF como resposta
      res.sendFile(path.join(__dirname, outputPath));
    });
});

// Rota para servir os arquivos estáticos (HTML, CSS, JS)
app.use(express.static(__dirname));

// Iniciar o servidor
app.listen(3000, function () {
  console.log('Servidor iniciado na porta 3000');
});
