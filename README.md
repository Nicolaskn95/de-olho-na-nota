# De Olho na Nota

Aplicação para escanear QR codes de notas fiscais (NFC-e) e extrair automaticamente os produtos via web scraping.

## Estrutura

```
├── deOlhoNaNota-backend/   # API NestJS
├── deOlhoNaNota-web/       # Frontend React + Vite
└── core/                   # Tipos compartilhados
```

## Requisitos

- Node.js 18+
- MongoDB

## Instalação

```bash
# Instalar dependências
npm install
cd deOlhoNaNota-backend && npm install
cd ../deOlhoNaNota-web && npm install
```

## Executando

```bash
# Backend e frontend juntos
npm run dev

# Ou separadamente
npm run dev:backend
npm run dev:frontend
```

## Funcionalidades

- Escanear QR code via câmera
- Upload de imagem do QR code
- Inserção manual de URL
- Web scraping da nota fiscal (SEFAZ SP, RS, SC)
- Extração automática de produtos
- Persistência em MongoDB
