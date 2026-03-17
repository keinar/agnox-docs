import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroGlow} aria-hidden />
      <div className="container">
        <div className={styles.heroBadge}>AI-Native Test Automation Platform</div>
        <Heading as="h1" className={styles.heroTitle}>
          Agnox: The AI-Native<br />
          <span className={styles.heroTitleAccent}>Test Automation Platform.</span>
        </Heading>
        <p className={styles.heroSubtitle}>
          Eliminate CI noise, automatically quarantine flaky tests, and triage
          failures instantly with AI — so your team ships with confidence.
        </p>
        <div className={styles.buttons}>
          <Link
            className={clsx('button button--lg', styles.buttonPrimary)}
            to="/docs/getting-started/quick-start"
          >
            Get Started Free →
          </Link>
          <Link
            className={clsx('button button--lg', styles.buttonSecondary)}
            to="/docs/getting-started/intro"
          >
            Read the Docs
          </Link>
        </div>
      </div>
    </header>
  );
}

type IntegrationLogo = {
  name: string;
  src: string;
  alt: string;
};

const IntegrationLogos: IntegrationLogo[] = [
  { name: 'Slack', src: '/img/integrations/slack.svg', alt: 'Slack' },
  { name: 'MS Teams', src: '/img/integrations/teams.svg', alt: 'Microsoft Teams' },
  { name: 'Jira', src: '/img/integrations/jira.svg', alt: 'Jira' },
  { name: 'Linear', src: '/img/integrations/linear.svg', alt: 'Linear' },
  { name: 'Monday.com', src: '/img/integrations/monday.svg', alt: 'Monday.com' },
  { name: 'Bitbucket', src: '/img/integrations/Bitbucket.svg', alt: 'Bitbucket' },
  { name: 'GitHub Actions', src: '/img/integrations/github.svg', alt: 'GitHub Actions' },
  { name: 'GitLab', src: '/img/integrations/gitlab.svg', alt: 'GitLab' },
  { name: 'Azure DevOps', src: '/img/integrations/azure-devops.svg', alt: 'Azure DevOps' },
];

