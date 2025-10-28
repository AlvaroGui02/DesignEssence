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

        if (profile && userAvatar) {
          userAvatar.src = profile.avatar_url || '/images/avatar-default.png';
          userAvatar.onerror = function () { this.src = '/images/avatar-default.png'; };
        }

        if (profile && userName) {
          userName.textContent = '@' + profile.username;
        }

        // Mostrar e-mail
        if (userEmail) {
          userEmail.textContent = currentUser.email;
        }

        const currentEmailInput = document.getElementById('currentEmail');
        if (currentEmailInput) {
          currentEmailInput.value = currentUser.email;
        }

      } catch (error) {
        console.error('Erro ao carregar informações:', error);
      }
    }

    // ===== DROPDOWN MENU =====
    const dropdownMenu = document.getElementById('dropdownMenu');
    const btnLogout = document.getElementById('btnLogout');

    if (userAvatar && dropdownMenu) {
      userAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
      });
    }

    document.addEventListener('click', (e) => {
      if (dropdownMenu && !dropdownMenu.contains(e.target) && e.target !== userAvatar) {
        dropdownMenu.classList.add('hidden');
      }
    });

    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = 'index.html';
      });
    }

    // Navegação entre seções
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const sectionId = item.dataset.section;

        // Atualizar navegação ativa
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Mostrar seção correspondente
        sections.forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
          targetSection.classList.add('active');
        }
      });
    });

    // ===== MODAL DE ALTERAR E-MAIL =====
    const modalChangeEmail = document.getElementById('modalChangeEmail');
    const btnChangeEmail = document.getElementById('btnChangeEmail');
    const closeEmailModal = document.getElementById('closeEmailModal');
    const formChangeEmail = document.getElementById('formChangeEmail');
    const emailMessage = document.getElementById('emailMessage');

    if (btnChangeEmail && modalChangeEmail) {
      btnChangeEmail.addEventListener('click', () => {
        modalChangeEmail.classList.remove('hidden');
      });
    }

    if (closeEmailModal && modalChangeEmail) {
      closeEmailModal.addEventListener('click', () => {
        modalChangeEmail.classList.add('hidden');
        if (formChangeEmail) formChangeEmail.reset();
        if (emailMessage) emailMessage.classList.add('hidden');
      });
    }

    if (modalChangeEmail) {
      modalChangeEmail.addEventListener('click', (e) => {
        if (e.target === modalChangeEmail) {
          modalChangeEmail.classList.add('hidden');
        }
      });
    }

    if (formChangeEmail) {
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
            if (modalChangeEmail) modalChangeEmail.classList.add('hidden');
            if (formChangeEmail) formChangeEmail.reset();
            if (userEmail) userEmail.textContent = newEmail;
          }, 2000);

        } catch (error) {
          console.error('Erro ao alterar e-mail:', error);
          showEmailMessage('Erro: ' + error.message, 'error');
        }
      });
    }

    function showEmailMessage(message, type) {
      if (emailMessage) {
        emailMessage.textContent = message;
        emailMessage.className = `message ${type}`;
        emailMessage.classList.remove('hidden');
      }
    }

    // ===== MODAL DE ALTERAR SENHA =====
    const modalChangePassword = document.getElementById('modalChangePassword');
    const btnChangePassword = document.getElementById('btnChangePassword');
    const closePasswordModal = document.getElementById('closePasswordModal');
    const formChangePassword = document.getElementById('formChangePassword');
    const passwordMessage = document.getElementById('passwordMessage');

    if (btnChangePassword && modalChangePassword) {
      btnChangePassword.addEventListener('click', () => {
        modalChangePassword.classList.remove('hidden');
      });
    }

    if (closePasswordModal && modalChangePassword) {
      closePasswordModal.addEventListener('click', () => {
        modalChangePassword.classList.add('hidden');
        if (formChangePassword) formChangePassword.reset();
        if (passwordMessage) passwordMessage.classList.add('hidden');
      });
    }

    if (modalChangePassword) {
      modalChangePassword.addEventListener('click', (e) => {
        if (e.target === modalChangePassword) {
          modalChangePassword.classList.add('hidden');
        }
      });
    }

    if (formChangePassword) {
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
            if (modalChangePassword) modalChangePassword.classList.add('hidden');
            if (formChangePassword) formChangePassword.reset();
          }, 2000);

        } catch (error) {
          console.error('Erro ao alterar senha:', error);
          showPasswordMessage('Erro: ' + error.message, 'error');
        }
      });
    }

    function showPasswordMessage(message, type) {
      if (passwordMessage) {
        passwordMessage.textContent = message;
        passwordMessage.className = `message ${type}`;
        passwordMessage.classList.remove('hidden');
      }
    }

    // ===== MODAL DE EXCLUIR CONTA =====
    const modalDeleteAccount = document.getElementById('modalDeleteAccount');
    const btnDeleteAccount = document.getElementById('btnDeleteAccount');
    const btnCancelDelete = document.getElementById('btnCancelDelete');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    const closeModalDelete = document.getElementById('closeModalDelete');
    const deleteMessage = document.getElementById('deleteMessage');

    // Abrir modal
    if (btnDeleteAccount && modalDeleteAccount) {
      btnDeleteAccount.addEventListener('click', () => {
        modalDeleteAccount.classList.remove('hidden');
      });
    }

    // Fechar modal
    if (closeModalDelete && modalDeleteAccount) {
      closeModalDelete.addEventListener('click', () => {
        modalDeleteAccount.classList.add('hidden');
      });
    }

    if (btnCancelDelete && modalDeleteAccount) {
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

    // ===== CONFIRMAR EXCLUSÃO =====
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', async () => {
        try {
          showDeleteMessage('Excluindo conta...', 'success');
          btnConfirmDelete.disabled = true;

          console.log('🔄 Iniciando exclusão do usuário:', currentUser.id);

          // 1. Buscar todas as publicações do usuário
          const { data: publications, error: pubError } = await supabase
            .from('publications')
            .select('id, image_url')
            .eq('user_id', currentUser.id);

          if (pubError) {
            console.error('Erro ao buscar publicações:', pubError);
          } else {
            console.log(`📦 Encontradas ${publications?.length || 0} publicações`);
          }

          // 2. Deletar imagens das publicações do storage
          if (publications && publications.length > 0) {
            console.log('🗑️ Deletando imagens das publicações...');
            for (const pub of publications) {
              try {
                const imagePath = pub.image_url.split('/').slice(-2).join('/');
                const { error: storageError } = await supabase.storage
                  .from('publications')
                  .remove([imagePath]);

                if (storageError) {
                  console.warn('Erro ao deletar imagem:', storageError);
                } else {
                  console.log('✅ Imagem deletada:', imagePath);
                }
              } catch (err) {
                console.warn('Erro ao processar imagem:', err);
              }
            }

            // 3. Deletar comentários das publicações
            console.log('🗑️ Deletando comentários das publicações...');
            const publicationIds = publications.map(p => p.id);
            const { error: commentsError } = await supabase
              .from('comments')
              .delete()
              .in('publication_id', publicationIds);

            if (commentsError) {
              console.warn('Erro ao deletar comentários:', commentsError);
            } else {
              console.log('✅ Comentários das publicações deletados');
            }

            // 4. Deletar likes das publicações
            console.log('🗑️ Deletando likes das publicações...');
            const { error: likesError } = await supabase
              .from('likes')
              .delete()
              .in('publication_id', publicationIds);

            if (likesError) {
              console.warn('Erro ao deletar likes:', likesError);
            } else {
              console.log('✅ Likes das publicações deletados');
            }

            // 5. Deletar as publicações
            console.log('🗑️ Deletando publicações...');
            const { error: delPubError } = await supabase
              .from('publications')
              .delete()
              .eq('user_id', currentUser.id);

            if (delPubError) {
              console.warn('Erro ao deletar publicações:', delPubError);
            } else {
              console.log('✅ Publicações deletadas');
            }
          }

          // 6. Deletar comentários feitos pelo usuário em outras publicações
          console.log('🗑️ Deletando comentários do usuário...');
          const { error: userCommentsError } = await supabase
            .from('comments')
            .delete()
            .eq('user_id', currentUser.id);

          if (userCommentsError) {
            console.warn('Erro ao deletar comentários do usuário:', userCommentsError);
          } else {
            console.log('✅ Comentários do usuário deletados');
          }

          // 7. Deletar likes dados pelo usuário
          console.log('🗑️ Deletando likes do usuário...');
          const { error: userLikesError } = await supabase
            .from('likes')
            .delete()
            .eq('user_id', currentUser.id);

          if (userLikesError) {
            console.warn('Erro ao deletar likes do usuário:', userLikesError);
          } else {
            console.log('✅ Likes do usuário deletados');
          }

          // 8. Deletar relacionamentos de seguidores
          console.log('🗑️ Deletando seguidores...');
          const { error: followersError } = await supabase
            .from('followers')
            .delete()
            .or(`follower_id.eq.${currentUser.id},following_id.eq.${currentUser.id}`);

          if (followersError) {
            console.warn('Erro ao deletar seguidores:', followersError);
          } else {
            console.log('✅ Seguidores deletados');
          }

          // 9. Deletar avatar do storage (se não for o padrão)
          console.log('🗑️ Deletando avatar...');
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
              const { error: avatarError } = await supabase.storage
                .from('avatars')
                .remove([avatarPath]);

              if (avatarError) {
                console.warn('Erro ao deletar avatar:', avatarError);
              } else {
                console.log('✅ Avatar deletado');
              }
            }
          } catch (err) {
            console.warn('Erro ao processar avatar:', err);
          }

          // 10. Deletar perfil do usuário
          console.log('🗑️ Deletando perfil...');
          const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', currentUser.id);

          if (profileError) {
            console.error('❌ Erro ao deletar perfil:', profileError);
            throw new Error('Erro ao deletar perfil: ' + profileError.message);
          } else {
            console.log('✅ Perfil deletado');
          }

          // 11. DELETAR USUÁRIO DO AUTH.USERS
          console.log('🗑️ Deletando usuário do Authentication...');

          const { error: deleteUserError } = await supabase.rpc('delete_user');

          if (deleteUserError) {
            console.error('❌ Erro ao deletar usuário:', deleteUserError);
            console.log('⚠️ Usuário deletado das tabelas mas pode permanecer no auth.users');
          } else {
            console.log('✅ Usuário deletado do Authentication');
          }

          console.log('✅ Conta excluída com sucesso!');
          showDeleteMessage('Conta excluída com sucesso!', 'success');

          // 12. Fazer logout e limpar dados locais
          await supabase.auth.signOut();
          localStorage.clear();
          sessionStorage.clear();

          // Redirecionar após 2 segundos
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);

        } catch (error) {
          console.error('💥 Erro fatal ao excluir conta:', error);
          showDeleteMessage('Erro ao excluir conta: ' + error.message, 'error');
          if (btnConfirmDelete) btnConfirmDelete.disabled = false;
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

        localStorage.setItem('theme', theme);

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

        localStorage.setItem('fontSize', size);

        showSettingsMessage('Tamanho da fonte será implementado em breve!', 'success');
      });
    });

    // ===== TOGGLES (PRIVACIDADE, NOTIFICAÇÕES, ETC) =====
    const toggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');

    toggles.forEach(toggle => {
      const savedState = localStorage.getItem(toggle.id);
      if (savedState !== null) {
        toggle.checked = savedState === 'true';
      }

      toggle.addEventListener('change', () => {
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

    function showSettingsMessage(message, type) {
      if (settingsMessage) {
        settingsMessage.textContent = message;
        settingsMessage.className = `message ${type}`;
        settingsMessage.classList.remove('hidden');

        setTimeout(() => {
          settingsMessage.classList.add('hidden');
        }, 3000);
      }
    }

    // Inicializar
    checkAuth();
  });
});