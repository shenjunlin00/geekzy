interface Props {
  available: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export function TagPicker({ available, selected, onChange }: Props) {
  if (available.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        暂无可选标签。请到后台 → 标签设置 中添加常用标签。
      </p>
    );
  }
  const toggle = (t: string) => {
    if (selected.includes(t)) onChange(selected.filter((x) => x !== t));
    else onChange([...selected, t]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {available.map((t) => {
        const on = selected.includes(t);
        return (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              on
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            #{t}
          </button>
        );
      })}
    </div>
  );
}
