// Phase 13: Bulletproof Lessons Logic
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Lessons] Script loaded');

  // 1. Find and hide ANY skeleton element
  const skeletons = document.querySelectorAll('[class*="skeleton"], [id*="skeleton"]');
  skeletons.forEach(el => el.style.display = 'none');
  console.log(`[Lessons] Hidden ${skeletons.length} skeleton elements`);

  // 2. Find the main container to inject content
  // Try specific ID first, then main tag, then shell-main
  let container = document.getElementById('lessons-grid-container') || 
                  document.querySelector('main.shell-main') || 
                  document.querySelector('main');

  if (!container) {
    alert('Error: Could not find main container to load lessons.');
    return;
  }

  // 3. Get progress
  let progress = { completedLessons: 0, currentLesson: 1 };
  try {
    progress = JSON.parse(localStorage.getItem('nihongo_progress') || '{}');
  } catch(e) {}

  // 4. Generate lessons 1-50
  const allLessons = [];
  for (let i = 1; i <= 50; i++) {
    allLessons.push({
      lessonNumber: i,
      slug: `minna-${String(i).padStart(3, '0')}`,
      title: { en: `Lesson ${i}`, bn: `পাঠ ${i}` },
      jlpt: i <= 25 ? 'N5' : 'N4'
    });
  }

  // 5. Create sections
  const book1 = allLessons.filter(m => m.lessonNumber <= 25);
  const book2 = allLessons.filter(m => m.lessonNumber > 25);

  // Clear existing content in container if it's just the skeleton wrapper
  if (container.children.length <= 2) {
    container.innerHTML = ''; 
  }

  renderBookSection('Book I — N5 (Lessons 1–25)', book1, container, progress);
  renderBookSection('Book II — N4 (Lessons 26–50)', book2, container, progress);
  
  console.log('[Lessons] Rendering complete');
});

function renderBookSection(title, lessons, container, progress) {
  const section = document.createElement('section');
  section.style.cssText = 'margin-bottom: 2rem; padding: 0 1rem;';

  const header = document.createElement('h2');
  header.textContent = title;
  header.style.cssText = 'font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: var(--ink, #000);';
  section.appendChild(header);

  const grid = document.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;';

  lessons.forEach(m => {
    const num = m.lessonNumber;
    const isCompleted = progress.completedLessons >= num;
    const isCurrent = num === (progress.currentLesson || 1);
    
    const statusText = isCompleted ? 'Completed' : (isCurrent ? 'In progress' : 'Not started');
    const statusColor = isCompleted ? 'var(--success, #10b981)' : (isCurrent ? 'var(--primary, #5B5BF0)' : 'var(--ink-muted, #666)');
    const bgColor = isCompleted ? 'var(--success, #10b981)' : (isCurrent ? 'var(--primary, #5B5BF0)' : 'var(--bg, #f5f5f5)');
    const textColor = (isCompleted || isCurrent) ? '#fff' : 'var(--ink, #000)';

    const card = document.createElement('a');
    card.href = `lesson.html?lesson=${m.slug}`;
    card.style.cssText = 'background: var(--surface, #fff); border: 1px solid var(--border, #eee); border-radius: 0.75rem; padding: 1rem; display: grid; grid-template-columns: 56px 1fr; gap: 1rem; align-items: center; text-decoration: none; color: inherit; transition: transform 0.2s;';
    
    card.innerHTML = `
      <div style="width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; background: ${bgColor}; color: ${textColor}; font-size: 1.5rem; font-weight: 700;">${num}</div>
      <div>
        <h3 style="margin: 0; font-size: 1.125rem; font-weight: 600; color: var(--ink, #000);">${m.title.en}</h3>
        <p style="margin: 0.25rem 0 0; font-size: 0.875rem; color: ${statusColor};">${statusText}</p>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
          <span style="font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 0.25rem; background: var(--primary-glow, #eef); color: var(--primary, #5B5BF0);">${m.jlpt}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  section.appendChild(grid);
  container.appendChild(section);
}
