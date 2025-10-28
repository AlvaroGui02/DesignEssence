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
        showMessage('Email ou senha errado. Digite corretamente!', 'error');
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

      if (username.length > 38) {
        showMessage('Nome de usuário não pode ter mais de 38 caracteres', 'error');
        return;
      }

      if (password.length < 6) {
        showMessage('Senha deve ter pelo menos 6 caracteres', 'error');
        return;
      }

      try {
        showMessage('Verificando disponibilidade...', 'success');

        // 1. Verificar se username já existe
        const { data: existingUsers, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username);

        if (checkError) {
          console.log('Erro ao verificar username:', checkError);
        }

        if (existingUsers && existingUsers.length > 0) {
          showMessage('Nome de usuário já está em uso', 'error');
          return;
        }

        showMessage('Criando conta...', 'success');

        // 2. Criar usuário no Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password
        });

        if (signUpError) {
          // Verifica se o erro é de email já cadastrado
          if (signUpError.message.includes('already registered') ||
            signUpError.message.includes('User already registered') ||
            signUpError.message.includes('already been registered')) {
            showMessage('Este email já está sendo utilizado em outra conta', 'error');
            return;
          }
          throw signUpError;
        }

        if (!signUpData.user) {
          throw new Error('Erro ao criar usuário');
        }

        const userId = signUpData.user.id;

        // 3. Verificar se o perfil já existe (segurança extra)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();

        // Se o perfil já existe, não tenta criar novamente
        if (existingProfile) {
          showMessage('Conta já existe! Redirecionando para login...', 'success');
          document.getElementById('registerUsername').value = '';
          document.getElementById('registerEmail').value = '';
          document.getElementById('registerPassword').value = '';

          setTimeout(() => {
            document.querySelector('.tab-btn[data-tab="login"]').click();
            showMessage('Faça login com suas credenciais', 'success');
          }, 2000);
          return;
        }

        // 4. Criar perfil do usuário (apenas se não existir)
        const defaultAvatarUrl = 'images/avatar-default.png';

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: userId,
              username: username,
              avatar_url: defaultAvatarUrl,
              bio: ''
            }
          ]);

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
          throw profileError;
        }

        showMessage('Conta criada com sucesso! Você já pode fazer login.', 'success');

        // Limpar formulário
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';

        // Trocar para aba de login após 2 segundos
        setTimeout(() => {
          document.querySelector('.tab-btn[data-tab="login"]').click();
          showMessage('Faça login com suas credenciais', 'success');
        }, 2000);

      } catch (error) {
        console.error('Erro completo:', error);

        // Mensagens de erro mais amigáveis
        let errorMessage = 'Erro ao criar conta: ';

        if (error.message.includes('duplicate key')) {
          errorMessage = 'Esta conta já existe. Tente fazer login.';
          setTimeout(() => {
            document.querySelector('.tab-btn[data-tab="login"]').click();
          }, 2000);
        } else if (error.message.includes('invalid email')) {
          errorMessage = 'Email inválido. Verifique e tente novamente.';
        } else if (error.message.includes('already registered') ||
          error.message.includes('User already registered')) {
          errorMessage = 'Este email já está sendo utilizado em outra conta';
        } else {
          errorMessage += error.message;
        }

        showMessage(errorMessage, 'error');
      }
    });

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