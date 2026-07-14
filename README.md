# Rota di Buteco 2026

PWA social para acompanhar a jornada no Comida di Buteco BH 2026 — evento gastronômico anual com 128 bares participantes em Belo Horizonte. O app ficou ativo durante todo o evento (12/04 a 10/05) e foi usado por um grupo de amigos com ranking competitivo em tempo real.

> Status: encerrado. Dados preservados no Firebase.

---

## Sumário

- [Stack e por quê](#stack-e-por-quê)
- [Como as peças se encaixam](#como-as-peças-se-encaixam)
- [As funcionalidades, uma por uma](#as-funcionalidades-uma-por-uma)
- [Segurança](#segurança)
- [Banco de dados — coleções do Firestore](#banco-de-dados--coleções-do-firestore)
- [Emblemas](#emblemas)
- [Estrutura de arquivos](#estrutura-de-arquivos)
- [Como rodar localmente](#como-rodar-localmente)

---

## Stack e por quê

| Camada | O que usa |
|---|---|
| Auth | Firebase Authentication (email/senha) |
| Banco | Cloud Firestore (tempo real) |
| Arquivos | Firebase Storage (fotos de visita) |
| Hosting | Firebase Hosting |
| Mapa | Leaflet.js 1.9.4 |
| Fonte | Bebas Neue + Nunito (Google Fonts) |
| Offline | Service Worker (PWA) |

Não tem framework de frontend. É HTML/CSS/JS puro servido estaticamente pelo Firebase Hosting. A escolha foi pragmática: o projeto precisava sair rápido, ser instalável no celular e funcionar bem para um grupo pequeno de usuários. Adicionar React ou Vue teria sido overhead sem benefício claro para essa escala.

O Firebase veio pelo tempo real no ranking e no feed. A cada check-in, todo mundo que está com o app aberto vê o movimento aparecer sem precisar recarregar a página — isso foi central para a dinâmica competitiva do evento.

---

## Como as peças se encaixam

```
Navegador (PWA instalável)
   │
   ├─ Service Worker: guarda o shell do app em cache,
   │  chamadas ao Firebase passam direto
   │
   ▼
Firebase Authentication
   │ usuário autenticado
   ▼
Cloud Firestore (leitura em tempo real via listeners)
   │
   ├─ Ranking: atualizado a cada check-in de qualquer usuário
   ├─ Feed: array de até 200 eventos no documento ranking/feed
   └─ Visitas: subcoleção por usuário, com foto no Storage
```

O dado viaja em duas direções. Para leitura, o app usa listeners do Firestore (`onSnapshot`) que mantêm ranking e feed sincronizados em tempo real sem polling. Para escrita, cada ação do usuário (check-in, nota, registro de km e gasto) grava diretamente nas coleções relevantes, e os listeners de todos os outros usuários recebem a atualização automaticamente.

---

## As funcionalidades, uma por uma

### Bares
Lista com os 128 bares do evento, organizados por região de BH (Sul, Centro, Leste, Nordeste, Noroeste, Norte, Oeste). Tem filtro por região, busca por nome/prato/endereço, ordenação por nota média do grupo e integração com Google Maps para navegação. É possível também registrar bares extras fora do roteiro oficial.

### Visitas (check-in)
O núcleo do app. Cada visita exige foto tirada na hora pela câmera — galeria bloqueada por design, para evitar trapaça no ranking. Junto com a foto, o usuário registra nota de 1 a 10, km percorridos, valor gasto e um comentário que aparece no feed. É permitido múltiplas visitas no mesmo bar, com histórico separado para cada.

### Ranking
Nove categorias calculadas em tempo real:

| Categoria | Critério |
|---|---|
| 🏆 Visitados | Quem foi em mais bares |
| ⭐ Nota Média | Melhores avaliações |
| 🚗 Km | Quem mais rodou |
| 🧭 Explorador | Mais regiões visitadas |
| 🎯 Fiel | % dos bares visitados |
| 🔍 Exigente | Crítico mais severo |
| 💰 Gastão | Maior gasto nos bares |
| ⏰ Madrugador | Primeiro a registrar cada bar |
| 🗺️ Regiões | Quem completou mais regiões inteiras |

### Feed Social
Feed de atividades em tempo real com reações por emoji (🍺 🔥 😍 🤢), fotos das visitas dos amigos, e filtro entre feed global e feed do grupo. Quando alguém do seu grupo visita um bar, uma notificação aparece.

### Grupos
Criar e entrar em grupos por código de 6 caracteres. O grupo tem ranking próprio separado do global, feed filtrado só para membros, e roteiro colaborativo onde qualquer um pode sugerir um bar — a sugestão vai para aprovação do organizador antes de entrar no roteiro.

### Mapa
Lista de bares ordenada por distância usando GPS, com mapa interativo via Leaflet/OpenStreetMap. Pins verdes para bares já visitados, laranja para os que ainda não foram.

### Amstel
Ranking separado de consumo de Amstel nos bares participantes. O usuário envia foto da comanda para aprovação pelo admin antes de o registro ser contabilizado. Havia um prêmio misterioso para quem bebesse mais.

### Perfil
Avatar (emoji ou foto), estatísticas completas (bares, nota média, km, gasto), mapa de progresso por região de BH, galeria de fotos das visitas e 14 emblemas para colecionar.

### Admin
Painel para invalidar visitas suspeitas, arquivar denúncias, banir usuários, aprovar registros de Amstel pendentes e resetar ranking individual.

---

## Segurança

As chaves do Firebase **não ficam no repositório**. O arquivo `js/firebase.js` commitado contém apenas placeholders. Para rodar localmente:

```bash
cp .env.example .env.local
# preencha .env.local com as chaves reais do Console Firebase
```

As variáveis necessárias:

```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
```

Vale a nota padrão do Firebase: a `apiKey` identifica o projeto mas não dá acesso sem autenticação válida. Com as regras do Firestore configuradas corretamente, expor a chave é de baixo risco. Ainda assim, a boa prática é mantê-la fora do controle de versão.

---

## Banco de dados — coleções do Firestore

| Coleção | O que guarda |
|---|---|
| `users/{uid}` | Perfil: nome, avatar, grupos, contato |
| `users/{uid}/visits/{barId}` | Check-ins com nota, foto, km, valor gasto |
| `users/{uid}/extras` | Bares fora do roteiro oficial |
| `ranking/{uid}` | Cache do ranking: totalVisitas, media, km, etc |
| `ranking/feed` | Feed global — array dos últimos 200 eventos |
| `grupos/{codigo}` | Grupos: membros, roteiro, sugestões |
| `amstel/ranking` | Ranking de consumo de Amstel |
| `amstel/registros/pendentes` | Fotos aguardando aprovação do admin |
| `amstel/registros/aprovados` | Registros aprovados e contabilizados |
| `comentarios/{barId}/posts` | Avaliações por bar |
| `comentarios/resumo` | Cache resumido de avaliações para leitura rápida |
| `descricoes/{barId}` | Descrições dos pratos enviadas pelos usuários |
| `denuncias` | Denúncias de conteúdo para revisão do admin |

O documento `ranking/feed` merece uma nota: ele guarda até 200 eventos num único array e aceita escrita de qualquer usuário logado, que é o que permite o feed colaborativo funcionar sem uma Cloud Function no meio. O lado ruim é que um usuário pode, tecnicamente, sobrescrever eventos de outros no array. Para a escala do evento (grupo de amigos) isso nunca foi um problema, mas num projeto com volume maior o certo seria mover a escrita do feed para uma Cloud Function que valida antes de persistir.

---

## Emblemas

### Por quantidade de visitas

| Emblema | Requisito |
|---|---|
| 🍺 Primeiro Gole | 1 bar |
| 🌟 Butequeador | 5 bares |
| 🏅 Veterano | 10 bares |
| 🥇 Mestre dos Botecos | 20 bares |
| 👑 Lenda Viva | 40 bares |
| 🐐 O GOAT | 80 bares |

### Por região completa
Um emblema para cada uma das 7 regiões de BH (Sul, Centro, Leste, Nordeste, Noroeste, Norte, Oeste), mais um emblema especial por completar todas as sete.

---

## Estrutura de arquivos

```
comida-de-buteco/
├── index/
│   └── landpage.html       # HTML principal — estrutura e imports
├── css/
│   ├── base.css            # Variáveis CSS, reset, layout global
│   ├── components.css      # Cards, botões, badges reutilizáveis
│   ├── login.css           # Tela de login e modais de auth
│   └── pages.css           # Estilos específicos de cada aba
├── js/
│   ├── firebase.js         # Config Firebase (placeholders no repo)
│   ├── data.js             # Dados estáticos: bares, emblemas, configs
│   ├── renders.js          # Estado global, cache, modais, utilitários
│   ├── auth.js             # Login, cadastro, onboarding, tutorial
│   ├── bares.js            # Lista de bares, filtros, busca, avaliação
│   ├── visitas.js          # Check-in, foto, upload Storage, notas
│   ├── ranking.js          # Ranking global/grupo, cache, atualização
│   ├── feed.js             # Feed social, reações, likes, denúncias
│   ├── perfil.js           # Perfil, emblemas, stats, avatar, gastos
│   ├── grupos.js           # Grupos, roteiro colaborativo, sugestões
│   ├── mapa.js             # Leaflet, GPS, mapa de regiões de BH
│   ├── amstel.js           # Ranking Amstel, registro, aprovação
│   ├── login.js            # Reset de senha
│   └── admin.js            # Painel administrativo
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (cache offline)
├── firebase.json           # Configuração de deploy Firebase Hosting
├── firestore.rules         # Regras de segurança do Firestore
├── .env.example            # Template das variáveis de ambiente
└── .gitignore
```

---

## Como rodar localmente

O projeto não precisa de build — é HTML/CSS/JS puro servido estaticamente.

```bash
git clone https://github.com/seu-usuario/rota-di-buteco-2026.git
cd rota-di-buteco-2026

cp .env.example .env.local
# edite .env.local com suas chaves reais do Console Firebase

# qualquer servidor estático funciona:
npx serve .
# ou
python3 -m http.server 8080
```

Acesse `http://localhost:8080/index/landpage.html`.

---

*Feito com 🍺 para o Comida di Buteco BH 2026.*
*Projeto pessoal — uso interno. Não destinado à redistribuição.*
