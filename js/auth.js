// Aguardar DOM e Supabase carregarem
document.addEventListener('DOMContentLoaded', () => {
  
  // Função para verificar se Supabase está pronto
  function waitForSupabase(callback) {
    if (window.supabaseClient) {
      callback();
    } else {
      setTimeout(() => waitForSupabase(callback), 100);
    }
  }

  // Executar quando Supabase estiver pronto
  waitForSupabase(() => {
    const supabase = window.supabaseClient;

    // Elementos do DOM
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');
    const btnAnonymous = document.getElementById('btnAnonymous');
    const messageDiv = document.getElementById('message');

    // Função para trocar de aba
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // Remove active de todos os botões e conteúdos
        tabButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        // Adiciona active no botão e conteúdo clicado
        button.classList.add('active');
        if (tabName === 'login') {
          loginTab.classList.add('active');
        } else {
          registerTab.classList.add('active');
        }
        
        // Limpa mensagens
        hideMessage();
      });
    });

    // Função para mostrar mensagem
    function showMessage(message, type) {
      messageDiv.textContent = message;
      messageDiv.className = `message ${type}`;
      messageDiv.classList.remove('hidden');
    }

    // Função para esconder mensagem
    function hideMessage() {
      messageDiv.classList.add('hidden');
    }

    // LOGIN
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });
        
        if (error) throw error;
        
        showMessage('Login realizado com sucesso!', 'success');
        
        // Redirecionar para o feed após 1 segundo
        setTimeout(() => {
          window.location.href = 'feed.html';
        }, 1000);
        
      } catch (error) {
        showMessage('Erro ao fazer login: ' + error.message, 'error');
      }
    });

    // REGISTRO
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('registerUsername').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const password = document.getElementById('registerPassword').value;
      
      // Validações
      if (username.length < 3) {
        showMessage('Nome de usuário deve ter pelo menos 3 caracteres', 'error');
        return;
      }
      
      if (password.length < 6) {
        showMessage('Senha deve ter pelo menos 6 caracteres', 'error');
        return;
      }
      
      try {
        showMessage('Criando conta...', 'success');

        // Verificar se username já existe
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .single();

        if (existingUser) {
          showMessage('Nome de usuário já está em uso', 'error');
          return;
        }

        // Criar usuário no Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password
        });
        
        if (error) throw error;
        
        // Avatar padrão
        const defaultAvatarUrl = 'images/avatar-default.png';
        
        // Criar perfil do usuário
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              username: username,
              avatar_url: defaultAvatarUrl,
              bio: ''
            }
          ]);
        
        if (profileError) throw profileError;
        
        showMessage('Conta criada com sucesso! Fazendo login...', 'success');
        
        // Limpar formulário
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        
        // FAZER LOGIN AUTOMÁTICO após 1.5 segundos
        setTimeout(async () => {
          try {
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email: email,
              password: password
            });
            
            if (loginError) throw loginError;
            
            // Redirecionar para o feed
            window.location.href = 'feed.html';
            
          } catch (error) {
            // Se der erro no login automático, volta para aba de login
            document.querySelector('.tab-btn[data-tab="login"]').click();
          }
        }, 1500);
        
      } catch (error) {
        showMessage('Erro ao criar conta: ' + error.message, 'error');
      }
    });

    // ===== ENTRAR COMO ANÔNIMO (CRIAR CONTA ÚNICA) =====
    if (btnAnonymous) {
      btnAnonymous.addEventListener('click', async () => {
        try {
          btnAnonymous.disabled = true;
          btnAnonymous.textContent = 'Criando conta anônima...';
          showMessage('Criando conta anônima...', 'success');

          // Gerar ID único para o usuário anônimo
          const randomId = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
          
          const anonymousEmail = `anon_${randomId}@anon.designessence.com`;
          const anonymousPassword = `anon_${randomId}_${Date.now()}`;

          console.log('🎭 Criando conta anônima...');

          // Criar conta anônima
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: anonymousEmail,
            password: anonymousPassword,
            options: {
              data: {
                is_anonymous: true
              }
            }
          });

          if (signUpError) {
            console.error('Erro ao criar conta anônima:', signUpError);
            throw signUpError;
          }

          console.log('✅ Conta anônima criada:', anonymousEmail);

          // Aguardar para garantir que o perfil foi criado pela trigger
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Fazer login automático
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: anonymousEmail,
            password: anonymousPassword
          });

          if (signInError) {
            console.error('Erro ao fazer login:', signInError);
            throw signInError;
          }

          console.log('✅ Login anônimo bem-sucedido');
          
          showMessage('Conta anônima criada! Entrando...', 'success');

          // Redirecionar após 1 segundo
          setTimeout(() => {
            window.location.href = 'feed.html';
          }, 1000);

        } catch (error) {
          console.error('💥 Erro ao criar conta anônima:', error);
          showMessage('Erro ao criar conta anônima: ' + error.message, 'error');
          btnAnonymous.disabled = false;
          btnAnonymous.textContent = 'Entrar como anônimo';
        }
      });
    }

    // Verificar se usuário já está logado
    async function checkIfLoggedIn() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        window.location.href = 'feed.html';
      }
    }

    // Executar verificação ao carregar a página
    checkIfLoggedIn();
  });
});