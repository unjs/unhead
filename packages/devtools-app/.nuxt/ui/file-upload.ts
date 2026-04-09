const color = [
  "primary",
  "secondary",
  "success",
  "info",
  "warning",
  "error",
  "neutral"
] as const

const variant = [
  "area",
  "button"
] as const

const size = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl"
] as const

const layout = [
  "list",
  "grid"
] as const

export default {
  "slots": {
    "root": "relative flex flex-col",
    "base": [
      "w-full flex-1 bg-default border border-default flex flex-col gap-2 items-stretch justify-center rounded-lg focus-visible:outline-2",
      "transition-[background]"
    ],
    "wrapper": "flex flex-col items-center justify-center text-center",
    "icon": "shrink-0",
    "avatar": "shrink-0",
    "label": "font-medium text-default mt-2",
    "description": "text-muted mt-1",
    "actions": "flex flex-wrap gap-1.5 shrink-0 mt-4",
    "files": "",
    "file": "relative",
    "fileLeadingAvatar": "shrink-0",
    "fileWrapper": "flex flex-col min-w-0",
    "fileName": "text-default truncate",
    "fileSize": "text-muted truncate",
    "fileTrailingButton": ""
  },
  "variants": {
    "color": {
      "primary": "",
      "secondary": "",
      "success": "",
      "info": "",
      "warning": "",
      "error": "",
      "neutral": ""
    },
    "variant": {
      "area": {
        "wrapper": "px-4 py-3",
        "base": "p-4"
      },
      "button": {}
    },
    "size": {
      "xs": {
        "base": "text-xs",
        "icon": "size-4",
        "file": "text-xs px-2 py-1 gap-1",
        "fileWrapper": "flex-row gap-1"
      },
      "sm": {
        "base": "text-xs",
        "icon": "size-4",
        "file": "text-xs px-2.5 py-1.5 gap-1.5",
        "fileWrapper": "flex-row gap-1"
      },
      "md": {
        "base": "text-sm",
        "icon": "size-5",
        "file": "text-xs px-2.5 py-1.5 gap-1.5"
      },
      "lg": {
        "base": "text-sm",
        "icon": "size-5",
        "file": "text-sm px-3 py-2 gap-2",
        "fileSize": "text-xs"
      },
      "xl": {
        "base": "text-base",
        "icon": "size-6",
        "file": "text-sm px-3 py-2 gap-2"
      }
    },
    "layout": {
      "list": {
        "root": "gap-2 items-start",
        "files": "flex flex-col w-full gap-2",
        "file": "min-w-0 flex items-center border border-default rounded-md w-full",
        "fileTrailingButton": "ms-auto"
      },
      "grid": {
        "fileWrapper": "hidden",
        "fileLeadingAvatar": "size-full rounded-lg",
        "fileTrailingButton": "absolute -top-1.5 -end-1.5 p-0 rounded-full border-2 border-bg"
      }
    },
    "position": {
      "inside": "",
      "outside": ""
    },
    "dropzone": {
      "true": "border-dashed data-[dragging=true]:bg-elevated/25"
    },
    "interactive": {
      "true": ""
    },
    "highlight": {
      "true": ""
    },
    "multiple": {
      "true": ""
    },
    "disabled": {
      "true": "cursor-not-allowed opacity-75"
    }
  },
  "compoundVariants": [
    {
      "color": "primary" as typeof color[number],
      "class": "focus-visible:outline-primary"
    },
    {
      "color": "secondary" as typeof color[number],
      "class": "focus-visible:outline-secondary"
    },
    {
      "color": "success" as typeof color[number],
      "class": "focus-visible:outline-success"
    },
    {
      "color": "info" as typeof color[number],
      "class": "focus-visible:outline-info"
    },
    {
      "color": "warning" as typeof color[number],
      "class": "focus-visible:outline-warning"
    },
    {
      "color": "error" as typeof color[number],
      "class": "focus-visible:outline-error"
    },
    {
      "color": "primary" as typeof color[number],
      "highlight": true,
      "class": "border-primary"
    },
    {
      "color": "secondary" as typeof color[number],
      "highlight": true,
      "class": "border-secondary"
    },
    {
      "color": "success" as typeof color[number],
      "highlight": true,
      "class": "border-success"
    },
    {
      "color": "info" as typeof color[number],
      "highlight": true,
      "class": "border-info"
    },
    {
      "color": "warning" as typeof color[number],
      "highlight": true,
      "class": "border-warning"
    },
    {
      "color": "error" as typeof color[number],
      "highlight": true,
      "class": "border-error"
    },
    {
      "color": "neutral" as typeof color[number],
      "class": "focus-visible:outline-inverted"
    },
    {
      "color": "neutral" as typeof color[number],
      "highlight": true,
      "class": "border-inverted"
    },
    {
      "size": "xs" as typeof size[number],
      "layout": "list" as typeof layout[number],
      "class": {
        "fileTrailingButton": "-me-1"
      }
    },
    {
      "size": "sm" as typeof size[number],
      "layout": "list" as typeof layout[number],
      "class": {
        "fileTrailingButton": "-me-1.5"
      }
    },
    {
      "size": "md" as typeof size[number],
      "layout": "list" as typeof layout[number],
      "class": {
        "fileTrailingButton": "-me-1.5"
      }
    },
    {
      "size": "lg" as typeof size[number],
      "layout": "list" as typeof layout[number],
      "class": {
        "fileTrailingButton": "-me-2"
      }
    },
    {
      "size": "xl" as typeof size[number],
      "layout": "list" as typeof layout[number],
      "class": {
        "fileTrailingButton": "-me-2"
      }
    },
    {
      "variant": "button" as typeof variant[number],
      "size": "xs" as typeof size[number],
      "class": {
        "base": "p-1"
      }
    },
    {
      "variant": "button" as typeof variant[number],
      "size": "sm" as typeof size[number],
      "class": {
        "base": "p-1.5"
      }
    },
    {
      "variant": "button" as typeof variant[number],
      "size": "md" as typeof size[number],
      "class": {
        "base": "p-1.5"
      }
    },
    {
      "variant": "button" as typeof variant[number],
      "size": "lg" as typeof size[number],
      "class": {
        "base": "p-2"
      }
    },
    {
      "variant": "button" as typeof variant[number],
      "size": "xl" as typeof size[number],
      "class": {
        "base": "p-2"
      }
    },
    {
      "layout": "grid" as typeof layout[number],
      "multiple": true,
      "class": {
        "files": "grid grid-cols-2 md:grid-cols-3 gap-4 w-full",
        "file": "p-0 aspect-square"
      }
    },
    {
      "layout": "grid" as typeof layout[number],
      "multiple": false,
      "class": {
        "file": "absolute inset-0 p-0"
      }
    },
    {
      "interactive": true,
      "disabled": false,
      "class": "hover:bg-elevated/25"
    }
  ],
  "defaultVariants": {
    "color": "primary" as typeof color[number],
    "variant": "area" as typeof variant[number],
    "size": "md" as typeof size[number]
  }
}