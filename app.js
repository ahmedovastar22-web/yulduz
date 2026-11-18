const form = document.getElementById('idea-form');
const idea = document.getElementById('idea');
const status = document.getElementById('status');
try { idea.value = localStorage.getItem('ai-cloud-studio-idea') || ''; } catch (_) {}
form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    localStorage.setItem('ai-cloud-studio-idea', idea.value);
    status.textContent = 'G‘oya ushbu brauzerda saqlandi.';
  } catch (_) {
    status.textContent = 'Saqlashning imkoni bo‘lmadi. Brauzer sozlamalarini tekshiring.';
  }
});
