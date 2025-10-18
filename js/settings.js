// Aguardar Supabase carregar
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

    // Elementos
    const userAvatar = document.getElementById('userAvatar');
    const userEmail = document.getElementById('userEmail');
    const userName = document.getElementById('userName');
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.settings-section');
    const settingsMessage = document.getElementById('settingsMessage');

    let currentUser = null;

    // Verificar autenticação
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        window.location.href = 'index.html';
        return;
      }

      currentUser = user;
      loadUserInfo();
    }

    // Carregar informações do usuário
    async function loadUserInfo() {
      try {
        // Buscar perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profile) {
          userAvatar.src = profile.avatar_url;
          userName.textContent = '@' + profile.username;
        }

        // Mostrar e-mail
        userEmail.textContent = currentUser.email;
        document.getElementById('currentEmail').value = currentUser.email;

      } catch (error) {
        console.error('Erro ao carregar informações:', error);
      }
    }

    // Dropdown Menu
    const dropdownMenu = document.getElementById('dropdownMenu');
    const btnLogout = document.getElementById('btnLogout');

    userAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!dropdownMenu.contains(e.target) && e.target !== userAvatar) {
        dropdownMenu.classList.add('hidden');
      }
    });

    btnLogout.addEventListener('click', async () => {
      await supabase.auth.signOut();
      localStorage.clear();
      window.location.href = 'index.html';
    });

    // Navegação entre seções
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const sectionId = item.dataset.section;
        
        // Atualizar navegação ativa
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Mostrar seção correspondente
        sections.forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
      });
    });

    // ===== MODAL DE ALTERAR E-MAIL =====
    const modalChangeEmail = document.getElementById('modalChangeEmail');
    const btnChangeEmail = document.getElementById('btnChangeEmail');
    const closeEmailModal = document.getElementById('closeEmailModal');
    const formChangeEmail = document.getElementById('formChangeEmail');
    const emailMessage = document.getElementById('emailMessage');

    btnChangeEmail.addEventListener('click', () => {
      modalChangeEmail.classList.remove('hidden');
    });

    closeEmailModal.addEventListener('click', () => {
      modalChangeEmail.classList.add('hidden');
      formChangeEmail.reset();
      emailMessage.classList.add('hidden');
    });

    modalChangeEmail.addEventListener('click', (e) => {
      if (e.target === modalChangeEmail) {
        modalChangeEmail.classList.add('hidden');
      }
    });

    formChangeEmail.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newEmail = document.getElementById('newEmail').value;
      const password = document.getElementById('passwordEmail').value;

      try {
        showEmailMessage('Alterando e-mail...', 'success');

        // Verificar senha atual
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: password
        });

        if (signInError) {
          showEmailMessage('Senha incorreta!', 'error');
          return;
        }

        // Atualizar e-mail
        const { error: updateError } = await supabase.auth.updateUser({
          email: newEmail
        });

        if (updateError) throw updateError;

        showEmailMessage('E-mail atualizado! Verifique sua caixa de entrada.', 'success');
        
        setTimeout(() => {
          modalChangeEmail.classList.add('hidden');
          formChangeEmail.reset();
          userEmail.textContent = newEmail;
        }, 2000);

      } catch (error) {
        console.error('Erro ao alterar e-mail:', error);
        showEmailMessage('Erro: ' + error.message, 'error');
      }
    });

    function showEmailMessage(message, type) {
      emailMessage.textContent = message;
      emailMessage.className = `message ${type}`;
      emailMessage.classList.remove('hidden');
    }

    // ===== MODAL DE ALTERAR SENHA =====
    const modalChangePassword = document.getElementById('modalChangePassword');
    const btnChangePassword = document.getElementById('btnChangePassword');
    const closePasswordModal = document.getElementById('closePasswordModal');
    const formChangePassword = document.getElementById('formChangePassword');
    const passwordMessage = document.getElementById('passwordMessage');

    btnChangePassword.addEventListener('click', () => {
      modalChangePassword.classList.remove('hidden');
    });

    closePasswordModal.addEventListener('click', () => {
      modalChangePassword.classList.add('hidden');
      formChangePassword.reset();
      passwordMessage.classList.add('hidden');
    });

    modalChangePassword.addEventListener('click', (e) => {
      if (e.target === modalChangePassword) {
        modalChangePassword.classList.add('hidden');
      }
    });

    formChangePassword.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (newPassword !== confirmPassword) {
        showPasswordMessage('As senhas não coincidem!', 'error');
        return;
      }

      if (newPassword.length < 6) {
        showPasswordMessage('A senha deve ter pelo menos 6 caracteres!', 'error');
        return;
      }

      try {
        showPasswordMessage('Alterando senha...', 'success');

        // Verificar senha atual
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: currentPassword
        });

        if (signInError) {
          showPasswordMessage('Senha atual incorreta!', 'error');
          return;
        }

        // Atualizar senha
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) throw updateError;

        showPasswordMessage('Senha alterada com sucesso!', 'success');
        
        setTimeout(() => {
          modalChangePassword.classList.add('hidden');
          formChangePassword.reset();
        }, 2000);

      } catch (error) {
        console.error('Erro ao alterar senha:', error);
        showPasswordMessage('Erro: ' + error.message, 'error');
      }
    });

    function showPasswordMessage(message, type) {
      passwordMessage.textContent = message;
      passwordMessage.className = `message ${type}`;
      passwordMessage.classList.remove('hidden');
    }

    // ===== MODAL DE EXCLUIR CONTA =====
    const modalDeleteAccount = document.getElementById('modalDeleteAccount');
    const btnDeleteAccount = document.getElementById('btnDeleteAccount');
    const btnCancelDelete = document.getElementById('btnCancelDelete');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    const closeModalDelete = document.getElementById('closeModalDelete');
    const deleteMessage = document.getElementById('deleteMessage');

    // Abrir modal
    if (btnDeleteAccount) {
      btnDeleteAccount.addEventListener('click', () => {
        modalDeleteAccount.classList.remove('hidden');
      });
    }

    // Fechar modal
    if (closeModalDelete) {
      closeModalDelete.addEventListener('click', () => {
        modalDeleteAccount.classList.add('hidden');
      });
    }

    if (btnCancelDelete) {
      btnCancelDelete.addEventListener('click', () => {
        modalDeleteAccount.classList.add('hidden');
      });
    }

    // Fechar ao clicar fora
    if (modalDeleteAccount) {
      modalDeleteAccount.addEventListener('click', (e) => {
        if (e.target === modalDeleteAccount) {
          modalDeleteAccount.classList.add('hidden');
        }
      });
    }

    // CONFIRMAR EXCLUSÃO
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', async () => {
        try {
          showDeleteMessage('Excluindo conta...', 'success');
          btnConfirmDelete.disabled = true;

          // 1. Buscar todas as publicações do usuário
          const { data: publications } = await supabase
            .from('publications')
            .select('id, image_url')
            .eq('user_id', currentUser.id);

          // 2. Deletar imagens das publicações do storage
          if (publications && publications.length > 0) {
            for (const pub of publications) {
              try {
                const imagePath = pub.image_url.split('/').slice(-2).join('/');
                await supabase.storage
                  .from('publications')
                  .remove([imagePath]);
              } catch (err) {
                console.log('Erro ao deletar imagem:', err);
              }
            }

            // 3. Deletar comentários das publicações
            for (const pub of publications) {
              await supabase
                .from('comments')
                .delete()
                .eq('publication_id', pub.id);
            }

            // 4. Deletar likes das publicações
            for (const pub of publications) {
              await supabase
                .from('likes')
                .delete()
                .eq('publication_id', pub.id);
            }

            // 5. Deletar as publicações
            await supabase
              .from('publications')
              .delete()
              .eq('user_id', currentUser.id);
          }

          // 6. Deletar comentários feitos pelo usuário em outras publicações
          await supabase
            .from('comments')
            .delete()
            .eq('user_id', currentUser.id);

          // 7. Deletar likes dados pelo usuário
          await supabase
            .from('likes')
            .delete()
            .eq('user_id', currentUser.id);

          // 8. Deletar relacionamentos de seguidores
          await supabase
            .from('followers')
            .delete()
            .or(`follower_id.eq.${currentUser.id},following_id.eq.${currentUser.id}`);

          // 9. Deletar avatar do storage (se não for o padrão)
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', currentUser.id)
              .single();

            if (profile && profile.avatar_url && 
                !profile.avatar_url.includes('avatar-default') && 
                !profile.avatar_url.includes('ui-avatars') && 
                !profile.avatar_url.includes('dicebear') &&
                !profile.avatar_url.includes('placeholder')) {
              const avatarPath = profile.avatar_url.split('/').slice(-2).join('/');
              await supabase.storage
                .from('avatars')
                .remove([avatarPath]);
            }
          } catch (err) {
            console.log('Erro ao deletar avatar:', err);
          }

          // 10. Deletar perfil do usuário
          const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', currentUser.id);

          if (profileError) throw profileError;

          showDeleteMessage('Conta excluída com sucesso!', 'success');

          // Logout e redirecionar
          await supabase.auth.signOut();
          localStorage.clear();

          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);

        } catch (error) {
          console.error('Erro ao excluir conta:', error);
          showDeleteMessage('Erro ao excluir conta: ' + error.message, 'error');
          btnConfirmDelete.disabled = false;
        }
      });
    }

    function showDeleteMessage(message, type) {
      if (deleteMessage) {
        deleteMessage.textContent = message;
        deleteMessage.className = `message ${type}`;
        deleteMessage.classList.remove('hidden');
      }
    }

    // ===== TEMA (CLARO/ESCURO) =====
    const themeBtns = document.querySelectorAll('.theme-btn');
    
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        
        themeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Salvar preferência
        localStorage.setItem('theme', theme);
        
        // Aplicar tema (implementar depois)
        if (theme === 'dark') {
          showSettingsMessage('Tema escuro será implementado em breve!', 'success');
        } else if (theme === 'auto') {
          showSettingsMessage('Tema automático será implementado em breve!', 'success');
        } else {
          showSettingsMessage('Tema claro ativado!', 'success');
        }
      });
    });

    // ===== TAMANHO DA FONTE =====
    const fontBtns = document.querySelectorAll('.font-btn');
    
    fontBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const size = btn.dataset.size;
        
        fontBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Salvar preferência
        localStorage.setItem('fontSize', size);
        
        showSettingsMessage('Tamanho da fonte será implementado em breve!', 'success');
      });
    });

    // ===== TOGGLES (PRIVACIDADE, NOTIFICAÇÕES, ETC) =====
    const toggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
    
    toggles.forEach(toggle => {
      // Carregar estado salvo
      const savedState = localStorage.getItem(toggle.id);
      if (savedState !== null) {
        toggle.checked = savedState === 'true';
      }

      toggle.addEventListener('change', () => {
        // Salvar estado
        localStorage.setItem(toggle.id, toggle.checked);
        
        const labels = {
          'toggle2FA': 'Autenticação de dois fatores',
          'togglePrivateAccount': 'Conta privada',
          'toggleOnlineStatus': 'Status online',
          'toggleDataSharing': 'Compartilhamento de dados',
          'toggleTagging': 'Marcações',
          'toggleNotifLikes': 'Notificações de curtidas',
          'toggleNotifComments': 'Notificações de comentários',
          'toggleNotifFollowers': 'Notificações de seguidores',
          'toggleEmailNotif': 'Notificações por e-mail',
          'toggleReducedMotion': 'Animações reduzidas'
        };

        const label = labels[toggle.id] || 'Configuração';
        const status = toggle.checked ? 'ativado' : 'desativado';
        
        showSettingsMessage(`${label} ${status}!`, 'success');
      });
    });

    // ===== SELECTS (IDIOMA, FUSO, DATA) =====
    const selects = document.querySelectorAll('.select-input');
    
    selects.forEach(select => {
      select.addEventListener('change', () => {
        showSettingsMessage('Configuração salva!', 'success');
      });
    });

    // Mensagem geral de configurações
    function showSettingsMessage(message, type) {
      settingsMessage.textContent = message;
      settingsMessage.className = `message ${type}`;
      settingsMessage.classList.remove('hidden');

      setTimeout(() => {
        settingsMessage.classList.add('hidden');
      }, 3000);
    }

    // Inicializar
    checkAuth();
  });
});