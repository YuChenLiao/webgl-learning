/**
 * 后处理开关：在「L3 直出」与「L4 后处理链」之间切换。
 *
 * 这是本关最直观的一个对照装置。两个状态共用完全相同的场景 Pass 与离屏目标，
 * 唯一变动的变量就是 uPostAmount —— 所以画面差异可以确定全部来自后处理，
 * 而不是来自别的地方。
 *
 * DOM 交互单独成文件，是为了让 render/ 里只放渲染资源，不混界面逻辑。
 */
export default function createPostToggle({ onChange, initial = true } = {}) {
  const LABELS = { true: 'L4 · 后处理链', false: 'L3 · 直出' };

  const button = document.getElementById('post-toggle');
  const label = document.getElementById('post-toggle-label');
  let active = initial;

  function paint() {
    if (!button) return;
    button.setAttribute('aria-pressed', String(active));
    if (label) label.textContent = LABELS[active];
  }

  function setActive(next) {
    if (next === active) return;
    active = next;
    paint();
    if (onChange) onChange(active);
  }

  if (button) {
    button.addEventListener('click', () => setActive(!active));
  }

  // P 或空格也能切，调参时不用把手从鼠标上挪开
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key !== 'p' && e.key !== 'P' && e.key !== ' ') return;
    e.preventDefault();
    setActive(!active);
  });

  paint();

  return { isActive: () => active, setActive };
}
