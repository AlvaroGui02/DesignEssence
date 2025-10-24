// Sistema de Busca
document.addEventListener('DOMContentLoaded', () => {
  
  function waitForSupabase(callback) {
    if (window.supabaseClient) {
      callback();
    } else {
      setTimeout(() => waitForSupabase(callback), 100);
    }
  }

  waitForSupabase(async () => {
    const supabase = window.supabaseClient;
    
    const searchInput = document.getElementById('searchInput');
    
    if (!searchInput) {
      console.log('Search input não encontrado');
      return;
    }

    let searchTimeout;
    let currentUser = null;

    // Obter usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;

    // Criar container de resultados se não existir
    let resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) {
      resultsContainer = document.createElement('div');
      resultsContainer.id = 'searchResults';
      resultsContainer.className = 'search-results hidden';
      searchInput.parentElement.appendChild(resultsContainer);
    }

    // Buscar ao digitar
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();

      clearTimeout(searchTimeout);

      if (query.length < 2) {
        resultsContainer.classList.add('hidden');
        return;
      }

      searchTimeout = setTimeout(async () => {
        await performSearch(query);
      }, 300);
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
        resultsContainer.classList.add('hidden');
      }
    });

    // Focar na busca
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length >= 2 && resultsContainer.innerHTML) {
        resultsContainer.classList.remove('hidden');
      }
    });

    // Função de busca
    async function performSearch(query) {
      try {
        resultsContainer.innerHTML = '<div class="search-loading">Buscando...</div>';
        resultsContainer.classList.remove('hidden');

        // Buscar usuários
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', `%${query}%`)
          .limit(5);

        // Buscar publicações por título
        const { data: publications, error: pubsError } = await supabase
          .from('publications')
          .select(`
            *,
            profiles:user_id (username, avatar_url)
          `)
          .ilike('title', `%${query}%`)
          .limit(5);

        if (usersError) console.error('Erro buscar usuários:', usersError);
        if (pubsError) console.error('Erro buscar publicações:', pubsError);

        // Renderizar resultados
        renderResults(users || [], publications || [], query);

      } catch (error) {
        console.error('Erro na busca:', error);
        resultsContainer.innerHTML = '<div class="search-error">Erro ao buscar</div>';
      }
    }

    // Renderizar resultados
    function renderResults(users, publications, query) {
      if (users.length === 0 && publications.length === 0) {
        resultsContainer.innerHTML = `
          <div class="search-empty">
            Nenhum resultado para "${query}"
          </div>
        `;
        return;
      }

      let html = '';

      // Seção de Usuários
      if (users.length > 0) {
        html += '<div class="search-section-title">Usuários</div>';
        users.forEach(user => {
          html += `
            <a href="profile.html?user=${user.id}" class="search-item user-item">
              <img src="${user.avatar_url || '/images/avatar-default.png'}" alt="${user.username}" class="search-avatar">
              <div class="search-info">
                <div class="search-username">${user.username}</div>
                ${user.bio ? `<div class="search-bio">${user.bio}</div>` : ''}
              </div>
            </a>
          `;
        });
      }

      // Seção de Publicações
      if (publications.length > 0) {
        html += '<div class="search-section-title">Publicações</div>';
        publications.forEach(pub => {
          html += `
            <div class="search-item publication-item" data-post-id="${pub.id}" data-user-id="${pub.user_id}">
              <img src="${pub.image_url}" alt="${pub.title}" class="search-thumbnail">
              <div class="search-info">
                <div class="search-pub-title">${pub.title}</div>
                <div class="search-pub-author">por ${pub.profiles.username}</div>
              </div>
            </div>
          `;
        });
      }

      resultsContainer.innerHTML = html;

      // Event listener para publicações
      const pubItems = resultsContainer.querySelectorAll('.publication-item');
      pubItems.forEach(item => {
        item.addEventListener('click', () => {
          const postId = item.getAttribute('data-post-id');
          const userId = item.getAttribute('data-user-id');
          
          // Fechar resultados de busca
          resultsContainer.classList.add('hidden');
          searchInput.value = '';
          
          // Redirecionar para o perfil com parâmetro do post
          window.location.href = `profile.html?user=${userId}&post=${postId}`;
        });
      });
    }
  });
});