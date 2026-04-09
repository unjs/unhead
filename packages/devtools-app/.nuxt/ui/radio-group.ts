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
  "list",
  "card",
  "table"
] as const

const orientation = [
  "horizontal",
  "vertical"
] as const

const indicator = [
  "start",
  "end",
  "hidden"
] as const

const size = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl"
] as const

export default {
  "slots": {
    "root": "relative",
    "fieldset": "flex gap-x-2",
    "legend": "mb-1 block font-medium text-default",
    "item": "flex items-start",
    "container": "flex items-center",
    "base": "rounded-full ring ring-inset ring-accented overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2",
    "indicator": "flex items-center justify-center size-full after:bg-default after:rounded-full" as typeof indicator[number],
    "wrapper": "w-full",
    "label": "block font-medium text-default",
    "description": "text-muted"
  },
  "variants": {
    "color": {
      "primary": {
        "base": "focus-visible:outline-primary",
        "indicator": "bg-primary" as typeof indicator[number]
      },
      "secondary": {
        "base": "focus-visible:outline-secondary",
        "indicator": "bg-secondary" as typeof indicator[number]
      },
      "success": {
        "base": "focus-visible:outline-success",
        "indicator": "bg-success" as typeof indicator[number]
      },
      "info": {
        "base": "focus-visible:outline-info",
        "indicator": "bg-info" as typeof indicator[number]
      },
      "warning": {
        "base": "focus-visible:outline-warning",
        "indicator": "bg-warning" as typeof indicator[number]
      },
      "error": {
        "base": "focus-visible:outline-error",
        "indicator": "bg-error" as typeof indicator[number]
      },
      "neutral": {
        "base": "focus-visible:outline-inverted",
        "indicator": "bg-inverted" as typeof indicator[number]
      }
    },
    "variant": {
      "list": {
        "item": ""
      },
      "card": {
        "item": "border border-muted rounded-lg"
      },
      "table": {
        "item": "border border-muted"
      }
    },
    "orientation": {
      "horizontal": {
        "fieldset": "flex-row"
      },
      "vertical": {
        "fieldset": "flex-col"
      }
    },
    "indicator": {
      "start": {
        "item": "flex-row",
        "wrapper": "ms-2"
      },
      "end": {
        "item": "flex-row-reverse",
        "wrapper": "me-2"
      },
      "hidden": {
        "base": "sr-only",
        "wrapper": "text-center"
      }
    },
    "size": {
      "xs": {
        "fieldset": "gap-y-0.5",
        "legend": "text-xs",
        "base": "size-3",
        "item": "text-xs",
        "container": "h-4",
        "indicator": "after:size-1" as typeof indicator[number]
      },
      "sm": {
        "fieldset": "gap-y-0.5",
        "legend": "text-xs",
        "base": "size-3.5",
        "item": "text-xs",
        "container": "h-4",
        "indicator": "after:size-1" as typeof indicator[number]
      },
      "md": {
        "fieldset": "gap-y-1",
        "legend": "text-sm",
        "base": "size-4",
        "item": "text-sm",
        "container": "h-5",
        "indicator": "after:size-1.5" as typeof indicator[number]
      },
      "lg": {
        "fieldset": "gap-y-1",
        "legend": "text-sm",
        "base": "size-4.5",
        "item": "text-sm",
        "container": "h-5",
        "indicator": "after:size-1.5" as typeof indicator[number]
      },
      "xl": {
        "fieldset": "gap-y-1.5",
        "legend": "text-base",
        "base": "size-5",
        "item": "text-base",
        "container": "h-6",
        "indicator": "after:size-2" as typeof indicator[number]
      }
    },
    "disabled": {
      "true": {
        "item": "opacity-75",
        "base": "cursor-not-allowed",
        "label": "cursor-not-allowed",
        "description": "cursor-not-allowed"
      }
    },
    "required": {
      "true": {
        "legend": "after:content-['*'] after:ms-0.5 after:text-error"
      }
    }
  },
  "compoundVariants": [
    {
      "size": "xs" as typeof size[number],
      "variant": [
        "card" as typeof variant[number],
        "table" as typeof variant[number]
      ],
      "class": {
        "item": "p-2.5"
      }
    },
    {
      "size": "sm" as typeof size[number],
      "variant": [
        "card" as typeof variant[number],
        "table" as typeof variant[number]
      ],
      "class": {
        "item": "p-3"
      }
    },
    {
      "size": "md" as typeof size[number],
      "variant": [
        "card" as typeof variant[number],
        "table" as typeof variant[number]
      ],
      "class": {
        "item": "p-3.5"
      }
    },
    {
      "size": "lg" as typeof size[number],
      "variant": [
        "card" as typeof variant[number],
        "table" as typeof variant[number]
      ],
      "class": {
        "item": "p-4"
      }
    },
    {
      "size": "xl" as typeof size[number],
      "variant": [
        "card" as typeof variant[number],
        "table" as typeof variant[number]
      ],
      "class": {
        "item": "p-4.5"
      }
    },
    {
      "orientation": "horizontal" as typeof orientation[number],
      "variant": "table" as typeof variant[number],
      "class": {
        "item": "first-of-type:rounded-s-lg last-of-type:rounded-e-lg",
        "fieldset": "gap-0 -space-x-px"
      }
    },
    {
      "orientation": "vertical" as typeof orientation[number],
      "variant": "table" as typeof variant[number],
      "class": {
        "item": "first-of-type:rounded-t-lg last-of-type:rounded-b-lg",
        "fieldset": "gap-0 -space-y-px"
      }
    },
    {
      "color": "primary" as typeof color[number],
      "variant": "card" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:border-primary"
      }
    },
    {
      "color": "secondary" as typeof color[number],
      "variant": "card" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:border-secondary"
      }
    },
    {
      "color": "success" as typeof color[number],
      "variant": "card" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:border-success"
      }
    },
    {
      "color": "info" as typeof color[number],
      "variant": "card" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:border-info"
      }
    },
    {
      "color": "warning" as typeof color[number],
      "variant": "card" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:border-warning"
      }
    },
    {
      "color": "error" as typeof color[number],
      "variant": "card" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:border-error"
      }
    },
    {
      "color": "neutral" as typeof color[number],
      "variant": "card" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:border-inverted"
      }
    },
    {
      "color": "primary" as typeof color[number],
      "variant": "table" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:bg-primary/10 has-data-[state=checked]:border-primary/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "color": "secondary" as typeof color[number],
      "variant": "table" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:bg-secondary/10 has-data-[state=checked]:border-secondary/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "color": "success" as typeof color[number],
      "variant": "table" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:bg-success/10 has-data-[state=checked]:border-success/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "color": "info" as typeof color[number],
      "variant": "table" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:bg-info/10 has-data-[state=checked]:border-info/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "color": "warning" as typeof color[number],
      "variant": "table" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:bg-warning/10 has-data-[state=checked]:border-warning/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "color": "error" as typeof color[number],
      "variant": "table" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:bg-error/10 has-data-[state=checked]:border-error/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "color": "neutral" as typeof color[number],
      "variant": "table" as typeof variant[number],
      "class": {
        "item": "has-data-[state=checked]:bg-elevated has-data-[state=checked]:border-inverted/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "variant": [
        "card" as typeof variant[number],
        "table" as typeof variant[number]
      ],
      "disabled": true,
      "class": {
        "item": "cursor-not-allowed"
      }
    }
  ],
  "defaultVariants": {
    "size": "md" as typeof size[number],
    "color": "primary" as typeof color[number],
    "variant": "list" as typeof variant[number],
    "orientation": "vertical" as typeof orientation[number],
    "indicator": "start" as typeof indicator[number]
  }
}