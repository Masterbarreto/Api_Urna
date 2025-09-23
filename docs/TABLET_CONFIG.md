# 📱 Configuração do Tablet

## Especificações Recomendadas

- **Tela**: 10" ou maior
- **Resolução**: 1920x1080 mínimo
- **Sistema**: Android 8+ ou iOS 12+
- **Conectividade**: WiFi estável
- **Navegador**: Chrome, Safari ou Firefox

## Configuração do Browser

### Modo Kiosk (Android)

1. Instale **Kiosk Browser Lockdown**
2. Configure URL: `https://sua-urna-tablet.vercel.app`
3. Ative **Full Screen Mode**
4. Desative **Navigation Bar**
5. Configure **Auto Refresh** a cada 30min

### Modo Kiosk (iPad)

1. Ative **Guided Access**:
   - Settings → Accessibility → Guided Access
2. Configure **Triple-Click** no botão Home
3. Abra Safari na URL da urna
4. Triplo-clique para ativar modo restrito

## Configuração da Aplicação

### Variáveis de Ambiente (.env.local)

```env
NEXT_PUBLIC_API_URL=https://sua-api.onrender.com
NEXT_PUBLIC_ELEICAO_ID=uuid-da-eleicao-ativa
NEXT_PUBLIC_URNA_ID=uuid-da-urna
NEXT_PUBLIC_SOCKET_URL=wss://sua-api.onrender.com
```

### Configuração de Rede

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; connect-src 'self' wss://sua-api.onrender.com https://sua-api.onrender.com;",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

## Otimizações de Performance

### Service Worker para Cache

```javascript
// public/sw.js
const CACHE_NAME = 'urna-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/api/candidatos'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

### Preload de Dados

```javascript
// hooks/usePreloadData.js
import { useEffect } from 'react';

export function usePreloadData() {
  useEffect(() => {
    // Pré-carregar candidatos
    fetch('/api/candidatos').then(res => res.json());
    
    // Pré-carregar imagens
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = '/images/candidates/';
    document.head.appendChild(link);
  }, []);
}
```

## Troubleshooting

### Problemas Comuns

1. **Tela não responsiva**
   - Verificar CSS media queries
   - Testar em diferentes orientações

2. **Socket.IO desconectando**
   - Verificar configurações de WiFi
   - Implementar reconnect automático

3. **Performance lenta**
   - Otimizar imagens (WebP)
   - Implementar lazy loading
   - Usar React.memo() em componentes

### Logs de Debug

```javascript
// utils/logger.js
export const logger = {
  info: (message, data) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
  },
  error: (message, error) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
    // Enviar para serviço de monitoramento
  }
};
```