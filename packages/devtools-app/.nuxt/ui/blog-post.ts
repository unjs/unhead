const orientation = [
  "horizontal",
  "vertical"
] as const

const variant = [
  "outline",
  "soft",
  "subtle",
  "ghost",
  "naked"
] as const

export default {
  "slots": {
    "root": "relative group/blog-post flex flex-col rounded-lg overflow-hidden",
    "header": "relative overflow-hidden aspect-[16/9] w-full pointer-events-none",
    "body": "min-w-0 flex-1 flex flex-col",
    "footer": "",
    "image": "object-cover object-top w-full h-full",
    "title": "text-xl text-pretty font-semibold text-highlighted",
    "description": "mt-1 text-base text-pretty",
    "authors": "pt-4 mt-auto flex flex-wrap gap-x-3 gap-y-1.5",
    "avatar": "",
    "meta": "flex items-center gap-2 mb-2",
    "date": "text-sm",
    "badge": ""
  },
  "variants": {
    "orientation": {
      "horizontal": {
        "root": "lg:grid lg:grid-cols-2 lg:items-center gap-x-8",
        "body": "justify-center p-4 sm:p-6 lg:px-0"
      },
      "vertical": {
        "root": "flex flex-col",
        "body": "p-4 sm:p-6"
      }
    },
    "variant": {
      "outline": {
        "root": "bg-default ring ring-default",
        "date": "text-toned",
        "description": "text-muted"
      },
      "soft": {
        "root": "bg-elevated/50",
        "date": "text-muted",
        "description": "text-toned"
      },
      "subtle": {
        "root": "bg-elevated/50 ring ring-default",
        "date": "text-muted",
        "description": "text-toned"
      },
      "ghost": {
        "date": "text-toned",
        "description": "text-muted",
        "header": "shadow-lg rounded-lg"
      },
      "naked": {
        "root": "p-0 sm:p-0",
        "date": "text-toned",
        "description": "text-muted",
        "header": "shadow-lg rounded-lg"
      }
    },
    "to": {
      "true": {
        "root": [
          "has-focus-visible:ring-2 has-focus-visible:ring-primary",
          "transition"
        ],
        "image": "transform transition-transform duration-200 group-hover/blog-post:scale-110",
        "avatar": "transform transition-transform duration-200 hover:scale-115 focus-visible:outline-primary"
      }
    },
    "image": {
      "true": ""
    }
  },
  "compoundVariants": [
    {
      "variant": "outline" as typeof variant[number],
      "to": true,
      "class": {
        "root": "hover:bg-elevated/50"
      }
    },
    {
      "variant": "soft" as typeof variant[number],
      "to": true,
      "class": {
        "root": "hover:bg-elevated"
      }
    },
    {
      "variant": "subtle" as typeof variant[number],
      "to": true,
      "class": {
        "root": "hover:bg-elevated hover:ring-accented"
      }
    },
    {
      "variant": "ghost" as typeof variant[number],
      "to": true,
      "class": {
        "root": "hover:bg-elevated/50",
        "header": [
          "group-hover/blog-post:shadow-none",
          "transition-all"
        ]
      }
    },
    {
      "variant": "ghost" as typeof variant[number],
      "to": true,
      "orientation": "vertical" as typeof orientation[number],
      "class": {
        "header": "group-hover/blog-post:rounded-b-none"
      }
    },
    {
      "variant": "ghost" as typeof variant[number],
      "to": true,
      "orientation": "horizontal" as typeof orientation[number],
      "class": {
        "header": "group-hover/blog-post:rounded-r-none"
      }
    },
    {
      "orientation": "vertical" as typeof orientation[number],
      "image": false,
      "variant": "naked" as typeof variant[number],
      "class": {
        "body": "p-0 sm:p-0"
      }
    }
  ],
  "defaultVariants": {
    "variant": "outline" as typeof variant[number]
  }
}