// Phase 13: Lessons Index Page Logic (Schema Compliant)
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('lessons-grid-container');
  const skeleton = document.getElementById('lessons-skeleton');
  if (!container) return;

  try {
    const res = await fetch('data/lessons/index.json');
    const data = await res.json();
    const slugs = data.manifests || []; // Array of strings per schema

    // Fetch manifests in parallel to get titles/JLPT
    const manifests = await Promise.all(slugs.map(async (slug) => {
      try {
        const r = await fetch(`data/lessons/${slug}/manifest.json`);
        if (!r.ok) throw new Error('Not found');
        return await r.json();
      } catch (e) {
        const num = parseInt(slug.split('-')[1], 10);
        return { slug, lessonNumber: num, title: { en: `Lesson ${num}` }, jlpt: num <= 25 ? 'N5' : 'N4' };
      }
    }));

    if (skeleton) skeleton.style.display = 'none';

    let progress = { completedLessons: 0, currentLesson: 1 };
    try { progress = JSON.parse(localStorage.getItem('nihongo_progress') || '{}'); } catch(e) {}

    const book1 = manifests.filter(m => Number(m.lessonNumber) <= 25);
    const book2 = manifests.filter(m => Number(m.lessonNumber) > 25);

    renderBookSection('Book I — N5 (Lessons 1–25)', book1, container, progress);
    renderBookSection('Book II — N4 (Lessons 26–50)', book2, container, progress);

  } catch (err) {
    console.error('[Lessons] Failed:', err);
    if (skeleton) skeleton.innerHTML = `<p style="padding:2rem;text-align:center;color:var(--danger);">Failed to load lessons.</p>`;
  }
});

function renderBookSection(title, lessons, container, progress) {
  if (!lessons || lessons.length === 0) return;
  const section = document.createElement('section');
  section.style.marginBottom = 'var(--s-8, 2rem)';
  const header = document.createElement('h2');
  header.textContent = title;
  header.style.cssText = 'font-size:var(--fs-2xl);font-weight:700;margin-bottom:var(--s-4);color:var(--ink);';
  section.appendChild(header);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--s-4);';

  lessons.forEach(m => {
    const num = Number(m.lessonNumber);
    const isCompleted = progress.completedLessons >= num;
    const isCurrent = num === (progress.currentLesson || 1);
    const statusText = isCompleted ? 'Completed' : (isCurrent ? 'In progress' : 'Not started');
    const statusColor = isCompleted ? 'var(--success)' : (isCurrent ? 'var(--primary)' : 'var(--ink-muted)');
    const bgColor = isCompleted ? 'var(--success)' : (isCurrent ? 'var(--primary)' : 'var(--bg)');
    const textColor = (isCompleted || isCurrent) ? '#fff' : 'var(--ink)';

    const card = document.createElement('a');
    card.href = `lesson.html?lesson=${m.slug}`;
    card.className = 'lesson-card';
    card.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:var(--s-4);display:grid;grid-template-columns:56px 1fr;gap:var(--s-3);align-items:center;text-decoration:none;color:inherit;';
    
    card.innerHTML = `
      <div style="width:56px;height:56px;display:flex;align-items:center;justify-content:center;border-radius:var(--r-md);background:${bgColor};color:${textColor};font-size:var(--fs-2xl);font-weight:700;">${num}</div>
      <div>
        <h3 style="margin:0;font-size:var(--fs-lg);font-weight:600;color:var(--ink);">${m.title?.en || 'Lesson ' + num}</h3>
        <p style="margin:0.25rem 0 0;font-size:var(--fs-sm);color:${statusColor};">${statusText}</p>
        <div style="display:flex;gap:var(--s-2);margin-top:var(--s-1);">
          <span style="font-size:var(--fs-xs);padding:var(--s-1) var(--s-2);border-radius:var(--r-sm);background:var(--primary-glow);color:var(--primary);">${m.jlpt || 'N5'}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
  section.appendChild(grid);
  container.appendChild(section);
}
