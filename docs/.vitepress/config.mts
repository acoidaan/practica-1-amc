import { defineConfig } from 'vitepress';

export default defineConfig({
  lang: 'es-ES',
  title: 'Práctica 1 · Par de puntos más cercano',
  description:
    'Memoria técnica y experimental de la Práctica 1 de Algorítmica y Modelos de Computación.',
  base: '/documentacion/',
  outDir: '../public/documentacion',
  lastUpdated: true,
  markdown: {
    lineNumbers: true,
    math: true,
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 1024,
    },
  },
  head: [
    ['meta', { name: 'theme-color', content: '#f5f5f7' }],
    ['meta', { name: 'color-scheme', content: 'light dark' }],
  ],
  themeConfig: {
    siteTitle: 'AMC · Práctica 1',
    nav: [
      { text: 'Memoria', link: '/memoria' },
      { text: 'Guía de uso', link: '/guia-uso' },
      { text: 'Defensa', link: '/defensa' },
      { text: 'API TypeScript', link: '/api/' },
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/acoidaan/practica-1-amc',
        ariaLabel: 'Repositorio de la práctica en GitHub',
      },
    ],
    sidebar: [
      {
        text: 'Documentación',
        items: [
          { text: 'Inicio', link: '/' },
          { text: 'Memoria académica', link: '/memoria' },
          { text: 'Guía de uso', link: '/guia-uso' },
          { text: 'Guion de defensa', link: '/defensa' },
          { text: 'Referencia TypeDoc', link: '/api/' },
        ],
      },
    ],
    search: {
      provider: 'local',
    },
    outline: {
      level: [2, 3],
      label: 'En esta página',
    },
    docFooter: {
      prev: 'Anterior',
      next: 'Siguiente',
    },
    lastUpdated: {
      text: 'Última actualización',
      formatOptions: {
        dateStyle: 'long',
        timeStyle: 'short',
      },
    },
    returnToTopLabel: 'Volver arriba',
    sidebarMenuLabel: 'Menú',
    darkModeSwitchLabel: 'Tema',
    lightModeSwitchTitle: 'Usar tema claro',
    darkModeSwitchTitle: 'Usar tema oscuro',
  },
});
