'use client'

import Link from 'next/link'
import {
  Info,
  AlertTriangle,
  Lightbulb,
  XCircle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  GitBranch,
  Box,
  Zap,
  Globe,
  Puzzle,
  BookOpen,
  Link2,
  Code2,
  Smartphone,
  Monitor,
  Cpu,
  FileCode,
  Settings,
  Terminal,
  Database,
  Shield,
  Wallet,
} from 'lucide-react'

// Icon map for string-based icon selection
const iconMap = {
  info: Info,
  warning: AlertTriangle,
  tip: Lightbulb,
  error: XCircle,
  success: CheckCircle2,
  globe: Globe,
  puzzle: Puzzle,
  book: BookOpen,
  link: Link2,
  zap: Zap,
  code: Code2,
  branch: GitBranch,
  smartphone: Smartphone,
  monitor: Monitor,
  cpu: Cpu,
  file: FileCode,
  settings: Settings,
  terminal: Terminal,
  database: Database,
  shield: Shield,
  wallet: Wallet,
  box: Box,
}

// ============================================
// Callout Component
// ============================================
const calloutStyles = {
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-700 dark:text-blue-300',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-700 dark:text-amber-300',
  },
  tip: {
    icon: Lightbulb,
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    iconColor: 'text-emerald-500',
    titleColor: 'text-emerald-700 dark:text-emerald-300',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-500',
    titleColor: 'text-red-700 dark:text-red-300',
  },
  success: {
    icon: CheckCircle2,
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-500',
    titleColor: 'text-green-700 dark:text-green-300',
  },
}

