import sys
import os
from pdf2docx import Converter

# Caminho do PDF passado via argumento
pdf_path = sys.argv[1]

# Gera o caminho de saída com extensão .docx
output_path = os.path.splitext(pdf_path)[0] + '.docx'

# Converte
converter = Converter(pdf_path)
converter.convert(output_path)
converter.close()  # <- Corrigido aqui

print('Conversion Complete')
