import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/common/PageLayout';
import {
  Book,
  Rocket,
  Wrench,
  HelpCircle,
  FileCode,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';

import QuickStartEn from '../docs/quick-start/en.mdx';
import QuickStartZh from '../docs/quick-start/zh.mdx';
import CoreConceptsEn from '../docs/core-concepts/en.mdx';
import CoreConceptsZh from '../docs/core-concepts/zh.mdx';
import OverviewEn from '../docs/overview/en.mdx';
import OverviewZh from '../docs/overview/zh.mdx';
import TroubleshootingEn from '../docs/troubleshooting/en.mdx';
import TroubleshootingZh from '../docs/troubleshooting/zh.mdx';

interface GuideSection {
  id: string;
  titleKey: string;
  icon: LucideIcon;
  component: React.ComponentType;
}

const SECTIONS: GuideSection[] = [
  { id: 'overview', titleKey: 'overview.title', icon: Book, component: OverviewSection },
  { id: 'quick-start', titleKey: 'quick_start.title', icon: Rocket, component: QuickStartSection },
  {
    id: 'core-concepts',
    titleKey: 'core_concepts.title',
    icon: Lightbulb,
    component: CoreConceptsSection,
  },
  {
    id: 'troubleshooting',
    titleKey: 'troubleshooting.title',
    icon: Wrench,
    component: TroubleshootingSection,
  },
  { id: 'api-reference', titleKey: 'api_reference.title', icon: FileCode, component: ApiSection },
];

function OverviewSection() {
  const { i18n } = useTranslation();
  const Doc = i18n.language.startsWith('zh') ? OverviewZh : OverviewEn;
  return (
    <section className="mb-16">
      <div className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none hljs">
        <Doc />
      </div>
    </section>
  );
}

function QuickStartSection() {
  const { i18n } = useTranslation();
  const Doc = i18n.language.startsWith('zh') ? QuickStartZh : QuickStartEn;
  return (
    <section className="mb-16">
      <div className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none hljs">
        <Doc />
      </div>
    </section>
  );
}

function CoreConceptsSection() {
  const { i18n } = useTranslation();
  const Doc = i18n.language.startsWith('zh') ? CoreConceptsZh : CoreConceptsEn;
  return (
    <section className="mb-16">
      <div className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none hljs">
        <Doc />
      </div>
    </section>
  );
}

function TroubleshootingSection() {
  const { i18n } = useTranslation();
  const Doc = i18n.language.startsWith('zh') ? TroubleshootingZh : TroubleshootingEn;
  return (
    <section className="mb-16">
      <div className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none hljs">
        <Doc />
      </div>
    </section>
  );
}

function ApiSection() {
  const { t } = useTranslation();
  return (
    <section className="mb-16">
      <div className="text-center py-12">
        <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium text-foreground">
          {t('guide.sections.api_reference.wip')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('guide.sections.api_reference.description')}
        </p>
      </div>
    </section>
  );
}

export default function GuidePage() {
  const { t } = useTranslation();
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0]?.id || '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0,
      }
    );
    Object.values(sectionRefs.current).forEach(sectionEl => {
      if (sectionEl) observer.observe(sectionEl);
    });
    return () => {
      Object.values(sectionRefs.current).forEach(sectionEl => {
        if (sectionEl) observer.unobserve(sectionEl);
      });
    };
  }, []);

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <PageLayout>
      <div className="relative flex flex-col xl:flex-row w-full xl:justify-center">
        {/* Main Content */}
        <div className="flex-1 px-4 md:px-8 py-6 max-w-full xl:max-w-5xl xl:pr-[calc(theme(spacing.64)+theme(spacing.8))] ">
          {SECTIONS.map((section, idx) => (
            <React.Fragment key={section.id}>
              <div
                id={section.id}
                ref={el => (sectionRefs.current[section.id] = el)}
                className="scroll-mt-20"
              >
                <section.component />
              </div>
              {idx < SECTIONS.length - 1 && <div className="onekey-divider my-6" />}
            </React.Fragment>
          ))}
        </div>
        {/* Sidebar Navigation */}
        <aside className="xl:fixed xl:top-24 xl:right-[calc((100vw-(theme(maxWidth.5xl)+theme(spacing.8)+theme(spacing.64)))/2)] xl:w-64 p-0 hidden xl:block z-40 xl:h-[calc(100vh-theme(spacing.24))] overflow-y-auto pr-4">
          <nav className="bg-card/90 border border-border rounded-xl shadow-lg py-3 px-2 backdrop-blur-md">
            <ul className="space-y-1">
              {SECTIONS.map(section => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      'flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      activeSection === section.id
                        ? 'bg-blue-500/10 text-blue-500 font-semibold'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <section.icon className="w-4 h-4 opacity-70" />
                    {t(`guide.sections.${section.titleKey}`)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </PageLayout>
  );
}
