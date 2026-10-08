#!/bin/bash
# Script para empacotar o projeto TermoControl HMI/SCADA, ignorando arquivos sensíveis e de build

echo "Empacotando projeto TermoControl..."

ZIP_NAME="termocontrol_hmi_scada_$(date +%Y%m%d).zip"

# Cria um zip ignorando arquivos baseados nas regras estritas (N16)
zip -r "$ZIP_NAME" . \
  -x "*/node_modules/*" \
  -x "*/dist/*" \
  -x "*/dist-ssr/*" \
  -x "*/.env" \
  -x "*/.env.local" \
  -x "*/.env.development" \
  -x "*/.env.production" \
  -x "*/data/*" \
  -x "*/server/data/*" \
  -x "*/firmware/.pio/*" \
  -x "*.db" \
  -x "*.db-shm" \
  -x "*.db-wal" \
  -x "*.bak" \
  -x ".git/*" \
  -x "*/.vscode/*" \
  -x "*/.idea/*" \
  -x "$ZIP_NAME"

echo "Pacote criado: $ZIP_NAME"
