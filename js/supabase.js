// Aguardar o script do Supabase carregar completamente
(function() {
  // Configuração do Supabase
  const SUPABASE_URL = 'https://xbunehdfswfnfasmsjuw.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhidW5laGRmc3dmbmZhc21zanV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwODc4MjEsImV4cCI6MjA3NDY2MzgyMX0.IESzfwmxOvw_Z_6t-aQOlUDTkHmAOYgx3_pOwmlmCtc';

  // Esperar o Supabase estar disponível
  function initSupabase() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      // Criar cliente Supabase
      window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log('✅ Supabase inicializado com sucesso!');
    } else {
      // Tentar novamente após 100ms
      setTimeout(initSupabase, 100);
    }
  }

  // Iniciar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
  } else {
    initSupabase();
  }
})();

// Função para verificar se usuário está logado
async function getCurrentUser() {
  const { data: { user } } = await window.supabaseClient.auth.getUser();
  return user;
}

// Função para verificar se é usuário anônimo
function isAnonymousUser() {
  return localStorage.getItem('anonymous_user') === 'true';
}

// Função para gerar ID de usuário anônimo
function getAnonymousUserId() {
  let anonymousId = localStorage.getItem('anonymous_user_id');
  if (!anonymousId) {
    anonymousId = 'anon_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('anonymous_user_id', anonymousId);
  }
  return anonymousId;
}