export function Callout({ type = 'info', title, children }) {
  const style = calloutStyles[type] || calloutStyles.info
  const Icon = style.icon

  return (
    <div className={`my-6 p-4 rounded-xl border ${style.bg} ${style.border}`}>
      <div className="flex gap-3">
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${style.iconColor}`} strokeWidth={2} />
        <div className="flex-1 min-w-0">
          {title && (
            <div className={`font-semibold mb-1 ${style.titleColor}`}>{title}</div>
          )}
          <div className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Card Components
// ============================================
export function Card({ icon, title, description, href, tags = [], external = false }) {
  const Wrapper = href ? Link : 'div'
  const wrapperProps = href
    ? {
        href,
        target: external ? '_blank' : undefined,
        rel: external ? 'noopener noreferrer' : undefined,
      }
    : {}

  // Get icon from map if string, otherwise use as-is
  const Icon = typeof icon === 'string' ? iconMap[icon] : icon

  return (
    <Wrapper
      {...wrapperProps}
      className={`group flex flex-col p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-[#00B812]/50 dark:hover:border-[#00B812]/50 hover:shadow-lg hover:shadow-[#00B812]/5 transition-all duration-300 h-full ${href ? 'cursor-pointer no-underline' : ''}`}
    >
      {Icon && (
        <div className="mb-3 inline-flex p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 group-hover:bg-[#00B812] group-hover:text-white transition-colors duration-300 w-fit">
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-[#00B812] transition-colors">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3 flex-grow">
          {description}
        </p>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] uppercase font-bold rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {href && (
        <div className="flex items-center text-sm font-semibold text-[#00B812]">
          {external ? 'View' : 'Learn more'}
          {external ? (
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          ) : (
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          )}
        </div>
      )}
    </Wrapper>
  )
}

export function CardGrid({ children, cols = 3 }) {
  const colsClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }[cols] || 'md:grid-cols-3'

  return (
    <div className={`grid grid-cols-1 ${colsClass} gap-4 my-6`}>
      {children}
    </div>
  )
}

// ============================================
// Steps Component
// ============================================
export function Steps({ children }) {
  return (
    <div className="my-6 relative">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-8 bottom-4 w-0.5 bg-zinc-200 dark:bg-zinc-700" />
      <div className="space-y-0">{children}</div>
    </div>
  )
}

export function Step({ number, title, children }) {
  return (
    <div className="relative pl-12 pb-6">
      {/* Step number circle */}
      <div className="absolute left-0 w-8 h-8 rounded-full bg-[#00B812] text-white flex items-center justify-center text-sm font-bold z-10">
        {number}
      </div>
      <div>
        <h4 className="font-bold text-zinc-900 dark:text-white mb-2">{title}</h4>
        <div className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Decision Tree / Feature Comparison
// ============================================
export function DecisionCard({ question, options = [] }) {
  return (
    <div className="my-6 p-5 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-5 h-5 text-[#00B812]" />
        <h3 className="font-bold text-zinc-900 dark:text-white">{question}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, idx) => (
          <Link
            key={idx}
            href={opt.href || '#'}
            className="flex items-start gap-3 p-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-[#00B812] transition-colors no-underline group"
          >
            <div className="p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg group-hover:bg-[#00B812] group-hover:text-white transition-colors">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-zinc-900 dark:text-white text-sm">
                {opt.label}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {opt.description}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Feature Comparison Table
// ============================================
export function FeatureTable({ headers = [], rows = [] }) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="text-left py-3 px-4 font-semibold text-sm text-zinc-900 dark:text-white"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-300"
                >
                  {cell === true ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : cell === false ? (
                    <XCircle className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================
// Quick Action Buttons
// ============================================
export function QuickActions({ actions = [] }) {
  return (
    <div className="my-6 flex flex-wrap gap-3">
      {actions.map((action, idx) => {
        const Icon = action.icon || ChevronRight
        const href = action.href || '#'

        return (
          <Link
            key={idx}
            href={href}
            target={action.external ? '_blank' : undefined}
            rel={action.external ? 'noopener noreferrer' : undefined}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-colors no-underline ${
              action.primary
                ? 'bg-[#00B812] text-white hover:bg-[#00a010]'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {action.label}
          </Link>
        )
      })}
    </div>
  )
}

// ============================================
// Section Header
// ============================================
export function SectionHeader({ title, description, badge }) {
  return (
    <div className="my-8 pb-4 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-3 mb-2">
        {badge && (
          <span className="px-2 py-0.5 bg-[#00B812]/10 text-[#00B812] text-xs font-bold uppercase rounded">
            {badge}
          </span>
        )}
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{title}</h2>
      </div>
      {description && (
        <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl">{description}</p>
      )}
    </div>
  )
}

// ============================================
// Roadmap / TODO List
// ============================================
export function Roadmap({ items = [] }) {
  const statusStyles = {
    done: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30' },
    'in-progress': { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    planned: { icon: Box, color: 'text-zinc-400', bg: 'bg-zinc-50 dark:bg-zinc-800' },
  }

  return (
    <div className="my-6 space-y-2">
      {items.map((item, idx) => {
        const style = statusStyles[item.status] || statusStyles.planned
        const Icon = style.icon
        return (
          <div
            key={idx}
            className={`flex items-center gap-3 p-3 rounded-lg ${style.bg}`}
          >
            <Icon className={`w-5 h-5 ${style.color}`} />
            <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{item.label}</span>
            <span className="text-xs text-zinc-500 uppercase font-medium">{item.status}</span>
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// Chain Selector Component
// Dropdown-style selector for chain APIs
// ============================================
export function ChainSelector({ chains = [], currentChain, basePath = '' }) {
  return (
    <div className="my-6">
      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
        Select Chain
      </label>
      <div className="relative">
        <select
          className="w-full md:w-64 appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-zinc-900 dark:text-white cursor-pointer hover:border-[#00B812] focus:border-[#00B812] focus:ring-2 focus:ring-[#00B812]/20 focus:outline-none transition-all"
          defaultValue={currentChain}
          onChange={(e) => {
            if (typeof window !== 'undefined') {
              window.location.href = `${basePath}/${e.target.value}`
            }
          }}
        >
          {chains.map((chain) => (
            <option key={chain.value} value={chain.value}>
              {chain.label}
            </option>
          ))}
        </select>
        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 rotate-90 pointer-events-none" />
      </div>
    </div>
  )
}

// ============================================
// Decision Flow Component
// Interactive decision tree for choosing integration method
// ============================================
export function DecisionFlow({ title, steps = [] }) {
  return (
    <div className="my-8 p-6 bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-900 dark:to-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700">
      {title && (
        <div className="flex items-center gap-2 mb-6">
          <GitBranch className="w-5 h-5 text-[#00B812]" />
          <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{title}</h3>
        </div>
      )}
      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div key={idx} className="relative">
            {/* Question */}
            <div className="flex items-center gap-3 mb-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#00B812] text-white text-xs font-bold flex items-center justify-center">
                {idx + 1}
              </span>
              <span className="font-semibold text-zinc-900 dark:text-white">{step.question}</span>
            </div>
            {/* Options */}
            <div className="ml-9 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {step.options.map((opt, optIdx) => (
                <Link
                  key={optIdx}
                  href={opt.href || '#'}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-[#00B812] hover:shadow-md transition-all no-underline group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${opt.highlight ? 'bg-[#00B812] text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 group-hover:bg-[#00B812] group-hover:text-white'} transition-colors`}>
                    {opt.answer}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-zinc-900 dark:text-white">{opt.label}</div>
                    {opt.description && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{opt.description}</div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-[#00B812] group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-zinc-200 dark:bg-zinc-700" style={{ height: 'calc(100% - 24px)', top: '32px' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Export all components
export default {
  Callout,
  Card,
  CardGrid,
  Steps,
  Step,
  DecisionCard,
  DecisionFlow,
  ChainSelector,
  FeatureTable,
  QuickActions,
  SectionHeader,
  Roadmap,
}
