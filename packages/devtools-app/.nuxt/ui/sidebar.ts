const side = [
  "left",
  "right"
] as const

const collapsible = [
  "offcanvas",
  "icon",
  "none"
] as const

const variant = [
  "sidebar",
  "floating",
  "inset"
] as const

export default {
  "slots": {
    "root": "peer [--sidebar-width:16rem] [--sidebar-width-icon:4rem]",
    "gap": "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
    "container": "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear lg:flex",
    "inner": "flex size-full flex-col overflow-hidden divide-y divide-default",
    "header": "flex items-center gap-1.5 overflow-hidden px-4 min-h-(--ui-header-height)",
    "wrapper": "min-w-0 flex-1",
    "title": "text-highlighted font-semibold truncate",
    "description": "text-muted text-sm truncate",
    "actions": "flex items-center gap-1.5 shrink-0",
    "close": "",
    "body": "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4",
    "footer": "flex items-center gap-1.5 overflow-hidden p-4",
    "rail": [
      "absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-px lg:flex hover:after:bg-(--ui-border-accented)",
      "after:transition-colors"
    ]
  },
  "variants": {
    "side": {
      "left": {
        "container": "left-0 border-e border-default",
        "rail": "end-0 translate-x-1/2"
      },
      "right": {
        "container": "right-0 border-s border-default",
        "rail": "-start-px -translate-x-1/2"
      }
    },
    "collapsible": {
      "offcanvas": {
        "root": "group/sidebar hidden lg:block",
        "gap": "data-[state=collapsed]:w-0"
      },
      "icon": {
        "root": "group/sidebar hidden lg:block",
        "gap": "data-[state=collapsed]:w-(--sidebar-width-icon)",
        "container": "data-[state=collapsed]:w-(--sidebar-width-icon)",
        "actions": "group-data-[state=collapsed]/sidebar:hidden",
        "body": "group-data-[state=collapsed]/sidebar:overflow-hidden"
      },
      "none": {
        "root": "h-full w-(--sidebar-width)"
      }
    },
    "variant": {
      "sidebar": {},
      "floating": {
        "container": "p-4 border-transparent",
        "inner": "rounded-lg ring ring-default shadow-lg",
        "rail": "inset-y-4"
      },
      "inset": {
        "container": "py-4 border-transparent",
        "inner": "divide-transparent",
        "rail": "inset-y-4"
      }
    }
  },
  "compoundVariants": [
    {
      "side": "left" as typeof side[number],
      "collapsible": [
        "offcanvas" as typeof collapsible[number],
        "icon" as typeof collapsible[number]
      ],
      "class": {
        "rail": "cursor-w-resize data-[state=collapsed]:cursor-e-resize"
      }
    },
    {
      "side": "right" as typeof side[number],
      "collapsible": [
        "offcanvas" as typeof collapsible[number],
        "icon" as typeof collapsible[number]
      ],
      "class": {
        "rail": "cursor-e-resize data-[state=collapsed]:cursor-w-resize"
      }
    },
    {
      "side": "left" as typeof side[number],
      "collapsible": "none" as typeof collapsible[number],
      "class": {
        "root": "border-e border-default"
      }
    },
    {
      "side": "right" as typeof side[number],
      "collapsible": "none" as typeof collapsible[number],
      "class": {
        "root": "border-s border-default"
      }
    },
    {
      "side": "left" as typeof side[number],
      "collapsible": "offcanvas" as typeof collapsible[number],
      "class": {
        "container": "data-[state=collapsed]:-left-(--sidebar-width)"
      }
    },
    {
      "side": "right" as typeof side[number],
      "collapsible": "offcanvas" as typeof collapsible[number],
      "class": {
        "container": "data-[state=collapsed]:-right-(--sidebar-width)"
      }
    },
    {
      "variant": "floating" as typeof variant[number],
      "collapsible": "icon" as typeof collapsible[number],
      "class": {
        "gap": "data-[state=collapsed]:w-[calc(var(--sidebar-width-icon)+--spacing(8))]",
        "container": "data-[state=collapsed]:w-[calc(var(--sidebar-width-icon)+--spacing(8)+2px)]"
      }
    },
    {
      "variant": "floating" as typeof variant[number],
      "collapsible": "none" as typeof collapsible[number],
      "class": {
        "root": "p-4 border-0"
      }
    },
    {
      "variant": "inset" as typeof variant[number],
      "collapsible": "none" as typeof collapsible[number],
      "class": {
        "root": "py-4 border-0"
      }
    },
    {
      "variant": "floating" as typeof variant[number],
      "side": "left" as typeof side[number],
      "class": {
        "rail": "end-4"
      }
    },
    {
      "variant": "floating" as typeof variant[number],
      "side": "right" as typeof side[number],
      "class": {
        "rail": "start-[calc(--spacing(4)-1px)]"
      }
    }
  ]
}