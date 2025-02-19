<script lang="ts" setup>
import { useHead, useSeoMeta } from "@unhead/vue";

useHead({ title: 'foo' });
useSeoMeta({ description: 'bar' });
</script>
<template>
<div>transform</div>
</template>
