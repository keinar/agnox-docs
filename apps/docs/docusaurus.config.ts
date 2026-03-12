import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Agnox',
  tagline: 'The AI Quality Orchestrator: Unified test execution, manual QA workflows, and five AI-powered features in one platform.',
  favicon: 'img/favicon.png',

  future: {
    v4: true,
  },

  // Use CommonMark format to avoid MDX issues with angle brackets in docs
  markdown: {
    format: 'detect',
  },

  url: 'https://docs.agnox.dev',
  baseUrl: '/',

  organizationName: 'agnox',
  projectName: 'Agnostic-Automation-Center',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../../docs',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/keinar/Agnostic-Automation-Center/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        gtag: {
          trackingID: 'G-H2BES4ZMVF',
          anonymizeIP: true,
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Agnox',
      style: 'dark',
      logo: {
        alt: 'Agnox Logo',
        src: 'img/logo.png',
        srcDark: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/getting-started/quick-start',
          label: 'Quick Start',
          position: 'left',
        },
        {
          to: '/docs/ai-capabilities/configuration',
          label: 'AI Features',
          position: 'left',
        },
        {
          to: '/docs/api-reference/api-overview',
          label: 'API',
          position: 'left',
        },
        {
          href: 'https://github.com/keinar/Agnostic-Automation-Center',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Quick Start',
              to: '/docs/getting-started/quick-start',
            },
            {
              label: 'AI Features',
              to: '/docs/ai-capabilities/configuration',
            },
            {
              label: 'API Reference',
              to: '/docs/api-reference/api-overview',
            },
            {
              label: 'Deployment',
              to: '/docs/architecture/deployment',
            },
          ],
        },
        {
          title: 'Product',
          items: [
            {
              label: 'Dashboard',
              href: 'https://agnox.dev',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/keinar/Agnostic-Automation-Center',
            },
            {
              label: 'Issues',
              href: 'https://github.com/keinar/Agnostic-Automation-Center/issues',
            },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Agnox`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml', 'typescript', 'docker'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
