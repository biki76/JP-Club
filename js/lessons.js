// Phase 13: Lessons Index Page Logic (Fixed)
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('lessons-grid-container');
  const skeleton = document.getElementById('lessons-skeleton');

  if (!container) {
    console.error('[Lessons] Container not found');
    return;
  }

  try {
    // Fetch index.json directly
    const res = await fetch('data/lessons/index.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    console.log('[Lessons] Raw data:', JSON.stringify(data, null, 2).slice(0, 200));
    
    // Handle different structures
    let manifests = [];
    if (Array.isArray(data)) {
      manifests = data;
    } else if (Array.isArray(data.manifests)) {
      manifests = data.manifests;
    } else if (Array.isArray(data.lessons)) {
      manifests = data.lessons;
    } else {
      throw new Error('index.json has no manifests or lessons array');
    }
    
    console.log(`[Lessons] Loaded ${manifests.length} manifests`);
    if (manifests.length > 0) {
      console.log('[Lessons] First manifest:', manifests[0]);
    }

    // Hide skeleton
    if (skeleton) skeleton.style.display = 'none';

    // Get progress
    let progress = { completedLessons: 0, currentLesson: 1 };
    try {
      progress = JSON.parse(localStorage.getItem('nihongo_progress') || '{}');
    } catch (e) {}

    // Filter books
    const book1 = manifests.filter(m => Number(m.lessonNumber) <= 25);
    const book2 = manifests.filter(m => Number(m.lessonNumber) > 25);

    console.log(`[Lessons] Book1: ${book1.length}, Book2: ${book2.length}`);

    renderBookSection('Book I — N5 (Lessons 1–25)', book1, container, progress);
    renderBookSection('Book II — N4 (Lessons 26–50)', book2, container, progress);

  } catch (err) {
    console.error('[Lessons] Failed:', err);
    if (skeleton) {
      skeleton.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--danger);">
        <p><strong>Failed to load lessons.</strong></p>
        <p style="font-size:0.875rem;margin-top:0.5rem;">${err.message}</p>
        <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1rem;background:var(--primary);color:#fff;border:none;border-radius:0.5rem;cursor:pointer;">Retry</button>
      </div>`;
    }
  }
});

function renderBookSection(title, lessons, container, progress) {
  if (!lessons || lessons.length === 0) {
    console.warn(`[Lessons] ${title} is empty`);
    return;
  }

  const section = document.createElement('section');
  section.style.marginBottom = 'var(--s-8, 2rem)';

  const header = document.createElement('h2');
  header.textContent = title;
  header.style.cssText = 'font-size:var(--fs-2xl);font-weight:700;margin-bottom:var(--s-4);color:var(--ink);';
  section.appendChild(header);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--s-4);';

  lessons.forEach((m, idx) => {
    // Ensure slug is a string
    const slug = typeof m.slug === 'string' ? m.slug : `minna-${String(m.lessonNumber).padStart(3, '0')}`;
    const num = Number(m.lessonNumber);
    const isCompleted = progress.completedLessons >= num;
    const isCurrent = num === (progress.currentLesson || 1);
    
    const statusText = isCompleted ? 'Completed' : (isCurrent ? 'In progress' : 'Not started');
    const statusColor = isCompleted ? 'var(--success)' : (isCurrent ? 'var(--primary)' : 'var(--ink-muted)');
    const bgColor = isCompleted ? 'var(--success)' : (isCurrent ? 'var(--primary)' : 'var(--bg)');
    const textColor = (isCompleted || isCurrent) ? '#fff' : 'var(--ink)';

    const card = document.createElement('a');
    card.href = `lesson.html?lesson=${slug}`;
    card.className = 'lesson-card';
    card.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:var(--s-4);display:grid;grid-template-columns:56px 1fr;gap:var(--s-3);align-items:center;text-decoration:none;color:inherit;';
    
    card.innerHTML = `
      <div style="width:56px;height:56px;display:flex;align-items:center;justify-content:center;border-radius:var(--r-md);background:${bgColor};color:${textColor};font-size:var(--fs-2xl);font-weight:700;">
        ${num}
      </div>
      <div>
        <h3 style="margin:0;font-size:var(--fs-lg);font-weight:600;color:var(--ink);">
          ${m.title?.en || `Lesson ${num}`}
        </h3>
        <p style="margin:0.25rem 0 0;font-size:var(--fs-sm);color:${statusColor};">${statusText}</p>
        <div style="display:flex;gap:var(--s-2);margin-top:var(--s-1);">
          <span style="font-size:var(--fs-xs);padding:var(--s-1) var(--s-2);border-radius:var(--r-sm);background:var(--primary-glow);color:var(--primary);">
            ${m.jlpt || 'N5'}
          </span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  section.appendChild(grid);
  container.appendChild(section);
  console.log(`[Lessons] Rendered ${lessons.length} cards for ${title}`);
}
