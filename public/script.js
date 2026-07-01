// script.js
// Lógica del álbum: trae los recuerdos guardados en la base de datos,
// dibuja el libro, y maneja la subida/edición/borrado de fotos y notas.

(() => {
  const state = {
    photos: [],
    index: 0, // índice de la página "izquierda" visible actualmente
    editing: null, // id del recuerdo en edición, o null si es uno nuevo
    selectedFile: null
  };

  // --- Referencias DOM ---
  const coverEl = document.getElementById('cover');
  const bookEl = document.getElementById('book');
  const emptyStateEl = document.getElementById('emptyState');
  const spreadEl = document.getElementById('spread');
  const ribbonNavEl = document.getElementById('ribbonNav');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  const modal = document.getElementById('uploadModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const uploadForm = document.getElementById('uploadForm');
  const dropzone = document.getElementById('dropzone');
  const photoInput = document.getElementById('photoInput');
  const dropzoneText = document.getElementById('dropzoneText');
  const previewImg = document.getElementById('previewImg');
  const titleInput = document.getElementById('titleInput');
  const noteInput = document.getElementById('noteInput');
  const dateInput = document.getElementById('dateInput');
  const editIdInput = document.getElementById('editId');
  const formError = document.getElementById('formError');
  const deleteBtn = document.getElementById('deleteBtn');
  const saveBtn = document.getElementById('saveBtn');
  const toastEl = document.getElementById('toast');

  const openBookBtn = document.getElementById('openBookBtn');
  const closeBookBtn = document.getElementById('closeBookBtn');
  const addPhotoBtn = document.getElementById('addPhotoBtn');
  const emptyAddBtn = document.getElementById('emptyAddBtn');

  const TILTS = ['-2deg', '-1deg', '1deg', '2deg'];

  function isMobile() {
    return window.matchMedia('(max-width: 760px)').matches;
  }

  function step() {
    return isMobile() ? 1 : 2;
  }

  // --- Utilidades ---
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.add('hidden'), 2600);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${parseInt(d, 10)} de ${meses[parseInt(m, 10) - 1]} de ${y}`;
  }

  // --- Carga de datos ---
  async function loadPhotos() {
    try {
      const res = await fetch('/api/photos');
      if (!res.ok) throw new Error('No se pudieron cargar los recuerdos.');
      state.photos = await res.json();
      renderAll();
    } catch (err) {
      showToast(err.message);
    }
  }

  // --- Render principal ---
  function renderAll() {
    if (state.photos.length === 0) {
      emptyStateEl.classList.remove('hidden');
      bookEl.classList.add('hidden');
      return;
    }
    emptyStateEl.classList.add('hidden');

    // Mantener el índice dentro de rango si se borró una foto
    const maxIndex = Math.max(0, state.photos.length - 1);
    if (state.index > maxIndex) {
      state.index = Math.floor(maxIndex / step()) * step();
    }

    renderSpread();
    renderRibbon();
  }

  function buildPageEl(photo, side, pageNumber) {
    const page = document.createElement('div');
    page.className = `page ${side}`;

    if (!photo) {
      page.classList.add('empty-page');
      page.innerHTML = `
        <p>Una página en blanco,<br>lista para un nuevo recuerdo.</p>
        <button type="button" class="mini-add">+ Agregar foto</button>
      `;
      page.querySelector('.mini-add').addEventListener('click', () => openModal());
      return page;
    }

    const tilt = TILTS[photo.id % TILTS.length];
    const frame = document.createElement('div');
    frame.className = 'photo-frame';
    frame.style.setProperty('--tilt', tilt);
    frame.innerHTML = `
      <div class="photo-img-wrap">
        <img src="/uploads/${encodeURIComponent(photo.filename)}" alt="${photo.title ? escapeHtml(photo.title) : 'Foto del álbum'}" />
      </div>
      <div class="photo-caption-space"></div>
    `;
    page.appendChild(frame);

    if (photo.title) {
      const h = document.createElement('h3');
      h.className = 'page-title';
      h.textContent = photo.title;
      page.appendChild(h);
    }

    if (photo.date_taken) {
      const d = document.createElement('div');
      d.className = 'page-date';
      d.textContent = formatDate(photo.date_taken);
      page.appendChild(d);
    }

    const note = document.createElement('p');
    note.className = 'page-note';
    note.textContent = photo.note;
    page.appendChild(note);

    const editLink = document.createElement('button');
    editLink.type = 'button';
    editLink.className = 'page-edit';
    editLink.textContent = 'editar este recuerdo';
    editLink.addEventListener('click', () => openModal(photo));
    page.appendChild(editLink);

    const num = document.createElement('span');
    num.className = 'page-number';
    num.textContent = pageNumber;
    page.appendChild(num);

    return page;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderSpread() {
    spreadEl.innerHTML = '';
    const leftPhoto = state.photos[state.index];
    const rightPhoto = isMobile() ? null : state.photos[state.index + 1];

    spreadEl.appendChild(buildPageEl(leftPhoto, 'left', state.index + 1));
    if (!isMobile()) {
      // En desktop, mostrar página derecha (o página vacía invitando a agregar)
      spreadEl.appendChild(buildPageEl(rightPhoto, 'right', state.index + 2));
    }

    prevBtn.disabled = state.index <= 0;
    const lastPossibleStart = Math.max(0, state.photos.length - 1);
    nextBtn.disabled = state.index + step() > lastPossibleStart && !(state.index + 1 < state.photos.length && isMobile());
    // Recalcular con lógica simple: deshabilitar "siguiente" solo si ya no hay más fotos después
    nextBtn.disabled = state.index + step() >= state.photos.length && state.photos[state.index + 1] === undefined;
    if (!isMobile()) {
      nextBtn.disabled = state.index + 2 >= state.photos.length;
    } else {
      nextBtn.disabled = state.index + 1 >= state.photos.length;
    }
  }

  function renderRibbon() {
    ribbonNavEl.innerHTML = '';
    const s = step();
    const totalSpreads = Math.ceil(state.photos.length / s);
    for (let i = 0; i < totalSpreads; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'ribbon-dot' + (i * s === state.index ? ' active' : '');
      dot.setAttribute('aria-label', `Ir a la página ${i * s + 1}`);
      dot.addEventListener('click', () => goTo(i * s));
      ribbonNavEl.appendChild(dot);
    }
  }

  function goTo(newIndex) {
    newIndex = Math.max(0, Math.min(newIndex, Math.max(0, state.photos.length - 1)));
    if (newIndex === state.index) return;
    const reverse = newIndex < state.index;

    spreadEl.classList.add('flip-out');
    if (reverse) spreadEl.classList.add('flip-out-reverse');

    setTimeout(() => {
      state.index = newIndex;
      renderSpread();
      renderRibbon();
      spreadEl.classList.remove('flip-out', 'flip-out-reverse');
      spreadEl.classList.add('flip-in');
      setTimeout(() => spreadEl.classList.remove('flip-in'), 340);
    }, 240);
  }

  prevBtn.addEventListener('click', () => goTo(state.index - step()));
  nextBtn.addEventListener('click', () => goTo(state.index + step()));

  document.addEventListener('keydown', (e) => {
    if (bookEl.classList.contains('hidden') || !modal.classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') goTo(state.index - step());
    if (e.key === 'ArrowRight') goTo(state.index + step());
  });

  // Deslizar con el dedo en móvil
  let touchStartX = null;
  spreadEl.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  spreadEl.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 50) {
      if (diff < 0) goTo(state.index + step());
      else goTo(state.index - step());
    }
    touchStartX = null;
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (!bookEl.classList.contains('hidden')) renderSpread();
  });

  // --- Navegación entre portada / libro ---
  function openBook() {
    coverEl.classList.add('hidden');
    if (state.photos.length === 0) {
      emptyStateEl.classList.remove('hidden');
      bookEl.classList.add('hidden');
    } else {
      bookEl.classList.remove('hidden');
      bookEl.setAttribute('aria-hidden', 'false');
    }
  }

  openBookBtn.addEventListener('click', openBook);
  closeBookBtn.addEventListener('click', () => {
    bookEl.classList.add('hidden');
    coverEl.classList.remove('hidden');
  });
  emptyAddBtn.addEventListener('click', () => openModal());

  // --- Modal: abrir / cerrar ---
  function openModal(photo) {
    uploadForm.reset();
    formError.classList.add('hidden');
    previewImg.classList.add('hidden');
    dropzoneText.textContent = 'Arrastra una foto aquí, o toca para elegirla';
    state.selectedFile = null;
    photoInput.required = true;

    if (photo) {
      state.editing = photo.id;
      editIdInput.value = photo.id;
      modalTitle.textContent = 'Editar este recuerdo';
      titleInput.value = photo.title || '';
      noteInput.value = photo.note || '';
      dateInput.value = photo.date_taken || '';
      deleteBtn.classList.remove('hidden');
      saveBtn.textContent = 'Guardar cambios';
      photoInput.required = false;
      dropzoneText.textContent = 'La foto ya está guardada. Puedes cambiar el título, la nota o la fecha.';
      previewImg.src = `/uploads/${encodeURIComponent(photo.filename)}`;
      previewImg.classList.remove('hidden');
    } else {
      state.editing = null;
      editIdInput.value = '';
      modalTitle.textContent = 'Agregar un recuerdo';
      deleteBtn.classList.add('hidden');
      saveBtn.textContent = 'Guardar en el álbum';
    }

    modal.classList.remove('hidden');
    noteInput.focus();
  }

  function closeModal() {
    modal.classList.add('hidden');
    state.editing = null;
    state.selectedFile = null;
  }

  addPhotoBtn.addEventListener('click', () => openModal());
  closeModalBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  // --- Dropzone: selección y arrastre de archivo ---
  dropzone.addEventListener('click', (e) => {
    if (e.target !== photoInput) photoInput.click();
  });

  photoInput.addEventListener('change', () => {
    const file = photoInput.files[0];
    if (file) handleFileSelected(file);
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
      state.selectedFile = file;
      handleFileSelected(file);
    }
  });

  function handleFileSelected(file) {
    if (!file.type.startsWith('image/')) {
      formError.textContent = 'Por favor elige un archivo de imagen.';
      formError.classList.remove('hidden');
      return;
    }
    formError.classList.add('hidden');
    state.selectedFile = file;
    dropzoneText.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewImg.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  // --- Guardar (crear o editar) ---
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.classList.add('hidden');

    const note = noteInput.value.trim();
    if (!note) {
      formError.textContent = 'Escribe una nota para este recuerdo.';
      formError.classList.remove('hidden');
      return;
    }

    saveBtn.disabled = true;
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Guardando...';

    try {
      if (state.editing) {
        const res = await fetch(`/api/photos/${state.editing}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: titleInput.value,
            note,
            date: dateInput.value
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo guardar el cambio.');
        showToast('Recuerdo actualizado 💌');
      } else {
        if (!state.selectedFile) {
          formError.textContent = 'Elige una foto para este recuerdo.';
          formError.classList.remove('hidden');
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
          return;
        }
        const formData = new FormData();
        formData.append('photo', state.selectedFile);
        formData.append('title', titleInput.value);
        formData.append('note', note);
        formData.append('date', dateInput.value);

        const res = await fetch('/api/photos', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo guardar la foto.');
        showToast('¡Nuevo recuerdo guardado! 🌷');
      }

      closeModal();
      await loadPhotos();
      if (coverEl.classList.contains('hidden') === false) {
        // Si estábamos en portada (por ejemplo, álbum vacío), abrir el libro
        openBook();
      }
      // Ir a la última página tras agregar
      if (!state.editing) {
        const last = Math.max(0, state.photos.length - 1);
        state.index = isMobile() ? last : (last % 2 === 0 ? last : last - 1);
        renderAll();
      }
    } catch (err) {
      formError.textContent = err.message;
      formError.classList.remove('hidden');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  });

  // --- Eliminar ---
  deleteBtn.addEventListener('click', async () => {
    if (!state.editing) return;
    if (!confirm('¿Seguro que quieres eliminar este recuerdo? No se puede deshacer.')) return;

    try {
      const res = await fetch(`/api/photos/${state.editing}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar.');
      showToast('Recuerdo eliminado.');
      closeModal();
      await loadPhotos();
      if (state.photos.length === 0) {
        bookEl.classList.add('hidden');
        emptyStateEl.classList.remove('hidden');
      }
    } catch (err) {
      formError.textContent = err.message;
      formError.classList.remove('hidden');
    }
  });

  // --- Arranque ---
  loadPhotos();
})();
