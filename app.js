require("dotenv").config();
const pythonPath = process.env.PYTHON_PATH;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath("C:/ProgramData/chocolatey/bin/ffmpeg.exe");
const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { PythonShell } = require("python-shell");
const sharp = require("sharp");

const app = express();
const port = 3000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

setInterval(() => {
  const uploadDir = path.join(__dirname, "uploads");
  const limiteTempo = 2 * 60 * 60 * 1000;

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
}, 30 * 60 * 1000);

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

app.post("/upload-pdf", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("Arquivo não importado");
  }

  const inputPath = path.join(__dirname, req.file.path);
  const outputPath = inputPath.replace(".pdf", ".docx");

  python_path = "";
  const pyshell = new PythonShell("./scripts/convert-pdf-to-docx.py", {
    mode: "text",
    pythonPath: pythonPath,
    scriptPath: __dirname,
    args: [req.file.path],
  });

  pyshell.on("message", (message) => {
    console.log("[Python]", message);
  });

  pyshell.end((err) => {
    if (err) {
      console.error("Erro no script Python:", err);
      return res.status(500).send("Erro ao converter o arquivo.");
    }

    fs.access(outputPath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error("Arquivo convertido não encontrado:", err);
        return res.status(500).send("Arquivo convertido não encontrado.");
      }

      const docxName = req.file.filename.replace(/\.pdf$/, ".docx");
      res.download(outputPath, docxName, (err) => {
        if (err) {
          console.error("Erro ao enviar o arquivo:", err);
        }

        fs.unlink(inputPath, () => {});
        fs.unlink(outputPath, () => {});
      });
    });
  });
});

app.post("/upload-jpg", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("Arquivo JPG não envviado");
  }

  const inputPath = path.join(__dirname, req.file.path);
  const outputDir = path.join(__dirname, "converted");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const fileNameWithoutExt = path.parse(req.file.filename).name;
  const outputPath = path.join(
    outputDir,
    `${Date.now()}-${fileNameWithoutExt}.png`
  );

  try {
    await sharp(inputPath).png().toFile(outputPath);

    res.download(outputPath, `${fileNameWithoutExt}.png`, (err) => {
      fs.unlink(inputPath, () => {});
      fs.unlink(outputPath, () => {});
    });
  } catch (error) {
    console.log("Erro na conversao JPG -> PNG");
    res.status(500).send("Erro ao converter JPG");
  }
});

app.post("/upload-mp4", upload.single("file"), async (req, res) => {
  const inputPath = path.resolve(__dirname, "uploads", req.file.filename);
  const outputPath = path.join(__dirname, "converted");

  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
  }

  const outputFile = path.join(
    outputPath,
    req.file.filename.replace(/\.mp4$/, ".mp3")
  );

  if (!fs.existsSync(inputPath)) {
    fs.mkdirSync(inputPath);
  }

  ffmpeg(inputPath)
    .audioCodec("libmp3lame")
    .format("mp3")
    .on("start", (cmdLine) => {
      console.log("[FFmpeg iniciado] Comando:", cmdLine);
    })
    .on("end", () => {
      res.download(outputFile, (err) => {
        fs.unlink(inputPath);
        fs.unlink(outputFile);
      });
    })
    .on("error", (err) => {
      console.error("Erro ao converter MP4 para MP3:", err.message || err);
      res.status(500).send("Erro ao converter codex de audio");
    })
    .save(outputFile);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./views/index.html"));
});

app.get("/docx-to-pdf", (req, res) => {
  res.sendFile(path.join(__dirname, "./views/docx-to-pdf.html"));
});

app.get("/pdf-to-docx", (req, res) => {
  res.sendFile(path.join(__dirname, "./views/pdf-to-docx.html"));
});

app.get("/jpg-to-png", (req, res) => {
  res.sendFile(path.join(__dirname, "./views/jpg-to-png.html"));
});

app.get("/mp4-to-mp3", (req, res) => {
  res.sendFile(path.join(__dirname, "./views/mp4-to-mp3.html"));
});

app.listen(port, () => {
  console.log("Servidor rodando na porta ", port);
});
