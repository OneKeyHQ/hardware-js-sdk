import cn from 'clsx'
import NextLink from 'next/link'
import { Anchor } from 'nextra/components'
import { DiscordIcon, GitHubIcon } from 'nextra/icons'
import { OneKeyClientNavbar } from './OneKeyNavbar.client'

const defaultGitHubIcon = <GitHubIcon height="24" aria-label="Project repository" />
const defaultChatIcon = <DiscordIcon width="24" />

export function OneKeyNavbar({
  children,
  logo,
  logoLink = true,
  projectLink,
  projectIcon = defaultGitHubIcon,
  chatLink,
  chatIcon = defaultChatIcon,
  className,
  align = 'right'
}) {
  const logoPositionClass = align === 'left' ? 'x:max-md:me-auto' : 'x:me-auto'
  const alignClass = align === 'left' ? 'x:me-auto' : ''
  const logoStyle = align === 'right' ? { marginRight: 'auto' } : undefined
  const navWrapperClass = cn(
    'onekey-navbar-inner x:mx-auto x:flex x:max-w-(--nextra-content-width) x:items-center x:gap-2 x:md:gap-4',
    'x:justify-end',
    className
  )

  const logoContent = logoLink ? (
    <NextLink
      href={typeof logoLink === 'string' ? logoLink : '/'}
      className={cn('x:flex x:items-center', logoPositionClass, 'x:transition-opacity x:focus-visible:nextra-focus x:hover:opacity-75')}
      style={logoStyle}
      aria-label="Home page"
    >
      {logo}
    </NextLink>
  ) : (
    <div
      className={cn('x:flex x:items-center', logoPositionClass)}
      style={logoStyle}
    >
      {logo}
    </div>
  )

  const projectAction = projectLink && <Anchor href={projectLink}>{projectIcon}</Anchor>
  const chatAction = chatLink && <Anchor href={chatLink}>{chatIcon}</Anchor>

  return (
    <header className={cn('nextra-navbar x:sticky x:top-0 x:z-30 x:w-full x:bg-transparent x:print:hidden', 'x:max-md:[.nextra-banner:not([class$=hidden])~&]:top-(--nextra-banner-height)')}>
      <div className="nextra-navbar-blur x:absolute x:-z-1 x:size-full nextra-border x:border-b x:backdrop-blur-md x:bg-nextra-bg/70" />
      <nav className={navWrapperClass} style={{ height: 'var(--nextra-navbar-height)' }}>
        {logoContent}
        <OneKeyClientNavbar className={alignClass}>
          {projectAction}
          {chatAction}
          {children}
        </OneKeyClientNavbar>
      </nav>
    </header>
  )
}

export default OneKeyNavbar
