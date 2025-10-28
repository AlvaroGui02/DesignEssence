// Aguardar Supabase carregar
document.addEventListener('DOMContentLoaded', () => {

  function waitForSupabase(callback) {
    if (window.supabaseClient) {
      callback();
    } else {
      setTimeout(() => waitForSupabase(callback), 100);
    }
  }

  waitForSupabase(() => {
    const supabase = window.supabaseClient;

    // Elementos do DOM
    const userAvatar = document.getElementById('userAvatar');
    const btnNewPost = document.getElementById('btnNewPost');
    const modalNewPost = document.getElementById('modalNewPost');
    const closeModalPost = document.getElementById('closeModalPost');
    const formNewPost = document.getElementById('formNewPost');
    const postImage = document.getElementById('postImage');
    const fileName = document.getElementById('fileName');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const postTitle = document.getElementById('postTitle');
    const postDescription = document.getElementById('postDescription');
    const descCharCount = document.getElementById('descCharCount');
    const feedPosts = document.getElementById('feedPosts');
    const loadingFeed = document.getElementById('loadingFeed');
    const emptyFeed = document.getElementById('emptyFeed');
    const postMessage = document.getElementById('postMessage');

    let currentUser = null;
    let allPosts = []; // Armazenar posts na memória

    // Verificar autenticação
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = 'index.html';
        return;
      }

      currentUser = user;

      // Carregar perfil do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile && userAvatar) {
        userAvatar.src = profile.avatar_url || 'images/avatar-default.png';
        userAvatar.onerror = function () { this.src = 'images/avatar-default.png'; };
      }
    }

    // Dropdown Menu
    const dropdownMenu = document.getElementById('dropdownMenu');
    const btnLogout = document.getElementById('btnLogout');

    if (userAvatar) {
      userAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdownMenu) {
          dropdownMenu.classList.toggle('hidden');
        }
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

    // ===== MODAL DE NOVA PUBLICAÇÃO =====

    if (btnNewPost && modalNewPost) {
      btnNewPost.addEventListener('click', () => {
        modalNewPost.classList.remove('hidden');
      });
    }

    if (closeModalPost && modalNewPost) {
      closeModalPost.addEventListener('click', () => {
        modalNewPost.classList.add('hidden');
        if (formNewPost) formNewPost.reset();
        if (imagePreview) imagePreview.classList.add('hidden');
        if (fileName) fileName.textContent = '📷 Escolher imagem do projeto';
        if (postMessage) postMessage.classList.add('hidden');
      });
    }

    if (modalNewPost) {
      modalNewPost.addEventListener('click', (e) => {
        if (e.target === modalNewPost) {
          modalNewPost.classList.add('hidden');
        }
      });
    }

    if (postImage) {
      postImage.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            alert('Imagem muito grande! Use uma imagem menor que 5MB');
            postImage.value = '';
            return;
          }

          if (fileName) fileName.textContent = file.name;
          const reader = new FileReader();
          reader.onload = (e) => {
            if (previewImg) previewImg.src = e.target.result;
            if (imagePreview) imagePreview.classList.remove('hidden');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (postDescription && descCharCount) {
      postDescription.addEventListener('input', () => {
        descCharCount.textContent = postDescription.value.length;
      });
    }

    if (formNewPost) {
      formNewPost.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = postTitle ? postTitle.value.trim() : '';
        const description = postDescription ? postDescription.value.trim() : '';
        const file = postImage ? postImage.files[0] : null;

        if (!file) {
          alert('Selecione uma imagem');
          return;
        }

        try {
          showMessage('Publicando...', 'success');

          const fileExt = file.name.split('.').pop();
          const fileNameUpload = `${currentUser.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('publications')
            .upload(fileNameUpload, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Erro upload:', uploadError);
            throw uploadError;
          }

          const { data: urlData } = supabase.storage
            .from('publications')
            .getPublicUrl(fileNameUpload);

          const { error: insertError } = await supabase
            .from('publications')
            .insert([{
              user_id: currentUser.id,
              title: title,
              description: description,
              image_url: urlData.publicUrl
            }]);

          if (insertError) {
            console.error('Erro insert:', insertError);
            throw insertError;
          }

          showMessage('Publicado! 🎉', 'success');

          setTimeout(() => {
            if (modalNewPost) modalNewPost.classList.add('hidden');
            if (formNewPost) formNewPost.reset();
            if (imagePreview) imagePreview.classList.add('hidden');
            if (fileName) fileName.textContent = '📷 Escolher imagem do projeto';
            if (postMessage) postMessage.classList.add('hidden');
            loadPosts();
          }, 1000);

        } catch (error) {
          console.error('Erro:', error);
          showMessage('Erro: ' + error.message, 'error');
        }
      });
    }

    function showMessage(msg, type) {
      if (postMessage) {
        postMessage.textContent = msg;
        postMessage.className = `message ${type}`;
        postMessage.classList.remove('hidden');
      }
    }

    // ===== CARREGAR E RENDERIZAR POSTS =====

    async function loadPosts() {
      try {
        if (!feedPosts || !loadingFeed || !emptyFeed) {
          console.error('❌ Elementos do feed não encontrados!');
          return;
        }

        console.log('🔄 Carregando posts...');

        loadingFeed.classList.remove('hidden');
        emptyFeed.classList.add('hidden');
        feedPosts.innerHTML = '';

        const { data: posts, error } = await supabase
          .from('publications')
          .select(`
            *,
            profiles:user_id (id, username, avatar_url)
          `)
          .order('created_at', { ascending: false });

        loadingFeed.classList.add('hidden');

        if (error) {
          console.error('Erro ao carregar:', error);
          throw error;
        }

        if (!posts || posts.length === 0) {
          console.log('Nenhum post encontrado');
          emptyFeed.classList.remove('hidden');
          return;
        }

        allPosts = posts;
        console.log(`✅ ${posts.length} posts carregados`);

        for (const post of posts) {
          await renderPost(post);
        }

        console.log(`✅ Posts renderizados com sucesso`);

      } catch (error) {
        console.error('💥 Erro fatal:', error);
        if (loadingFeed) loadingFeed.classList.add('hidden');
      }
    }

    async function renderPost(post) {
      try {
        if (document.querySelector(`[data-post-id="${post.id}"]`)) {
          console.log(`⚠️ Post ${post.id} já renderizado, pulando...`);
          return;
        }

        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('publication_id', post.id);

        let userLiked = false;
        if (currentUser) {
          const { data: like } = await supabase
            .from('likes')
            .select('id')
            .eq('publication_id', post.id)
            .eq('user_id', currentUser.id)
            .single();

          userLiked = !!like;
        }

        const { data: comments } = await supabase
          .from('comments')
          .select(`
            *,
            profiles:user_id (username, avatar_url)
          `)
          .eq('publication_id', post.id)
          .order('created_at', { ascending: false })
          .limit(2);

        const isOwner = currentUser && post.user_id === currentUser.id;

        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        postCard.setAttribute('data-post-id', post.id);
        postCard.innerHTML = `
          <div class="post-header">
            <div class="post-header-left" data-user-id="${post.profiles.id}" style="cursor: pointer; display: flex; align-items: center; gap: 12px;">
              <img src="${post.profiles.avatar_url || 'images/avatar-default.png'}" alt="${post.profiles.username}" class="post-avatar" style="cursor: pointer;">
              <span class="post-author" style="cursor: pointer;">${post.profiles.username}</span>
            </div>
            ${isOwner ? `
              <div class="post-options">
                <button class="btn-options">⋮</button>
                <div class="options-menu hidden">
                  <button class="option-item delete" data-action="delete">
                    <span class="icon">🗑️</span>
                    Excluir publicação
                  </button>
                </div>
              </div>
            ` : ''}
          </div>
          
          <!-- TÍTULO DA PUBLICAÇÃO -->
          <div class="post-title-section">
            <h3 class="post-title-text">${post.title}</h3>
          </div>
          
          <img src="${post.image_url}" alt="${post.title}" class="post-image">
          
          <div class="post-actions">
            <button class="action-button btn-like ${userLiked ? 'liked' : ''}" data-id="${post.id}">
              ${userLiked ? '❤️' : '🤍'}
            </button>
            <button class="action-button">💬</button>
          </div>
          
          <div class="post-info">
            <div class="post-likes">${likesCount || 0} curtida${likesCount !== 1 ? 's' : ''}</div>
            ${post.description ? `
              <div class="post-caption" style="background: #fafafa; padding: 12px 8px; margin: 8px 0; border-radius: 4px; border-left: 3px solid #0095f6;">
                <span class="username" data-user-id="${post.user_id}" style="cursor: pointer; font-weight: bold;">${post.profiles.username}</span>: <span class="post-description">${post.description}</span>
              </div>
            ` : ''}
            ${comments && comments.length > 0 ? `
              <div class="post-comments-preview">
                ${comments.map(c => {
                  const isCommentOwner = currentUser && c.user_id === currentUser.id;
                  return `
                    <div class="post-caption" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                      <div style="flex: 1;">
                        <span class="username" data-user-id="${c.user_id}" style="cursor: pointer; font-weight: bold;">${c.profiles.username}</span>: ${c.content}
                      </div>
                      ${isCommentOwner ? `
                        <div class="comment-options" style="position: relative;">
                          <button class="btn-comment-options" style="background: none; border: none; cursor: pointer; font-size: 18px; padding: 0 4px;">⋮</button>
                          <div class="comment-options-menu hidden" style="position: absolute; right: 0; top: 100%; background: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 10; min-width: 150px;">
                            <button class="comment-option-item delete" data-comment-id="${c.id}" style="width: 100%; padding: 8px 12px; border: none; background: none; cursor: pointer; text-align: left; display: flex; align-items: center; gap: 8px; color: #ed4956;">
                              <span class="icon">🗑️</span>
                              Excluir comentário
                            </button>
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}
            <div class="post-date">${formatDate(post.created_at)}</div>
          </div>
          
          <form class="comment-form" data-id="${post.id}">
            <input type="text" placeholder="Adicione um comentário..." class="comment-input">
            <button type="submit" class="btn-send">Publicar</button>
          </form>
        `;

        if (feedPosts) {
          feedPosts.appendChild(postCard);
        }

        // ===== TORNAR FOTO E NOME CLICÁVEIS =====
        const postHeaderLeft = postCard.querySelector('.post-header-left');
        if (postHeaderLeft) {
          postHeaderLeft.addEventListener('click', () => {
            const userId = postHeaderLeft.getAttribute('data-user-id');
            if (userId) {
              window.location.href = `profile.html?user=${userId}`;
            }
          });
        }

        // ===== TORNAR NOME NA LEGENDA CLICÁVEL =====
        const captionUsername = postCard.querySelector('.post-caption .username[data-user-id]');
        if (captionUsername) {
          captionUsername.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = captionUsername.getAttribute('data-user-id');
            if (userId) {
              window.location.href = `profile.html?user=${userId}`;
            }
          });
        }

        // Menu de opções (apenas para o dono)
        if (isOwner) {
          const btnOptions = postCard.querySelector('.btn-options');
          const optionsMenu = postCard.querySelector('.options-menu');
          const deleteBtn = postCard.querySelector('[data-action="delete"]');

          if (btnOptions && optionsMenu) {
            btnOptions.addEventListener('click', (e) => {
              e.stopPropagation();

              document.querySelectorAll('.options-menu').forEach(menu => {
                if (menu !== optionsMenu) {
                  menu.classList.add('hidden');
                }
              });

              optionsMenu.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
              if (!optionsMenu.contains(e.target) && e.target !== btnOptions) {
                optionsMenu.classList.add('hidden');
              }
            });
          }

          if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
              const confirmDelete = confirm('Tem certeza que deseja excluir esta publicação?');
              if (!confirmDelete) return;

              try {
                await supabase
                  .from('comments')
                  .delete()
                  .eq('publication_id', post.id);

                await supabase
                  .from('likes')
                  .delete()
                  .eq('publication_id', post.id);

                const { error: deleteError } = await supabase
                  .from('publications')
                  .delete()
                  .eq('id', post.id);

                if (deleteError) throw deleteError;

                const imagePath = post.image_url.split('/').slice(-2).join('/');
                await supabase.storage
                  .from('publications')
                  .remove([imagePath]);

                postCard.remove();

                alert('Publicação excluída com sucesso!');

              } catch (error) {
                console.error('Erro ao excluir:', error);
                alert('Erro ao excluir publicação: ' + error.message);
              }
            });
          }
        }

        // Like
        const likeBtn = postCard.querySelector('.btn-like');
        if (likeBtn) {
          likeBtn.addEventListener('click', async () => {
            await toggleLike(post.id);
            updatePostCard(post.id);
          });
        }

        // Comentário
        const form = postCard.querySelector('.comment-form');
        if (form) {
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = form.querySelector('.comment-input');
            if (input && input.value.trim()) {
              await addComment(post.id, input.value.trim());
              input.value = '';
              updatePostCard(post.id);
            }
          });
        }

        // Event listeners para botões de opções dos comentários iniciais
        const commentOptionsButtons = postCard.querySelectorAll('.btn-comment-options');
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

                  // Atualizar o post após excluir o comentário
                  updatePostCard(post.id);

                } catch (error) {
                  console.error('Erro ao excluir comentário:', error);
                  alert('Erro ao excluir comentário: ' + error.message);
                }
              });
            }
          }
        });

        // Event listeners para nomes de usuários nos comentários (tornar clicáveis)
        const commentUsernames = postCard.querySelectorAll('.post-caption .username[data-user-id]');
        commentUsernames.forEach(username => {
          username.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = username.getAttribute('data-user-id');
            if (userId) {
              window.location.href = `profile.html?user=${userId}`;
            }
          });
        });

      } catch (error) {
        console.error('Erro render:', error);
      }
    }

    async function updatePostCard(postId) {
      const postCard = document.querySelector(`[data-post-id="${postId}"]`);
      if (!postCard) return;

      const { count: likesCount } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('publication_id', postId);

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

      const { data: comments } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('publication_id', postId)
        .order('created_at', { ascending: false })
        .limit(2);

      const likesElement = postCard.querySelector('.post-likes');
      if (likesElement) {
        likesElement.textContent = `${likesCount || 0} curtida${likesCount !== 1 ? 's' : ''}`;
      }

      const likeBtn = postCard.querySelector('.btn-like');
      if (likeBtn) {
        likeBtn.textContent = userLiked ? '❤️' : '🤍';
        if (userLiked) {
          likeBtn.classList.add('liked');
        } else {
          likeBtn.classList.remove('liked');
        }
      }

      // Remove TODOS os elementos de comentários existentes para evitar duplicação
      const allCommentsPreview = postCard.querySelectorAll('.post-comments-preview');
      allCommentsPreview.forEach(preview => preview.remove());

      if (comments && comments.length > 0) {
        const postInfo = postCard.querySelector('.post-info');
        const dateElement = postInfo.querySelector('.post-date');

        const commentsHTML = comments.map(c => {
          const isCommentOwner = currentUser && c.user_id === currentUser.id;
          return `
            <div class="post-caption" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <div style="flex: 1;">
                <span class="username" data-user-id="${c.user_id}" style="cursor: pointer; font-weight: bold;">${c.profiles.username}</span>: ${c.content}
              </div>
              ${isCommentOwner ? `
                <div class="comment-options" style="position: relative;">
                  <button class="btn-comment-options" style="background: none; border: none; cursor: pointer; font-size: 18px; padding: 0 4px;">⋮</button>
                  <div class="comment-options-menu hidden" style="position: absolute; right: 0; top: 100%; background: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 10; min-width: 150px;">
                    <button class="comment-option-item delete" data-comment-id="${c.id}" style="width: 100%; padding: 8px 12px; border: none; background: none; cursor: pointer; text-align: left; display: flex; align-items: center; gap: 8px; color: #ed4956;">
                      <span class="icon">🗑️</span>
                      Excluir comentário
                    </button>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');

        const commentsDiv = document.createElement('div');
        commentsDiv.className = 'post-comments-preview';
        commentsDiv.innerHTML = commentsHTML;

        dateElement.before(commentsDiv);

        // Adicionar event listeners para os botões de opções dos comentários
        const commentOptionsButtons = commentsDiv.querySelectorAll('.btn-comment-options');
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

                  // Atualizar o post após excluir o comentário
                  updatePostCard(postId);

                } catch (error) {
                  console.error('Erro ao excluir comentário:', error);
                  alert('Erro ao excluir comentário: ' + error.message);
                }
              });
            }
          }
        });

        // Event listeners para nomes de usuários nos comentários (tornar clicáveis)
        const commentUsernames = commentsDiv.querySelectorAll('.username[data-user-id]');
        commentUsernames.forEach(username => {
          username.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = username.getAttribute('data-user-id');
            if (userId) {
              window.location.href = `profile.html?user=${userId}`;
            }
          });
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
    }

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
    loadPosts();
  });
});