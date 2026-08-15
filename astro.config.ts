import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import react from '@astrojs/react';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

import {
  rehypeVisualizationSlots,
  visualizationValidationIntegration,
} from './src/integrations/visualization-slots';

export default defineConfig({
  site: 'https://sorbetsharkroundhand.github.io',
  base: process.env.DEPLOY_BASE ?? '/',
  integrations: [react(), visualizationValidationIntegration()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeVisualizationSlots, rehypeKatex],
    }),
  },
});