function IntegrationsSection(): ReactNode {
  return (
    <section className={styles.integrationsSection}>
      <div className="container">
        <p className={styles.integrationsSectionTitle}>
          Seamlessly integrates with your workflow
        </p>
      </div>

      {/* Full-bleed marquee (outside container so it spans the full viewport width) */}
      <div className={styles.marqueeWrapper}>
        <div className={styles.marqueeTrack}>
          {/* Group 1 — real */}
          <div className={styles.marqueeGroup}>
            {IntegrationLogos.map((logo) => (
              <img
                key={logo.name}
                src={logo.src}
                alt={logo.alt}
                className={styles.integrationLogo}
              />
            ))}
          </div>
          {/* Group 2 — duplicate for seamless looping */}
          <div className={styles.marqueeGroup} aria-hidden="true">
            {IntegrationLogos.map((logo) => (
              <img
                key={logo.name}
                src={logo.src}
                alt={logo.alt}
                className={styles.integrationLogo}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <p className={styles.integrationsFootnote}>
          …and seamlessly connect to any other internal tool using{' '}
          <strong>Generic Webhooks</strong>.
        </p>
      </div>
    </section>
  );
}

type QuickCard = {
  icon: string;
  title: string;
  description: string;
  href: string;
  color: string;
};

const QuickCards: QuickCard[] = [
  {
    icon: '🚀',
    title: 'Quick Start',
    description: 'Connect your CI or Docker image and run your first test in minutes.',
    href: '/docs/getting-started/quick-start',
    color: '#6778d6',
  },
  {
    icon: '🧠',
    title: 'AI Features',
    description: 'Smart PR Routing, Flakiness Detective, Auto-Bug Generator, and more.',
    href: '/docs/ai-capabilities/configuration',
    color: '#9b6dd6',
  },
  {
    icon: '⚙️',
    title: 'Integrations',
    description: 'Connect Playwright, GitHub Actions, Slack, Jira, and Docker.',
    href: '/docs/integrations/playwright-reporter',
    color: '#6db8d6',
  },
  {
    icon: '📚',
    title: 'API Reference',
    description: 'Complete REST API docs — authentication, organizations, users, and more.',
    href: '/docs/api-reference/api-overview',
    color: '#6dd69b',
  },
];

function QuickAccess(): ReactNode {
  return (
    <section className={styles.quickAccess}>
      <div className="container">
        <div className={styles.quickGrid}>
          {QuickCards.map((card) => (
            <Link
              key={card.title}
              to={card.href}
              className={styles.quickCard}
              style={{ '--card-color': card.color } as React.CSSProperties}
            >
              <div className={styles.quickCardIcon}>{card.icon}</div>
              <Heading as="h3" className={styles.quickCardTitle}>{card.title}</Heading>
              <p className={styles.quickCardDesc}>{card.description}</p>
              <span className={styles.quickCardArrow}>→</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

type FeatureItem = {
  icon: string;
  title: string;
  description: string;
};

const FeatureList: FeatureItem[] = [
  {
    icon: '🧠',
    title: 'Smart PR Routing',
    description:
      'AI automatically analyses your pull request\'s changed files and selects only the affected test suites — slashing CI run times and eliminating irrelevant noise.',
  },
  {
    icon: '🕵️‍♂️',
    title: 'Flakiness Detective',
    description:
      'Continuous stability scoring for every execution group. AI-driven root-cause analysis surfaces exactly why a test flakes — and what to do about it.',
  },
  {
    icon: '🛡️',
    title: 'Auto-Quarantine',
    description:
      'Continuously failing tests are automatically quarantined so they can never block a developer\'s PR again. Quality gates stay green while the team investigates.',
  },
  {
    icon: '⚡',
    title: 'AI Failure Triage',
    description:
      'Instant human-readable explanations and actionable fix suggestions for every automated test failure — generated by a dual-agent Analyzer + Critic pipeline.',
  },
  {
    icon: '🐛',
    title: 'Auto-Bug Creation',
    description:
      'Generate structured Jira tickets with full context, stack traces, logs, and AI analysis in one click. No copy-pasting; no context lost in translation.',
  },
  {
    icon: '📊',
    title: 'Centralized Dashboard',
    description:
      'A unified view across test cycles, execution history, artifact galleries, and org-wide metrics — with a natural-language Quality Chatbot for instant insights.',
  },
  {
    icon: '🗺️',
    title: 'AI Automation Planner',
    description:
      'Scan manual tests, prioritize risk, and auto-generate Playwright/Cypress framework scaffolding with Page Object Models instantly.',
  },
];

function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Built for modern engineering teams
          </Heading>
          <p className={styles.sectionSubtitle}>
            From AI-powered PR routing to automatic quarantine — every feature is designed
            to eliminate toil and keep your pipeline green.
          </p>
        </div>

        {/* 6-feature 3×2 grid */}
        <div className="row">
          {FeatureList.map((item) => (
            <div key={item.title} className={clsx('col col--4')} style={{ marginBottom: '1.5rem' }}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>{item.icon}</div>
                <Heading as="h3" className={styles.featureTitle}>{item.title}</Heading>
                <p className={styles.featureDescription}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise Ready — full-width premium banner */}
        <div className={styles.enterpriseBanner}>
          <div className={styles.enterpriseBannerContent}>
            <div className={styles.enterpriseBannerLeft}>
              <div className={styles.enterpriseBannerIcon}>🔐</div>
              <div>
                <Heading as="h3" className={styles.enterpriseBannerTitle}>
                  Enterprise Ready
                </Heading>
                <p className={styles.enterpriseBannerDesc}>
                  Full Role-Based Access Control, hard multi-tenant data isolation,
                  AES-256-GCM secret encryption, and native GitHub &amp; Slack integrations —
                  everything your security team needs to sign off on day one.
                </p>
              </div>
            </div>
            <div className={styles.enterpriseBannerActions}>
              <Link
                className={clsx('button', styles.buttonPrimary)}
                to="/docs/getting-started/intro"
              >
                Learn More →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type StatItem = {
  value: string;
  label: string;
};

const Stats: StatItem[] = [
  { value: '7', label: 'AI-powered features' },
  { value: '3', label: 'LLM providers (BYOK)' },
  { value: '~80%', label: 'CI time saved with PR routing' },
  { value: '∞', label: 'Test frameworks supported' },
];

function PlatformStats(): ReactNode {
  return (
    <section className={styles.stats}>
      <div className="container">
        <div className={styles.statsGrid}>
          {Stats.map((s) => (
            <div key={s.label} className={styles.statItem}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureShowcase(): ReactNode {
  return (
    <section className={clsx('padding-vert--xl', styles.showcase)}>
      <div className="container">
        {/* Showcase 1 — Smart PR Routing */}
        <div className={clsx('row', styles.showcaseRow)}>
          <div className="col col--6">
            <div className={styles.showcaseText}>
              <div className={styles.showcaseBadge}>Smart PR Routing</div>
              <Heading as="h2" className={styles.showcaseHeading}>
                Run only the tests that matter
              </Heading>
              <p className={styles.showcaseBody}>
                Every PR triggers a full suite? Not with Agnox. When a developer opens a pull
                request, AI analyses the changed files, maps them to affected test folders, and
                dispatches a targeted run — cutting CI time by up to 80% without any manual
                configuration.
              </p>
              <ul className={styles.showcaseList}>
                <li><strong>Zero config</strong> — works from your existing repo structure</li>
                <li><strong>LLM-powered file mapping</strong> — smarter than glob patterns</li>
                <li><strong>Fallback safe</strong> — gracefully runs defaults if AI is uncertain</li>
              </ul>
              <Link
                className={clsx('button', styles.buttonPrimary)}
                to="/docs/ai-capabilities/pr-routing"
              >
                Explore PR Routing →
              </Link>
            </div>
          </div>
          <div className="col col--6">
            <div className={styles.showcaseImageWrapper}>
              <img
                src="/img/dashboard-preview.png"
                alt="Agnox Smart PR Routing"
                className={styles.showcaseImage}
              />
            </div>
          </div>
        </div>

        {/* Showcase 2 — Flakiness Detective */}
        <div className={clsx('row', styles.showcaseRow)}>
          <div className="col col--6">
            <div className={styles.showcaseImageWrapper}>
              <img
                src="/img/cycles-preview.png"
                alt="Agnox Flakiness Detective"
                className={styles.showcaseImage}
              />
            </div>
          </div>
          <div className="col col--6">
            <div className={styles.showcaseText}>
              <div className={styles.showcaseBadge}>Flakiness Detective</div>
              <Heading as="h2" className={styles.showcaseHeading}>
                Stop chasing phantom failures
              </Heading>
              <p className={styles.showcaseBody}>
                Flaky tests destroy developer trust. Agnox tracks stability scores across every
                execution group, correlates failure patterns over time, and uses AI to surface
                the root cause — whether it's a race condition, environment leak, or genuinely
                broken code.
              </p>
              <ul className={styles.showcaseList}>
                <li><strong>Stability scoring</strong> — quantified flakiness per group</li>
                <li><strong>AI root-cause analysis</strong> — actionable findings, not raw logs</li>
                <li><strong>Auto-Quarantine</strong> — isolate repeating failures automatically</li>
              </ul>
              <Link
                className={clsx('button', styles.buttonPrimary)}
                to="/docs/ai-capabilities/flakiness-detective"
              >
                Explore Flakiness Detective →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — AI-Native Test Automation Platform`}
      description="Agnox is the AI-Native Test Automation Platform. Eliminate CI noise, automatically quarantine flaky tests, and triage failures instantly with AI."
    >
      <HomepageHeader />
      <main>
        <IntegrationsSection />
        <QuickAccess />
        <HomepageFeatures />
        <PlatformStats />
        <FeatureShowcase />
      </main>
    </Layout>
  );
}
