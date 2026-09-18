import Link from "next/link";

/*
  One nav across the settings screens, so Account and Security are two tabs of
  the same place rather than two pages a visitor has to know the URLs of. The
  active tab is passed in by the page rather than read from the pathname,
  because these are server components and the page already knows which it is.
*/
const TABS = [
  { key: "account", label: "Account", href: "/settings/account" },
  { key: "security", label: "Security", href: "/settings/security" },
] as const;

export function SettingsNav({ active }: { active: "account" | "security" }) {
  return (
    <nav aria-label="Settings" className="flex gap-1 border-b border-separator">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={
              "inline-flex items-center min-h-11 px-4 -mb-px border-b-2 text-subhead font-medium " +
              "transition-[color,border-color] duration-150 " +
              (isActive
                ? "border-accent text-label"
                : "border-transparent text-secondary [@media(hover:hover)_and_(pointer:fine)]:hover:text-label")
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
