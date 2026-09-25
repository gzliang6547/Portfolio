'use strict';
const insights = {
  paloom: {
    inbox: ['01 / UNIFIED INBOX', 'Platform plugins feed a shared queue. Postgres row-level security separates tenants, while classification helps keep AI spend focused on messages worth answering.'],
    ai: ['02 / AI DECISION LAYER', 'TypeScript workers use OpenRouter to choose models for the task. Persona and language settings guide each draft; an evaluation harness measures quality alongside cost.'],
    send: ['03 / HUMAN-REVIEWED SEND', 'Owners review and edit replies before sending from web, mobile, or ChatGPT. The MCP integration checks explicit permissions and uses a database-level claim to guard against repeated sends.']
  },
  health: {
    encrypt: ['01 / ENCRYPT', 'Health records are AES-encrypted before storage. Sensitive clinical data stays off-chain; blockchain hashes provide an integrity check.'],
    store: ['02 / STORE', 'Encrypted records are stored on IPFS through Pinata. The application coordinates retrieval, while active, unexpired patient consent governs professional access.'],
    verify: ['03 / VERIFY', 'A custom Solidity contract anchors integrity hashes on Ethereum’s Sepolia test network. The application checks the hash on retrieval to detect changes to a record.']
  }
};
document.querySelectorAll('[data-diagram]').forEach(diagram => {
  diagram.querySelectorAll('button[data-node]').forEach(button => {
    button.addEventListener('click', () => {
      diagram.querySelectorAll('button[data-node]').forEach(node => {
        const selected = node === button;
        node.classList.toggle('active', selected);
        node.setAttribute('aria-pressed', String(selected));
      });
      const [title, description] = insights[diagram.dataset.diagram][button.dataset.node];
      const panel = diagram.closest('.project-system').querySelector('.system-insight');
      panel.querySelector('.eyebrow').textContent = title;
      panel.querySelector('p').textContent = description;
    });
  });
});
{
  const navLinks = document.querySelectorAll('.site-header nav a');
  const sections = [...document.querySelectorAll('#work, #approach, #about, #contact')];
  let pending = false;
  const updateNavigation = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      const current = sections.filter(section => section.getBoundingClientRect().top <= innerHeight * .3).at(-1);
      navLinks.forEach(link => {
        const active = current && link.getAttribute('href') === '#' + current.id;
        link.classList.toggle('current', Boolean(active));
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      pending = false;
    });
  };
  addEventListener('scroll', updateNavigation, {passive:true});
  addEventListener('resize', updateNavigation);
  updateNavigation();
}
