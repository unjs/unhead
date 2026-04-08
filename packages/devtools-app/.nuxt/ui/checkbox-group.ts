const orientation = [
  "horizontal",
  "vertical"
] as const

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
    "item": ""
  },
  "variants": {
    "orientation": {
      "horizontal": {
        "fieldset": "flex-row"
      },
      "vertical": {
        "fieldset": "flex-col"
      }
    },
    "color": {
      "primary": {},
      "secondary": {},
      "success": {},
      "info": {},
      "warning": {},
      "error": {},
      "neutral": {}
    },
    "variant": {
      "list": {},
      "card": {},
      "table": {
        "item": "border border-muted"
      }
    },
    "size": {
      "xs": {
        "fieldset": "gap-y-0.5",
        "legend": "text-xs"
      },
      "sm": {
        "fieldset": "gap-y-0.5",
        "legend": "text-xs"
      },
      "md": {
        "fieldset": "gap-y-1",
        "legend": "text-sm"
      },
      "lg": {
        "fieldset": "gap-y-1",
        "legend": "text-sm"
      },
      "xl": {
        "fieldset": "gap-y-1.5",
        "legend": "text-base"
      }
    },
    "required": {
      "true": {
        "legend": "after:content-['*'] after:ms-0.5 after:text-error"
      }
    },
    "disabled": {
      "true": {}
    }
  },
  "compoundVariants": [
    {
      "size": "xs" as typeof size[number],
      "variant": "table" as typeof variant[number],
      "class": {
        "item": "p-2.5"
      }
    },
    {
      "size": "sm" as typeof size[number],
      "variant": "table" as typeof variant[number],
      "class": {
        "item": "p-3"
      }
    },
    {
      "size": "md" as typeof size[number],
      "variant": "table" as typeof variant[number],
      "class": {
        "item": "p-3.5"
      }
    },
    {
      "size": "lg" as typeof size[number],
      "variant": "table" as typeof variant[number],
      "class": {
        "item": "p-4"
      }
    },
    {
      "size": "xl" as typeof size[number],
      "variant": "table" as typeof variant[number],
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
      "variant": "table" as typeof variant[number],
      "disabled": true,
      "class": {
        "item": "cursor-not-allowed"
      }
    }
  ],
  "defaultVariants": {
    "size": "md" as typeof size[number],
    "variant": "list" as typeof variant[number],
    "color": "primary" as typeof color[number]
  }
}