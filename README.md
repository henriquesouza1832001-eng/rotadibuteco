# Trilha BH

O tour gastronômico colaborativo de Belo Horizonte. O usuário cria um perfil, registra visitas a bares e botequins, avalia com nota e comentário, compete em rankings por oito categorias diferentes e forma grupos com amigos. É independente e sem fins lucrativos.

> Versão atual: Pré Beta 1.0. Plataforma: PWA + Android (Capacitor).

---

## Sumário

- [Stack e por quê](#stack-e-por-quê)
- [Como as peças se encaixam](#como-as-peças-se-encaixam)
- [As funcionalidades, uma por uma](#as-funcionalidades-uma-por-uma)
- [Segurança](#segurança)
- [Banco de dados — coleções do Firestore](#banco-de-dados--coleções-do-firestore)
- [Sistema de emblemas](#sistema-de-emblemas)
- [Estrutura de arquivos](#estrutura-de-arquivos)
- [Como rodar localmente](#como-rodar-localmente)
- [Build Android](#build-android)
- [Deploy](#deploy)
- [O que ainda não está redondo](#o-que-ainda-não-está-redondo)

---

## Stack e por quê

| Camada | O que usa |
|---|---|
| Auth | Firebase Authentication (email/senha) |
| Banco | Cloud Firestore (tempo real) |
| Arquivos | Firebase Storage (fotos de visita e avatar) |
| Hosting | Firebase Hosting |
| Mapa | Leaflet.js + OpenStreetMap |
| Android | Capacitor |
| Offline | Service Worker (PWA) |

Sem framework de frontend. Cada tela é HTML/CSS/JS puro, servido estaticamente. Isso mantém o projeto inteiro gerenciável por uma pessoa só, sem etapa de build, sem toolchain para aprender. O custo é a ausência de reatividade automática de UI: cada tela cuida manualmente de re-renderizar o que mudou depois de uma ação do usuário.

O Capacitor entrou para gerar a versão Android sem reescrever o app. O PWA já era instalável, mas a Play Store exige um APK — o Capacitor empacota o mesmo HTML/JS numa webview nativa sem precisar reescrever nada.

---

## Como as peças se encaixam

```
Navegador (PWA) / App Android (Capacitor + WebView)
   │
   ├─ Service Worker: shell do app em cache local,
   │  chamadas ao Firebase passam sem interceptação
   │
   ▼
Firebase Authentication
   │ usuário autenticado (ou anônimo com dados no localStorage)
   ▼
Cloud Firestore (listeners em tempo real)
   │
   ├─ Descobrir: lista de estabelecimentos com filtros
   ├─ Ranking: cache em ranking/{uid}, recalculado a cada visita
   ├─ Feed: array de até 200 eventos em ranking/feed
   ├─ Grupos: ranking e feed filtrados por membros
   └─ XP: pontuação por período em xp/{uid}
```

Leitura usa `onSnapshot` em tempo real onde faz sentido (feed, ranking do grupo) e fetch pontual onde a sincronia em tempo real não agrega nada (lista de bares, perfil próprio). Escrita vai direto para o Firestore, sem backend intermediário.

---

## As funcionalidades, uma por uma

### Descobrir
Tela principal. Lista todos os bares com filtros por região (Sul, Centro, Leste, Nordeste, Noroeste, Norte, Oeste), tipo (bar, cervejaria, sinuca) e vibes (samba, rock, pet friendly, LGBTQ+, acessível e outros 20 filtros). Busca por texto no nome, endereço ou qualquer característica do bar. Barra de progresso mostra o percentual da trilha concluída.

### Mapa
Bares ordenados por distância via geolocalização, com mapa Leaflet/OpenStreetMap. Pins verdes para visitados, laranja para não visitados. Mostra também quais membros do grupo já foram em cada bar, o que ajuda a decidir o roteiro do dia.

### Feed
Feed de atividades colaborativo com visitas, avaliações, fotos e emblemas conquistados por todos os usuários. Filtro entre feed global e feed do grupo. Suporta reações por emoji, comentários nas postagens e denúncia de conteúdo para moderação.

### Roteiros
Organiza uma rota de bares para o dia com o grupo: mapa interativo com a ordem dos bares, botão para abrir no Google Maps, barra de progresso coletivo e sistema de sugestões com aprovação pelo organizador antes de entrar no roteiro oficial do grupo.

### Ranking
Oito categorias de ranking em tempo real:

| Categoria | Critério |
|---|---|
| 🏆 Mais visitados | Quantidade de bares diferentes |
| ⭐ Nota média | Média das avaliações dadas |
| 🚗 Km rodados | Distância percorrida registrada |
| 🧭 Mais regiões | Número de regiões distintas visitadas |
| 🎯 % da trilha | Percentual dos bares cobertos |
| 🔍 Crítico | Quem deu as notas mais baixas (o mais exigente) |
| 💰 Maior gasto | Total gasto registrado nos bares |
| 🗺️ Dominadores | Quem completou mais regiões inteiras |

Vista global ou restrita ao grupo. Compartilhamento via WhatsApp. Pódio animado no topo. Ranking temporal (mês, ano, hall da fama) com sistema de XP acumulado.

### Perfil
Estatísticas pessoais (bares, nota média, km, gasto total, dias ativos), mapa de regiões de BH com progresso visual, emblemas conquistados, histórico de visitas com fotos, avatar editável (emoji ou foto), gerenciamento de grupo e botão para sugerir um bar que ainda não está cadastrado.

### Grupos
O usuário cria ou entra num grupo por código. O grupo tem ranking próprio, feed filtrado, progresso coletivo por região e sistema de desafios com prazo e placar entre membros.

### Trilhas temáticas
Agrupamentos curados de bares por tema — cervejaria, sinuca, Comida di Buteco e outros. Cada trilha tem progresso individual e um emblema desbloqueado ao completar todos os bares dela.

### Sistema de emblemas
18 emblemas no total. 10 desbloqueados por quantidade de bares visitados (de 1 a 1000) e 8 por completar todas as regiões. Cada conquista gera uma notificação com animação de confete e opção de compartilhar.

### Modo anônimo
O app funciona sem cadastro. Dados ficam só no `localStorage`. Depois de 5 minutos de uso, aparece um modal incentivando o cadastro para não perder o progresso.

### Reporte de problemas
Botão em cada bar para reportar horário errado, endereço incorreto, bar fechado, duplicado ou qualquer outro problema. O reporte vai para a coleção `reportes` no Firestore e fica pendente para revisão pelo admin.

### Admin
Painel restrito por UID na coleção `admins`. Gerencia estabelecimentos, aprova sugestões da comunidade, modera comentários e gerencia usuários (banir, reativar).

---

## Segurança

### O que está implementado no código

- `sanitizeHtml()` em `utils.js` — escapa HTML antes de qualquer saída no DOM, bloqueando XSS na raiz.
- `filtrarTexto()` em `utils.js` — filtra palavras proibidas em comentários e descrições antes de salvar no Firestore.
- Verificação de `banido: true` no `users/{uid}` dentro do `onAuthStateChanged`, antes de liberar qualquer acesso.
- Admin verificado por documento na coleção `admins` separada — não por campo no perfil do usuário, o que evitaria que alguém editasse o próprio campo e escalasse privilégio.
- Moderador verificado pelo campo `role` no documento do usuário, com permissões separadas do admin.
- Fotos validadas por tipo (`jpeg`, `png`, `webp`) e tamanho (máx. 10 MB) antes do upload.
- URL de foto verificada contra o domínio `firebasestorage.googleapis.com` antes de exibir, para evitar hotlink de qualquer URL arbitrária.

### Regras do Firestore — resumo das decisões

- Leitura global liberada para qualquer usuário autenticado.
- `users`, `visits`, `extras`, `historico` e `xp` — escrita restrita ao próprio UID.
- `ranking/{doc}` — escrita permitida apenas para o próprio UID, exceto o documento `feed`, que aceita qualquer usuário logado (necessário para o feed colaborativo funcionar).
- `estabelecimentos` — escrita bloqueada para usuários comuns; apenas admin (verificado via `get()` na coleção `admins`) pode escrever.
- `grupos` — qualquer usuário logado cria um grupo novo; edição restrita a membros do grupo.
- `analytics/anonimos/registros` — somente `create`, sem `update` ou `delete`, para evitar manipulação de dados de acesso.
- `admins` — escrita bloqueada pelo client; somente leitura do próprio UID.

Para aplicar as regras:

```bash
firebase deploy --only firestore:rules
```

### Regras do Firebase Storage

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{uid}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.uid == uid
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    match /visitas/{uid}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.uid == uid
                   && request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

### Restrição da API Key

No Console GCP → APIs & Services → Credentials → selecione a chave → Application restrictions → HTTP referrers → adicione `trilhabh.web.app` e `trilhabh.firebaseapp.com`. A `apiKey` é pública por design do Firebase, mas restringir domínios evita uso fora do app.

---

## Banco de dados — coleções do Firestore

| Coleção | O que guarda |
|---|---|
| `users/{uid}` | Perfil: nome, avatar, km, favoritos |
| `users/{uid}/visits/{barId}` | Visitas: nota, comentário, foto, timestamp |
| `users/{uid}/extras` | Re-visitas com nova nota |
| `estabelecimentos` | Base dos bares (fonte principal, `aprovado == true`) |
| `ranking/{uid}` | Cache de stats para o ranking global |
| `ranking/feed` | Feed global — array de até 200 eventos |
| `comentarios/{barId}/posts` | Comentários por bar |
| `comentarios/resumo` | Cache dos últimos comentários por bar |
| `descricoes/{barId}` | Descrição colaborativa de cada bar |
| `grupos/{grupoId}` | Dados do grupo: membros, nome, código |
| `grupos/{grupoId}/desafios` | Desafios ativos do grupo |
| `xp/{uid}` | XP do usuário por período: mês, ano, total |
| `admins/{uid}` | UIDs com acesso ao painel admin |
| `reportes` | Reportes de problema enviados pelos usuários |
| `analytics/anonimos` | Acessos anônimos — 1 por hora por device |
| `analytics/usuarios/acessos/{uid}` | Contagem de acessos de usuários logados |

A mesma nota do documento `ranking/feed` que vale aqui: ele guarda até 200 eventos num único array e aceita escrita de qualquer usuário logado. Funciona bem para volume pequeno; se o app escalar, o correto é mover a escrita para uma Cloud Function que valida o conteúdo antes de persistir.

---

## Sistema de emblemas

### Por quantidade de visitas

| Emblema | Requisito |
|---|---|
| 🍺 Primeiro Gole | 1 bar |
| 🌟 Butequeador | 5 bares |
| 🏅 Veterano | 10 bares |
| 🥇 Mestre dos Botecos | 20 bares |
| 👑 Lenda Viva | 40 bares |
| 🐐 O GOAT | 80 bares |
| *(+ 4 níveis)* | até 1000 bares |

### Por região completa
Um emblema para cada uma das 7 regiões de BH ao completar todos os bares dela, mais um emblema especial por completar as sete regiões.

---

## Estrutura de arquivos

```
trilhaBH/
├── www/
│   ├── css/
│   │   └── app.css
│   ├── images/
│   │   ├── logo.png
│   │   ├── fundo-claro.png
│   │   ├── fundo-escuro.png
│   │   └── header.png
│   └── js/
│       ├── config.js           # Constantes globais, TTLs, emblemas, rankings, VIBES, init Firebase
│       ├── auth.js             # Login, cadastro, modo anônimo, reset, onAuthStateChanged, tutorial
│       ├── app.js              # Lógica central: visitas, stats, ranking, feed, grupos, desafios
│       ├── descobrir.js        # Tela Descobrir: listagem, filtros, busca, avaliação inline
│       ├── avaliacao.js        # Bottom sheet de avaliação, favoritos, marcar visita
│       ├── mapa.js             # Mapa Leaflet, geolocalização, lista por distância
│       ├── feed.js             # Feed, reações, comentários, fotos
│       ├── perfil.js           # Perfil, avatar, grupos, sugestão de bar
│       ├── roteiro.js          # Roteiros do grupo, mapa de rota, sugestões
│       ├── ranking_temporal.js # Ranking por mês/ano/hall com XP
│       ├── trilhas.js          # Trilhas temáticas, carrossel, progresso
│       ├── nav.js              # Navegação entre abas, animações, perfil público
│       ├── admin.js            # Painel admin
│       ├── eventos.js          # Eventos e desafios do grupo
│       ├── splash.js           # Animação de carregamento
│       ├── utils.js            # sanitizeHtml, filtrarTexto, cache, notif, emblemas, upload
│       ├── verificacao.js      # Reporte de problemas em bares
│       ├── data.js             # Base estática de estabelecimentos (fallback offline)
│       └── bares_grid.json     # Metadados de layout dos cards
├── android/                    # Projeto Android gerado pelo Capacitor
├── index.html                  # Entry point
├── manifest.json               # Manifesto PWA
├── sw.js                       # Service Worker (cache offline, auto-update)
├── firebase.json               # Firebase Hosting
├── capacitor.config.json       # Configuração Capacitor/Android
├── atualizar_tipos.js          # Script para atualizar o campo `tipo` no data.js em lote
└── package.json
```

---

## Como rodar localmente

**Pré-requisitos:** Node.js v18+ e Firebase CLI (`npm install -g firebase-tools`).

```bash
git clone https://github.com/henriquesouza1832001-eng/trilhaBH.git
cd trilhaBH

npm install

# copie o template e preencha com as credenciais do seu projeto Firebase
cp www/js/config.example.js www/js/config.js

# servidor local recomendado:
firebase serve
# ou alternativa simples:
npx serve www
```

---

## Build Android

```bash
npx cap sync android
npx cap open android   # abre no Android Studio para gerar o APK
```

---

## Deploy

```bash
firebase login
firebase use --add   # selecione o projeto trilhabh
firebase deploy --only hosting
```

---

## O que ainda não está redondo

- O modo anônimo guarda tudo no `localStorage`, então trocar de dispositivo ou limpar o cache apaga o progresso sem recuperação possível.
- O documento `ranking/feed` ainda não tem validação server-side. Um usuário logado pode, tecnicamente, sobrescrever eventos de outros no array. Para a escala atual isso não é um risco real, mas é uma dívida técnica conhecida.
- A base de estabelecimentos em `data.js` é o fallback offline, mas se o Firestore estiver disponível ela é ignorada. Qualquer atualização na coleção `estabelecimentos` não reflete automaticamente no `data.js` — isso precisa ser feito manualmente com o script `atualizar_tipos.js`.
- Não existe um arquivo de DDL ou seed versionado para as coleções do Firestore. Subir o app num projeto Firebase zerado exige recriar a estrutura manualmente.

---

*Projeto independente, sem fins lucrativos.*
*© 2026 Trilha BH. Todos os direitos reservados.*
