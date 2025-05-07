const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { stdout } = require("process");

const app = express();
const port = 3000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });
//executar limpeza na pasta de uploads
setInterval(() => {
  const uploadDir = path.join(__dirname, "uploads");
  const limiteTempo = 2 * 60 * 60 * 1000; // 2h

  fs.readdir(uploadDir, (err, files) => {
    if (err) return console.error("Erro ao ler a pasta uploads: ", err);

    files.forEach((file) => {
      const filePath = path.join(uploadDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err)
          return console.error("Erro ao obter status dos arquivos ", err);

        const agora = Date.now();
        const modificadoEm = agora - stats.mtimeMs;

        if (modificadoEm > limiteTempo) {
          fs.unlink(filePath, (err) => {
            if (err) console.error("Erro ao deletar arquivos: ", err);
            else console.log("Arquivos deletados: ", file);
          });
        }
      });
    });
  });
}, 30 * 60 * 1000); // roda a cada 30 minutos

app.post("/upload-docx", upload.single("file"), (req, res) => {
  const inPath = path.join(__dirname, req.file.path);
  const outPath = path.join(__dirname, "converted");

  const comando = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe" --headless --convert-to pdf "${inPath}" --outdir "${outPath}"`;

  exec(comando, (erro, stdout, stderr) => {
    if (erro) {
      console.log("Erro na conversao", erro);
      return res.status(500).send("Erro na conversao");
    }

    const pdfName = req.file.filename.replace(/\.docx$/, ".pdf");
    const pdfPath = path.join(outPath, pdfName);

    if (!fs.existsSync(pdfPath)) {
      return res.status(500).send("Conversao falhou");
    }

    res.download(pdfPath, pdfName, (err) => {
      fs.unlinkSync(inPath);
      fs.unlinkSync(pdfPath);
    });
  });
});

// VALIDAR NOVAS OPÇÕES PARA CONVERSÃO DE PDF PARA DOCX POIS O LIBREOFFICE NAO TEM
app.post("/upload-pdf", upload.single("file"), (req, res) => {});

app.get("/docx-to-pdf", (req, res) => {
  res.send(`
        <form action="/upload-docx" method="post" enctype="multipart/form-data">
          <input type="file" name="file" accept=".docx" />
          <button type="submit">Converter para PDF</button>
        </form>
      `);
});

app.get("/pdf-to-docx", (req, res) => {
  res.send(`
          <form action="/upload-pdf" method="post" enctype="multipart/form-data">
            <input type="file" name="file" accept=".pdf" />
            <button type="submit">Converter para DOCX</button>
          </form>
        `);
});
app.listen(port, () => {
  console.log("Servidor rodando na porta ", port);
});
