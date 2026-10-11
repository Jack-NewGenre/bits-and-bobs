"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CornerDownLeft,
  Dices,
  History,
  House,
  type LucideIcon,
} from "lucide-react";

import {
  AVAILABLE_TOOLS,
  TOOL_CATEGORIES,
  matchScore,
  randomTool,
  toolKeywords,
} from "@/lib/tools";
import { useCommandMenu } from "@/hooks/use-command-menu";
import { useModifierKey } from "@/hooks/use-modifier-key";
import { THEME_OPTIONS } from "@/components/atoms/theme-toggle";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

interface Page {
  name: string;
  icon: LucideIcon;
  keywords: string[];
  href: () => string;
}

const PAGES: Page[] = [
  { name: "Home", icon: House, keywords: ["all tools", "catalogue"], href: () => "/" },
  {
    name: "Changelog",
    icon: History,
    keywords: ["what's new", "releases"],
    href: () => "/changelog",
  },
  {
    name: "I'm feeling lucky",
    icon: Dices,
    keywords: ["random tool", "surprise"],
    href: () => randomTool().href,
  },
];

const TOOL_GROUPS = TOOL_CATEGORIES.map((category) => ({
  ...category,
  tools: AVAILABLE_TOOLS.filter((tool) => tool.category === category.id),
})).filter(({ tools }) => tools.length > 0);

const OPEN_HINT = (
  <CommandShortcut className="opacity-0 group-data-selected/command-item:opacity-100">
    <ArrowUpRight />
  </CommandShortcut>
);

/**
 * ⌘K or Ctrl+K from anywhere: type a few letters of a tool, a page or a theme
 * and press Enter to go there. Ranked the same way as the home page search.
 */
export function CommandMenu() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const modifier = useModifierKey();
  const [open, setOpen] = useCommandMenu();

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command menu"
      description="Jump to a tool, a page or a theme."
      className="sm:max-w-xl"
    >
      <Command loop filter={(value, search, keywords) => matchScore(search, value, keywords)}>
        <CommandInput placeholder="Search tools, pages and themes…" className="h-10" />
        <CommandList className="max-h-[min(26rem,60vh)]">
          <CommandEmpty>Nothing matches that. Try another word.</CommandEmpty>
          <CommandGroup heading="Pages">
            {PAGES.map(({ name, icon: Icon, keywords, href }) => (
              <CommandItem
                key={name}
                value={name}
                keywords={keywords}
                onSelect={() => run(() => router.push(href()))}
              >
                <Icon />
                {name}
                {OPEN_HINT}
              </CommandItem>
            ))}
          </CommandGroup>
          {TOOL_GROUPS.map(({ id, name: heading, tools }) => (
            <CommandGroup key={id} heading={heading}>
              {tools.map((tool) => (
                <CommandItem
                  key={tool.slug}
                  value={tool.name}
                  keywords={toolKeywords(tool)}
                  onSelect={() => run(() => router.push(tool.href))}
                >
                  <tool.icon />
                  <span className="shrink-0">{tool.name}</span>
                  <span className="text-muted-foreground hidden truncate text-xs sm:inline">
                    {tool.description}
                  </span>
                  {OPEN_HINT}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandGroup heading="Theme">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <CommandItem
                key={value}
                value={`${label} theme`}
                keywords={["appearance", "mode"]}
                onSelect={() => run(() => setTheme(value))}
              >
                <Icon />
                {label} theme
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        <div className="text-muted-foreground -mx-1 mt-1 -mb-1 hidden items-center gap-4 border-t px-4 py-2.5 text-xs sm:flex">
          <span className="flex items-center gap-1.5">
            <KbdGroup>
              <Kbd aria-label="Up">
                <ArrowUp />
              </Kbd>
              <Kbd aria-label="Down">
                <ArrowDown />
              </Kbd>
            </KbdGroup>
            Move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd aria-label="Enter">
              <CornerDownLeft />
            </Kbd>
            Open
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd>
            Close
          </span>
          {modifier && (
            <span className="ml-auto flex items-center gap-1.5">
              <KbdGroup>
                <Kbd>{modifier.trim()}</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
              Toggle
            </span>
          )}
        </div>
      </Command>
    </CommandDialog>
  );
}
