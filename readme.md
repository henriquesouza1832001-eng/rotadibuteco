# 🍺 Rota di Buteco 2026

> App social para acompanhar a jornada no **Comida di Buteco BH 2026** — evento gastronômico anual com mais de 128 bares participantes em Belo Horizonte.

![Firebase](https://img.shields.io/badge/Firebase-9.22-orange?logo=firebase)
![PWA](https://img.shields.io/badge/PWA-Service%20Worker-blue)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-green)
![Status](<https://img.shields.io/badge/status-encerrado%20(2026)-lightgrey>)

---

## 📖 Sobre o projeto

O **Rota di Buteco** foi um PWA (Progressive Web App) usado por um grupo de amigos durante o evento Comida di Buteco BH 2026. Cada usuário criava sua conta, marcava os bares visitados com foto obrigatória tirada na hora, dava notas, registrava km percorridos e gastos — tudo sincronizado em tempo real via Firebase.

O app ficou ativo durante todo o evento e foi usado por múltiplos usuários reais com ranking competitivo entre eles.

---

## ✨ Funcionalidades

### 🗺️ Bares

- Lista com os 128 bares participantes do evento, organizados por região de BH
- Filtro por região (Sul, Centro, Leste, Nordeste, Noroeste, Norte, Oeste)
- Busca por nome do bar, prato ou endereço
- Ordenação por nota média do grupo
- Integração com Google Maps para navegação
- Registro de bares extras fora do roteiro oficial

### ✅ Visitas

- Check-in com **foto obrigatória tirada na hora** (câmera, não galeria)
- Nota de 1 a 10 estrelas
- Registro de km percorridos e valor gasto
- Comentário que aparece no feed
- Histórico de visitas múltiplas no mesmo bar

### 🏆 Ranking

9 categorias de ranking em tempo real:
| Categoria | Critério |
|-----------|----------|
| 🏆 Visitados | Quem foi em mais bares |
| ⭐ Nota Média | Melhores avaliações |
| 🚗 Km | Quem mais rodou |
| 🧭 Explorador | Mais regiões visitadas |
| 🎯 Fiel | % dos bares visitados |
| 🔍 Exigente | Crítico mais severo (nota mínima) |
| 💰 Gastão | Maior gasto nos bares |
| ⏰ Madrugador | Primeiro a registrar cada bar |
| 🗺️ Regiões | Quem completou mais regiões inteiras |

### 📰 Feed Social

- Feed de atividades em tempo real
- Reações com emojis (🍺 🔥 😍 🤢)
- Fotos das visitas dos amigos
- Filtro: feed global ou só do grupo
- Notificação quando um amigo do grupo visita um bar

### 👥 Grupos

- Criar e entrar em grupos por código
- Ranking separado dentro do grupo
- Roteiro colaborativo com sugestões de bares
- Aprovação de sugestões pelo organizador

### 📍 Próximos

- Lista de bares ordenada por distância (GPS)
- Mapa interativo com Leaflet
- Pins coloridos: verde = visitado, laranja = não visitado

### 🍺 Amstel

- Ranking de consumo de Amstel nos bares
- Envio de foto da comanda para aprovação
- Prêmio misterioso para quem beber mais

### 👤 Perfil

- Avatar emoji ou foto
- Stats: bares visitados, nota média, km rodados
- Mapa de regiões de BH com progresso
- Galeria de fotos das visitas
- 14 emblemas para colecionar (por quantidade e por região)
- Controle de gastos totais

### 🛡️ Admin

- Painel para invalidar visitas suspeitas
- Ver e arquivar denúncias
- Banir usuários
- Aprovar registros de Amstel pendentes
- Reset de ranking individual

---

## 🏗️ Estrutura de arquivos

```
comida-de-buteco/
├── index/
│   └── landpage.html       # HTML principal — estrutura + imports
├── css/
│   ├── base.css            # Variáveis CSS, reset, layout global
│   ├── components.css      # Cards, botões, badges reutilizáveis
│   ├── login.css           # Tela de login e modais de auth
│   └── pages.css           # Estilos específicos de cada aba
├── js/
│   ├── firebase.js         # Config Firebase (⚠️ ver seção de segurança)
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
├── icon-192.png
├── icon-512.png
├── .env.example            # Template das variáveis de ambiente
└── .gitignore
```

---

## 🔐 Segurança — chaves do Firebase

As chaves do Firebase **não ficam no repositório**. Veja como configurar:

### Para rodar localmente

1. Copie o arquivo de template:

   ```bash
   cp .env.example .env.local
   ```

2. Preencha `.env.local` com suas chaves reais (obtidas no [Console do Firebase](https://console.firebase.google.com)):

   ```
   FIREBASE_API_KEY=sua_chave_aqui
   FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
   FIREBASE_PROJECT_ID=seu_projeto
   FIREBASE_STORAGE_BUCKET=seu_projeto.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=000000000000
   FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxx
   ```

3. O arquivo `js/firebase.js` no repositório contém **placeholders**. Para uso local, substitua-os pelas chaves reais. Esse arquivo está no `.gitignore` e nunca sobe para o git.

> **Nota:** Para projetos Firebase com regras de segurança configuradas no Firestore, expor a `apiKey` é de baixo risco — ela identifica o projeto mas não dá acesso sem autenticação. Ainda assim, a boa prática é mantê-la fora do controle de versão.

---

## 🚀 Como rodar localmente

O projeto não precisa de build — é HTML/CSS/JS puro servido estaticamente.

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/rota-di-buteco-2026.git
cd rota-di-buteco-2026

# Configure as chaves (veja seção acima)
cp .env.example .env.local
# edite .env.local com suas chaves

# Sirva com qualquer servidor estático, por exemplo:
npx serve .
# ou com Python:
python3 -m http.server 8080
# ou com VS Code Live Server
```

Acesse `http://localhost:8080/index/landpage.html`

---

## 🔥 Coleções do Firestore

| Coleção                      | Descrição                                        |
| ---------------------------- | ------------------------------------------------ |
| `users/{uid}`                | Perfil do usuário: nome, avatar, grupos, contato |
| `users/{uid}/visits/{barId}` | Check-ins individuais com nota, foto, km, valor  |
| `users/{uid}/extras`         | Bares fora do roteiro oficial                    |
| `ranking/{uid}`              | Cache do ranking: totalVisitas, media, km, etc   |
| `ranking/feed`               | Feed global (últimos 200 eventos)                |
| `grupos/{codigo}`            | Grupos: membros, roteiro, sugestões              |
| `amstel/ranking`             | Ranking de consumo de Amstel                     |
| `amstel/registros/pendentes` | Fotos aguardando aprovação do admin              |
| `amstel/registros/aprovados` | Registros aprovados                              |
| `comentarios/{barId}/posts`  | Avaliações por bar                               |
| `comentarios/resumo`         | Cache resumido de avaliações (leitura rápida)    |
| `descricoes/{barId}`         | Descrições dos pratos enviadas pelos usuários    |
| `feed/{uid_barId}`           | Feed estruturado por documento                   |
| `denuncias`                  | Denúncias de conteúdo para revisão do admin      |

---

## 🎖️ Emblemas

### Por quantidade de visitas

| Emblema               | Requisito |
| --------------------- | --------- |
| 🍺 Primeiro Gole      | 1 bar     |
| 🌟 Butequeador        | 5 bares   |
| 🏅 Veterano           | 10 bares  |
| 🥇 Mestre dos Botecos | 20 bares  |
| 👑 Lenda Viva         | 40 bares  |
| 🐐 O GOAT             | 80 bares  |

### Por região completa

Um emblema para cada uma das 7 regiões de BH (Sul, Centro, Leste, Nordeste, Noroeste, Norte, Oeste) + emblema especial por completar todas.

---

## 🛠️ Tecnologias

| Tecnologia       | Uso                             |
| ---------------- | ------------------------------- |
| Firebase Auth    | Autenticação por email/senha    |
| Cloud Firestore  | Banco de dados em tempo real    |
| Firebase Storage | Upload e armazenamento de fotos |
| Firebase Hosting | Deploy do app                   |
| Leaflet.js 1.9.4 | Mapa interativo com GPS         |
| Google Fonts     | Bebas Neue + Nunito             |
| Service Worker   | Cache offline (PWA)             |

---

## 📊 Uso no evento

O app foi utilizado durante o **Comida di Buteco BH 2026** por um grupo de amigos com ranking competitivo. Os dados de uso estão armazenados no Firebase e incluem:

- Número de usuários ativos
- Total de check-ins realizados
- Fotos enviadas
- Distribuição de visitas por bar e região
- Ranking final por categoria

> Uma análise completa dos dados (matriz de usuários × bares) pode ser gerada a partir das coleções do Firestore. Ver `docs/analise-usuarios.md` _(em construção)_.

---

## 📄 Licença

Projeto pessoal — uso interno. Não destinado à redistribuição.

---

_Feito com 🍺 para o Comida di Buteco BH 2026_
