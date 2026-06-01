# EasyResumen — Servidor de licencias

Funciones serverless deployadas en Vercel.

## Endpoints

- `POST /api/webhook/gumroad` — recibe ventas de Gumroad, genera clave, envía email
- `POST /api/license/activate` — activa una clave en un dispositivo
- `GET  /api/license/status`   — verifica estado de una clave
- `POST /api/license/recover`  — reenvía clave al email del comprador

## Setup

1. Copiar `.env.example` a `.env.local` y completar las variables
2. `npm install`
3. `vercel deploy`
