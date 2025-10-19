const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname)));

// Configurar MIME types corretos
app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.type('application/javascript');
  } else if (req.path.endsWith('.css')) {
    res.type('text/css');
  } else if (req.path.endsWith('.html')) {
    res.type('text/html');
  }
  next();
});

// Rotas específicas para as páginas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/feed.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'feed.html'));
});

app.get('/profile.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get('/settings.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'settings.html'));
});

// Redirecionar todas as outras rotas para index.html (SPA behavior)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor DesignEssence rodando na porta ${PORT}`);
});