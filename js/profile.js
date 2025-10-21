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
    const profileAvatar = document.getElementById('profileAvatar');
    const profileUsername = document.getElementById('profileUsername');
    const profileBio = document.getElementById('profileBio');
    const postsCount = document.getElementById('postsCount');
    const profilePostsGrid = document.getElementById('profilePostsGrid');
    const loadingProfile = document.getElementById('loadingProfile');
    const emptyProfile = document.getElementById('emptyProfile');

    // Verificar se está visualizando outro perfil
    const urlParams = new URLSearchParams(window.location.search);
    const viewingUserId = urlParams.get('user');

    let currentUser = null;
    let isOwnProfile = true;
    let profileUserId = null; // ID do perfil sendo visualizado

    // Verificar autenticação
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = 'index.html';
        return;
      }

      currentUser = user;

      // Se está visualizando outro perfil
      if (viewingUserId && viewingUserId !== user.id) {
        isOwnProfile = false;
        profileUserId = viewingUserId;
      } else {
        isOwnProfile = true;
        profileUserId = user.id;
      }

      loadProfile();
      updateDropdownMenu(); // Atualizar dropdown após definir isOwnProfile
    }

    // Carregar perfil
    async function loadProfile() {
      try {
        // Buscar dados do perfil (do usuário visualizado ou do próprio)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileUserId)
          .single();

        if (profile) {
          // Sempre carregar o avatar do usuário logado no header
          if (currentUser) {
            const { data: currentProfile } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', currentUser.id)
              .single();
            if (currentProfile && userAvatar) {
              userAvatar.src = currentProfile.avatar_url;
            }
          }

          // Carregar dados do perfil visualizado
          if (profileAvatar) profileAvatar.src = profile.avatar_url;
          if (profileUsername) profileUsername.textContent = profile.username;
          if (profileBio) profileBio.textContent = profile.bio || 'Sem biografia';

          // Gerenciar botões de Editar Perfil e Seguir
          const btnEditProfile = document.getElementById('btnEditProfile');
          const btnFollowUser = document.getElementById('btnFollowUser');

          if (isOwnProfile) {
            // É o próprio perfil - mostrar botão Editar
            if (btnEditProfile) btnEditProfile.style.display = 'inline-block';
            if (btnFollowUser) btnFollowUser.classList.add('hidden');
          } else {
            // É perfil de outro usuário - mostrar botão Seguir
            if (btnEditProfile) btnEditProfile.style.display = 'none';
            if (btnFollowUser) {
              btnFollowUser.classList.remove('hidden');

              // Verificar se já está seguindo
              const { data: followData } = await supabase
                .from('followers')
                .select('id')
                .eq('follower_id', currentUser.id)
                .eq('following_id', profileUserId)
                .single();

              if (followData) {
                btnFollowUser.textContent = 'Seguindo';
                btnFollowUser.classList.add('following');
              } else {
                btnFollowUser.textContent = 'Seguir';
                btnFollowUser.classList.remove('following');
              }
            }
          }
        }

        // Buscar publicações do perfil visualizado
        const { data: posts } = await supabase
          .from('publications')
          .select('*')
          .eq('user_id', profileUserId)
          .order('created_at', { ascending: false });

        // Buscar contagem de seguidores
        const { count: followersCount } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profileUserId);

        // Buscar contagem de quem está seguindo
        const { count: followingCount } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profileUserId);

        if (loadingProfile) loadingProfile.classList.add('hidden');

        // Atualizar estatísticas
        if (postsCount) postsCount.textContent = posts?.length || 0;
        const followersCountEl = document.getElementById('followersCount');
        const followingCountEl = document.getElementById('followingCount');
        if (followersCountEl) followersCountEl.textContent = followersCount || 0;
        if (followingCountEl) followingCountEl.textContent = followingCount || 0;

        if (!posts || posts.length === 0) {
          if (emptyProfile) emptyProfile.classList.remove('hidden');
          return;
        }

        // Limpar grid antes de renderizar
        if (profilePostsGrid) profilePostsGrid.innerHTML = '';

        // Renderizar posts
        posts.forEach(post => {
          const postItem = document.createElement('div');
          postItem.className = 'post-item';
          postItem.innerHTML = `
            <img src="${post.image_url}" alt="${post.title}">
          `;

          // ADICIONAR EVENTO DE CLIQUE
          postItem.addEventListener('click', () => {
            openPostModal(post.id);
          });

          if (profilePostsGrid) profilePostsGrid.appendChild(postItem);
        });

      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        if (loadingProfile) loadingProfile.classList.add('hidden');
      }
    }

    // ===== SISTEMA DE SEGUIR/DEIXAR DE SEGUIR =====
    const btnFollowUser = document.getElementById('btnFollowUser');

    if (btnFollowUser) {
      btnFollowUser.addEventListener('click', async () => {
        if (!currentUser) {
          alert('Você precisa estar logado para seguir usuários!');
          return;
        }

        try {
          btnFollowUser.disabled = true;

          // Verificar se já está seguindo
          const { data: existingFollow } = await supabase
            .from('followers')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', profileUserId)
            .single();

          if (existingFollow) {
            // Deixar de seguir
            const { error } = await supabase
              .from('followers')
              .delete()
              .eq('id', existingFollow.id);

            if (error) throw error;

            btnFollowUser.textContent = 'Seguir';
            btnFollowUser.classList.remove('following');

            console.log('✅ Deixou de seguir');
          } else {
            // Seguir
            const { error } = await supabase
              .from('followers')
              .insert([{
                follower_id: currentUser.id,
                following_id: profileUserId
              }]);

            if (error) throw error;

            btnFollowUser.textContent = 'Seguindo';
            btnFollowUser.classList.add('following');

            console.log('✅ Começou a seguir');
          }

          // Recarregar contagem de seguidores
          loadProfile();

        } catch (error) {
          console.error('Erro ao seguir/deixar de seguir:', error);
          alert('Erro ao processar ação: ' + error.message);
        } finally {
          btnFollowUser.disabled = false;
        }
      });
    }

    // ===== ATUALIZAR DROPDOWN DINAMICAMENTE =====
    function updateDropdownMenu() {
      const dropdownProfileLink = document.getElementById('dropdownProfileLink');

      if (dropdownProfileLink) {
        if (isOwnProfile) {
          // Está no próprio perfil - ocultar opção "Perfil"
          dropdownProfileLink.style.display = 'none';
        } else {
          // Está em outro perfil - mostrar opção "Perfil"
          dropdownProfileLink.style.display = 'flex';
          dropdownProfileLink.href = 'profile.html';
        }
      }
    }

    // ===== DROPDOWN MENU =====
    const dropdownMenu = document.getElementById('dropdownMenu');
    const btnLogout = document.getElementById('btnLogout');

    // Toggle dropdown ao clicar no avatar
    if (userAvatar && dropdownMenu) {
      userAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
      });
    } else {
      console.error('❌ Elementos não encontrados:', {
        userAvatar: !!userAvatar,
        dropdownMenu: !!dropdownMenu
      });
    }

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
      if (dropdownMenu && !dropdownMenu.contains(e.target) && e.target !== userAvatar) {
        dropdownMenu.classList.add('hidden');
      }
    });

    // Logout
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = 'index.html';
      });
    } else {
      console.error('❌ Botão de logout não encontrado');
    }

    // Modal de Editar Perfil (só funciona se for o próprio perfil)
    const modalEditProfile = document.getElementById('modalEditProfile');
    const btnEditProfile = document.getElementById('btnEditProfile');
    const closeModalEdit = document.getElementById('closeModalEdit');
    const btnCancelEdit = document.getElementById('btnCancelEdit');
    const formEditProfile = document.getElementById('formEditProfile');
    const editAvatar = document.getElementById('editAvatar');
    const editUsername = document.getElementById('editUsername');
    const editBio = document.getElementById('editBio');
    const bioCharCount = document.getElementById('bioCharCount');
    const avatarUpload = document.getElementById('avatarUpload');
    const editMessage = document.getElementById('editMessage');

    let currentProfile = null;
    let newAvatarFile = null;

    // Abrir modal de edição
    if (btnEditProfile) {
      btnEditProfile.addEventListener('click', async () => {
        if (!isOwnProfile) return; // Só permite editar o próprio perfil

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profile) {
          currentProfile = profile;
          if (editAvatar) editAvatar.src = profile.avatar_url;
          if (editUsername) editUsername.value = profile.username;
          if (editBio) editBio.value = profile.bio || '';
          if (bioCharCount) bioCharCount.textContent = (profile.bio || '').length;
        }

        if (modalEditProfile) modalEditProfile.classList.remove('hidden');
      });
    }

    // Fechar modal
    if (closeModalEdit && modalEditProfile) {
      closeModalEdit.addEventListener('click', () => {
        modalEditProfile.classList.add('hidden');
        newAvatarFile = null;
      });
    }

    if (btnCancelEdit && modalEditProfile) {
      btnCancelEdit.addEventListener('click', () => {
        modalEditProfile.classList.add('hidden');
        newAvatarFile = null;
      });
    }

    // Fechar ao clicar fora
    if (modalEditProfile) {
      modalEditProfile.addEventListener('click', (e) => {
        if (e.target === modalEditProfile) {
          modalEditProfile.classList.add('hidden');
          newAvatarFile = null;
        }
      });
    }

    // Contador de caracteres da bio
    if (editBio && bioCharCount) {
      editBio.addEventListener('input', () => {
        bioCharCount.textContent = editBio.value.length;
      });
    }

    // Upload de avatar
    if (avatarUpload) {
      avatarUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          newAvatarFile = file;
          const reader = new FileReader();
          reader.onload = (e) => {
            if (editAvatar) editAvatar.src = e.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Salvar alterações
    if (formEditProfile) {
      formEditProfile.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newUsername = editUsername ? editUsername.value.trim() : '';
        const newBio = editBio ? editBio.value.trim() : '';

        if (newUsername.length < 3) {
          showEditMessage('Nome de usuário deve ter pelo menos 3 caracteres', 'error');
          return;
        }

        try {
          showEditMessage('Salvando alterações...', 'success');

          let avatarUrl = currentProfile.avatar_url;

          // Upload de novo avatar se houver
          if (newAvatarFile) {
            const fileExt = newAvatarFile.name.split('.').pop();
            const fileName = `${currentUser.id}/avatar_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, newAvatarFile, {
                cacheControl: '3600',
                upsert: true
              });

            if (uploadError) {
              showEditMessage('Erro no upload da imagem: ' + uploadError.message, 'error');
              return;
            }

            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);

            avatarUrl = urlData.publicUrl;
          }

          // Verificar se nome de usuário já existe
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', newUsername)
            .neq('id', currentUser.id)
            .single();

          if (existingUser) {
            showEditMessage('Nome de usuário já está em uso', 'error');
            return;
          }

          // Atualizar perfil
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              username: newUsername,
              bio: newBio,
              avatar_url: avatarUrl
            })
            .eq('id', currentUser.id);

          if (updateError) {
            showEditMessage('Erro ao atualizar perfil: ' + updateError.message, 'error');
            return;
          }

          showEditMessage('Perfil atualizado com sucesso!', 'success');

          setTimeout(() => {
            if (modalEditProfile) modalEditProfile.classList.add('hidden');
            newAvatarFile = null;
            location.reload();
          }, 1500);

        } catch (error) {
          showEditMessage('Erro ao atualizar perfil: ' + error.message, 'error');
        }
      });
    }

    // Mostrar mensagem no modal
    function showEditMessage(message, type) {
      if (editMessage) {
        editMessage.textContent = message;
        editMessage.className = `message ${type}`;
        editMessage.classList.remove('hidden');

        if (type === 'error') {
          setTimeout(() => {
            editMessage.classList.add('hidden');
          }, 3000);
        }
      }
    }

    // ===== MODAL DE EDITAR PUBLICAÇÃO =====
    const modalEditPost = document.getElementById('modalEditPost');
    const closeEditPostModal = document.getElementById('closeEditPostModal');
    const btnCancelEditPost = document.getElementById('btnCancelEditPost');
    const formEditPost = document.getElementById('formEditPost');
    const editPostTitle = document.getElementById('editPostTitle');
    const editPostDescription = document.getElementById('editPostDescription');
    const editPostMessage = document.getElementById('editPostMessage');

    let currentEditingPost = null;

    // Função para abrir modal de edição
    function openEditPostModal(post) {
      currentEditingPost = post;
      
      if (editPostTitle) editPostTitle.value = post.title || '';
      if (editPostDescription) editPostDescription.value = post.description || '';
      
      if (modalEditPost) modalEditPost.classList.remove('hidden');
      if (modalViewPost) modalViewPost.classList.add('hidden'); // Fechar modal de visualização
    }

    // Fechar modal de edição
    if (closeEditPostModal && modalEditPost) {
      closeEditPostModal.addEventListener('click', () => {
        modalEditPost.classList.add('hidden');
        if (currentEditingPost) {
          openPostModal(currentEditingPost.id); // Reabrir visualização
        }
      });
    }

    if (btnCancelEditPost && modalEditPost) {
      btnCancelEditPost.addEventListener('click', () => {
        modalEditPost.classList.add('hidden');
        if (currentEditingPost) {
          openPostModal(currentEditingPost.id); // Reabrir visualização
        }
      });
    }

    // Fechar ao clicar fora
    if (modalEditPost) {
      modalEditPost.addEventListener('click', (e) => {
        if (e.target === modalEditPost) {
          modalEditPost.classList.add('hidden');
          if (currentEditingPost) {
            openPostModal(currentEditingPost.id);
          }
        }
      });
    }

    // Salvar alterações da publicação
    if (formEditPost) {
      formEditPost.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newTitle = editPostTitle ? editPostTitle.value.trim() : '';
        const newDescription = editPostDescription ? editPostDescription.value.trim() : '';

        if (!newTitle) {
          showEditPostMessage('O título não pode estar vazio!', 'error');
          return;
        }

        try {
          showEditPostMessage('Salvando alterações...', 'success');

          const { error } = await supabase
            .from('publications')
            .update({
              title: newTitle,
              description: newDescription
            })
            .eq('id', currentEditingPost.id);

          if (error) throw error;

          showEditPostMessage('Publicação atualizada com sucesso!', 'success');

          setTimeout(() => {
            if (modalEditPost) modalEditPost.classList.add('hidden');
            loadProfile(); // Recarregar perfil
            openPostModal(currentEditingPost.id); // Reabrir visualização atualizada
          }, 1500);

        } catch (error) {
          console.error('Erro ao atualizar publicação:', error);
          showEditPostMessage('Erro ao atualizar: ' + error.message, 'error');
        }
      });
    }

    // Mostrar mensagem no modal de edição
    function showEditPostMessage(message, type) {
      if (editPostMessage) {
        editPostMessage.textContent = message;
        editPostMessage.className = `message ${type}`;
        editPostMessage.classList.remove('hidden');

        if (type === 'error') {
          setTimeout(() => {
            editPostMessage.classList.add('hidden');
          }, 3000);
        }
      }
    }

    // ===== MODAL DE VISUALIZAR PUBLICAÇÃO =====
    const modalViewPost = document.getElementById('modalViewPost');
    const closeViewModal = document.getElementById('closeViewModal');
    const viewPostContent = document.getElementById('viewPostContent');

    // Função para abrir modal de visualização
    async function openPostModal(postId) {
      try {
        // Buscar dados completos da publicação
        const { data: post, error } = await supabase
          .from('publications')
          .select(`
            *,
            profiles:user_id (username, avatar_url)
          `)
          .eq('id', postId)
          .single();

        if (error) throw error;

        // Buscar curtidas
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('publication_id', postId);

        // Verificar se usuário curtiu
        let userLiked = false;
        if (currentUser) {
          const { data: like } = await supabase
            .from('likes')
            .select('id')
            .eq('publication_id', postId)
            .eq('user_id', currentUser.id)
            .single();

          userLiked = !!like;
        }

        // Buscar todos os comentários
        const { data: comments } = await supabase
          .from('comments')
          .select(`
            *,
            profiles:user_id (username, avatar_url)
          `)
          .eq('publication_id', postId)
          .order('created_at', { ascending: true });

        // Verificar se é o dono do post
        const isOwner = currentUser && post.user_id === currentUser.id;

        // Renderizar modal
        if (viewPostContent) {
          viewPostContent.innerHTML = `
            <img src="${post.image_url}" alt="${post.title}" class="view-post-image">
            
            <div class="view-post-sidebar">
              <div class="view-post-header">
                <img src="${post.profiles.avatar_url}" alt="${post.profiles.username}" class="view-post-avatar">
                <span class="view-post-author">${post.profiles.username}</span>
                
                ${isOwner ? `
                  <div class="view-post-options">
                    <button class="btn-view-options">⋮</button>
                    <div class="view-options-menu hidden">
                      <button class="view-option-item edit" data-action="edit">
                        <span class="icon">✏️</span>
                        Editar publicação
                      </button>
                      <button class="view-option-item delete" data-action="delete">
                        <span class="icon">🗑️</span>
                        Excluir publicação
                      </button>
                    </div>
                  </div>
                ` : ''}
              </div>

              <div class="view-post-comments">
                <div class="view-comment">
                  <img src="${post.profiles.avatar_url}" alt="${post.profiles.username}" class="view-comment-avatar">
                  <div class="view-comment-content">
                    <div>
                      <span class="view-comment-username">${post.profiles.username}</span>
                      <span class="view-comment-text">${post.title}</span>
                    </div>
                    ${post.description ? `<div class="view-comment-text" style="margin-top: 8px;">${post.description}</div>` : ''}
                    <div class="view-comment-date">${formatDate(post.created_at)}</div>
                  </div>
                </div>

                ${comments && comments.length > 0 ? comments.map(c => {
            const isCommentOwner = currentUser && c.user_id === currentUser.id;
            return `
                    <div class="view-comment" data-comment-id="${c.id}">
                      <img src="${c.profiles.avatar_url}" alt="${c.profiles.username}" class="view-comment-avatar">
                      <div class="view-comment-content">
                        <div>
                          <span class="view-comment-username">${c.profiles.username}</span>
                          <span class="view-comment-text">${c.content}</span>
                        </div>
                        <div class="view-comment-date">${formatDate(c.created_at)}</div>
                      </div>
                      ${isCommentOwner ? `
                        <div class="comment-options">
                          <button class="btn-comment-options">⋮</button>
                          <div class="comment-options-menu hidden">
                            <button class="comment-option-item delete" data-comment-id="${c.id}">
                              <span class="icon">🗑️</span>
                              Excluir comentário
                            </button>
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  `;
          }).join('') : ''}
              </div>

              <div class="view-post-actions">
                <div class="view-action-buttons">
                  <button class="view-action-btn view-btn-like ${userLiked ? 'liked' : ''}" data-post-id="${post.id}">
                    ${userLiked ? '❤️' : '🤍'}
                  </button>
                  <button class="view-action-btn">💬</button>
                </div>

                <div class="view-post-likes">${likesCount || 0} curtida${likesCount !== 1 ? 's' : ''}</div>
                <div class="view-post-date">${formatDate(post.created_at)}</div>

                <form class="view-comment-form" data-post-id="${post.id}">
                  <input type="text" placeholder="Adicione um comentário..." class="view-comment-input">
                  <button type="submit" class="view-btn-send">Publicar</button>
                </form>
              </div>
            </div>
          `;
        }

        // Menu de opções do POST (se for o dono)
        if (isOwner && viewPostContent) {
          const btnViewOptions = viewPostContent.querySelector('.btn-view-options');
          const viewOptionsMenu = viewPostContent.querySelector('.view-options-menu');
          const editBtn = viewPostContent.querySelector('[data-action="edit"]');
          const deleteBtn = viewPostContent.querySelector('[data-action="delete"]');

          if (btnViewOptions && viewOptionsMenu) {
            btnViewOptions.addEventListener('click', (e) => {
              e.stopPropagation();
              viewOptionsMenu.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
              if (!viewOptionsMenu.contains(e.target) && e.target !== btnViewOptions) {
                viewOptionsMenu.classList.add('hidden');
              }
            });
          }

          // Botão de EDITAR publicação
          if (editBtn) {
            editBtn.addEventListener('click', () => {
              openEditPostModal(post);
            });
          }

          // Botão de EXCLUIR publicação
          if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
              const confirmDelete = confirm('Tem certeza que deseja excluir esta publicação?');
              if (!confirmDelete) return;

              try {
                await supabase.from('comments').delete().eq('publication_id', postId);
                await supabase.from('likes').delete().eq('publication_id', postId);

                const { error: deleteError } = await supabase
                  .from('publications')
                  .delete()
                  .eq('id', postId);

                if (deleteError) throw deleteError;

                const imagePath = post.image_url.split('/').slice(-2).join('/');
                await supabase.storage
                  .from('publications')
                  .remove([imagePath]);

                if (modalViewPost) modalViewPost.classList.add('hidden');
                loadProfile();

                alert('Publicação excluída com sucesso!');

              } catch (error) {
                console.error('Erro ao excluir:', error);
                alert('Erro ao excluir publicação: ' + error.message);
              }
            });
          }
        }

        // Menu de opções dos COMENTÁRIOS
        if (viewPostContent) {
          const commentOptionsButtons = viewPostContent.querySelectorAll('.btn-comment-options');
          commentOptionsButtons.forEach(btn => {
            const commentOptionsMenu = btn.nextElementSibling;

            if (commentOptionsMenu) {
              btn.addEventListener('click', (e) => {
                e.stopPropagation();

                // Fechar outros menus abertos
                document.querySelectorAll('.comment-options-menu').forEach(menu => {
                  if (menu !== commentOptionsMenu) {
                    menu.classList.add('hidden');
                  }
                });

                commentOptionsMenu.classList.toggle('hidden');
              });

              // Botão de excluir comentário
              const deleteCommentBtn = commentOptionsMenu.querySelector('.comment-option-item.delete');
              if (deleteCommentBtn) {
                deleteCommentBtn.addEventListener('click', async () => {
                  const commentId = deleteCommentBtn.getAttribute('data-comment-id');
                  const confirmDelete = confirm('Tem certeza que deseja excluir este comentário?');
                  if (!confirmDelete) return;

                  try {
                    const { error } = await supabase
                      .from('comments')
                      .delete()
                      .eq('id', commentId);

                    if (error) throw error;

                    // Recarregar modal
                    openPostModal(postId);

                  } catch (error) {
                    console.error('Erro ao excluir comentário:', error);
                    alert('Erro ao excluir comentário: ' + error.message);
                  }
                });
              }
            }
          });
        }

        // Fechar menus ao clicar fora
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.comment-options')) {
            document.querySelectorAll('.comment-options-menu').forEach(menu => {
              menu.classList.add('hidden');
            });
          }
        });

        // Event listener para LIKE
        if (viewPostContent) {
          const likeBtn = viewPostContent.querySelector('.view-btn-like');
          if (likeBtn) {
            likeBtn.addEventListener('click', async () => {
              await toggleLike(postId);
              openPostModal(postId);
            });
          }
        }

        // Event listener para COMENTÁRIO
        if (viewPostContent) {
          const commentForm = viewPostContent.querySelector('.view-comment-form');
          if (commentForm) {
            commentForm.addEventListener('submit', async (e) => {
              e.preventDefault();
              const input = commentForm.querySelector('.view-comment-input');
              if (input && input.value.trim()) {
                await addComment(postId, input.value.trim());
                openPostModal(postId);
              }
            });
          }
        }

        // Abrir modal
        if (modalViewPost) modalViewPost.classList.remove('hidden');

      } catch (error) {
        console.error('Erro ao abrir post:', error);
      }
    }

    // Fechar modal
    if (closeViewModal && modalViewPost) {
      closeViewModal.addEventListener('click', () => {
        modalViewPost.classList.add('hidden');
      });
    }

    if (modalViewPost) {
      modalViewPost.addEventListener('click', (e) => {
        if (e.target === modalViewPost) {
          modalViewPost.classList.add('hidden');
        }
      });
    }

    // Funções auxiliares (like e comentário)
    async function toggleLike(postId) {
      if (!currentUser) return;

      try {
        const { data: existing } = await supabase
          .from('likes')
          .select('id')
          .eq('publication_id', postId)
          .eq('user_id', currentUser.id)
          .single();

        if (existing) {
          await supabase.from('likes').delete().eq('id', existing.id);
        } else {
          await supabase.from('likes').insert([{
            user_id: currentUser.id,
            publication_id: postId
          }]);
        }

        loadProfile();

      } catch (error) {
        console.error('Erro like:', error);
      }
    }

    async function addComment(postId, content) {
      if (!currentUser) return;

      try {
        await supabase.from('comments').insert([{
          user_id: currentUser.id,
          publication_id: postId,
          content: content
        }]);

      } catch (error) {
        console.error('Erro comment:', error);
      }
    }

    function formatDate(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const diff = Math.floor((now - date) / 1000);

      if (diff < 60) return 'AGORA';
      if (diff < 3600) return `HÁ ${Math.floor(diff / 60)} MIN`;
      if (diff < 86400) return `HÁ ${Math.floor(diff / 3600)} H`;
      if (diff < 604800) return `HÁ ${Math.floor(diff / 86400)} D`;

      return date.toLocaleDateString('pt-BR').toUpperCase();
    }

    // Inicializar
    checkAuth();

    // ===== ABRIR POST AUTOMATICAMENTE SE VIR DA BUSCA =====
    const postIdFromUrl = urlParams.get('post');

    if (postIdFromUrl) {
      // Aguardar o perfil carregar antes de abrir o modal
      setTimeout(() => {
        openPostModal(postIdFromUrl);
        // Limpar URL sem recarregar a página
        window.history.replaceState({}, '', `profile.html?user=${profileUserId}`);
      }, 1000);
    }
  });
});