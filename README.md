## Rapid Convert - Conversor de Arquivos Online

### 1. Frontend (HTML / CSS / JS)

- Usuário acessa o site.
- Faz upload do arquivo.
- Seleciona o tipo de conversão (ex: DOCX → PDF, JPG → PNG).
- Clica em "Converter".
- Envia o arquivo e tipo de conversão para a API.

### 2. Backend API (Node.js + Express)

- Recebe o arquivo e dados da conversão:
  - Valida extensão, tamanho e tipo de arquivo.
  - Salva temporariamente o arquivo (em disco ou armazenamento tipo S3).
  - Cria uma tarefa na fila com os dados da conversão (BullMQ + Redis).

### 3. Fila (BullMQ)

- Gerencia a ordem das conversões.
- Evita sobrecarga do servidor.
- Permite escalar os workers no futuro.

### 4. Worker de Conversão (Node.js)

- Recebe a tarefa da fila.
- Executa a conversão usando ferramentas específicas:
  - LibreOffice → para DOCX, PPTX, XLSX, etc.
  - ImageMagick ou Sharp → para imagens.
  - FFmpeg → para vídeos e áudio.
  - Pandoc → para formatos de texto como .md, .html, .pdf.
- Armazena o resultado temporariamente.
- Retorna o status para o backend.

### 5. Backend disponibiliza o link para download

- API responde com um taskId.
- Frontend pode:
  - Usar polling (/status/:taskId)
  - Ou receber uma resposta quando a tarefa terminar (webhook, se precisar)

### 6. Frontend exibe link de download

- Usuário pode baixar o arquivo convertido diretamente.

⚠️ **Cuidados Importantes sem autenticação**
- ✅ Limite de tamanho de arquivos (ex: até 20 MB)
- ✅ Limite de requisições por IP (Rate limiting com express-rate-limit)
- ✅ Fila controlada para evitar overload
- ✅ Remoção automática de arquivos após X minutos (cronjob ou setTimeout)
- ✅ Validação forte no backend contra arquivos maliciosos (ex: .exe, scripts disfarçados)

🛠️ **Stack sugerida**
| Função                  | Tecnologia                           |
|-------------------------|--------------------------------------|
| Frontend                | HTML + JavaScript                    |
| Backend                 | Node.js + Express                    |
| Upload de arquivos      | multer, busboy ou formidable         |
| Conversões              | LibreOffice, Sharp, Pandoc, etc      |
| Fila                    | BullMQ + Redis                       |
| Armazenamento           | Disco local ou S3 (auto delete)      |
