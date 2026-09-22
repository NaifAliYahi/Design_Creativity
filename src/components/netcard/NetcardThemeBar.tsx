import type { NetcardThemeId } from '../../lib/netcard/catalog-types';

const THEMES: { id: NetcardThemeId; title: string }[] = [
  { id: 'brand', title: 'هوية كروت الشبكات' },
  { id: 'odoo', title: 'هوية أودو' },
  { id: 'teal', title: 'أخضر مهني' },
  { id: 'navy', title: 'كحلي رمادي' },
];

type NetcardThemeBarProps = {
  theme: NetcardThemeId;
  onChange: (theme: NetcardThemeId) => void;
  templateCount: number;
  selectedCount: number;
};

export function NetcardThemeBar({ theme, onChange, templateCount, selectedCount }: NetcardThemeBarProps) {
  const cycle = () => {
    const i = THEMES.findIndex((t) => t.id === theme);
    onChange(THEMES[(i + 1) % THEMES.length]!.id);
  };

  return (
    <header className="nc-studio-header">
      <div className="nc-header-brand">
        <div className="nc-brand-mark" aria-hidden>
          🎨
        </div>
        <div>
          <span className="nc-eyebrow">نظام إدارة وتصميم متكامل</span>
          <h1>نظام كروت الشبكات</h1>
          <p className="nc-header-tagline">اختر القوالب، صمّم مرة واحدة، ثم نزّل للعميل</p>
        </div>
      </div>
      <div className="nc-header-actions">
        <div className="nc-header-stats">
          <span>
            <b>{templateCount}</b> قالب
          </span>
          <span className="nc-stat-selected">
            <b>{selectedCount}</b> محدد
          </span>
        </div>
        <div className="nc-theme-switcher" role="group" aria-label="ألوان الهوية">
          <span>ألوان النظام</span>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`nc-theme-dot ${theme === t.id ? 'is-active' : ''}`}
              data-theme={t.id}
              title={t.title}
              onClick={() => onChange(t.id)}
            />
          ))}
          <button type="button" className="nc-theme-cycle" onClick={cycle}>
            تغيير اللون
          </button>
        </div>
      </div>
    </header>
  );
}
