'use client'

import { useCallback } from 'react'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import cn from 'clsx'
import { SearchIcon } from 'lucide-react'
import { Anchor, Button } from 'nextra/components'
import { useFSRoute } from 'nextra/hooks'
import { ArrowRightIcon, MenuIcon } from 'nextra/icons'
import { setMenu, useConfig, useMenu } from 'nextra-theme-docs'
import { DOCS_AI_TAB, emitDocsAIOpen } from './docAIAssistEvents'
import styles from './OneKeyNavbar.client.module.css'

const classes = {
  link: cn(
    'x:text-sm x:contrast-more:text-gray-700 x:contrast-more:dark:text-gray-100 x:whitespace-nowrap',
    'x:text-gray-600 x:hover:text-black x:dark:text-gray-400 x:dark:hover:text-gray-200',
    'x:ring-inset x:transition-colors'
  )
}

const isMenu = (page) => page.type === 'menu'

const sanitizeMenuKey = (menu) => {
  const base = menu.name || menu.route || menu.title || 'menu'
  return base.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()
}

const menuItemsClass = cn(
  'x:outline-none',
  'nextra-scrollbar x:motion-reduce:transition-none',
  'x:origin-top x:transition x:duration-200 x:ease-out x:data-closed:scale-95 x:data-closed:opacity-0',
  'x:border x:border-zinc-700',
  'x:z-30 x:rounded-md x:py-1 x:text-sm x:shadow-lg',
  'x:backdrop-blur-md x:bg-[#0B0F14] x:text-zinc-100 x:shadow-[0_12px_30px_rgba(0,0,0,0.6)]',
  'x:max-h-[min(calc(100vh-5rem),256px)]!'
)

const menuAnchor = {
  to: 'bottom',
  gap: 10,
  padding: 16
}

const NavbarMenu = ({ menu, children }) => {
  // Site is always dark mode (forcedTheme: 'dark' in layout)
  const menuKey = sanitizeMenuKey(menu)
  const routes =
    menu.children?.reduce((acc, child) => {
      if (child?.name) acc[child.name] = child
      return acc
    }, {}) ?? {}

  const menuItems = Object.entries(menu.items || {}).map(([key, item]) => (
    <MenuItem
      as={Anchor}
      href={item.href || routes[key]?.route}
      key={key}
    >
      {({ active }) => (
        <span
          className="block py-1.5 transition-colors ps-3 pe-9"
          style={{
            color: active ? '#f4f4f5' : '#d4d4d8',
            backgroundColor: active ? '#27272a' : 'transparent'
          }}
        >
          {item.title}
        </span>
      )}
    </MenuItem>
  ))

  return (
    <Menu>
      {({ open }) => (
        <>
          <MenuButton
            id={`onekey-navbar-${menuKey}`}
            data-onekey-menu={menuKey}
            className={cn(
              classes.link,
              'x:items-center x:flex x:gap-1.5 x:cursor-pointer x:outline-none'
            )}
            style={{ color: open ? '#ffffff' : '#a1a1aa' }}
          >
            {children}
            <ArrowRightIcon
              height="14"
              className="x:*:origin-center x:*:transition-transform x:*:rotate-90"
              style={{ opacity: open ? 1 : 0.7 }}
            />
          </MenuButton>
          <MenuItems
            transition
            className={menuItemsClass}
            anchor={menuAnchor}
            style={{
              backgroundColor: '#0B0F14',
              color: '#E4E4E7'
            }}
          >
            {menuItems}
          </MenuItems>
        </>
      )}
    </Menu>
  )
}

export function OneKeyClientNavbar({ children, className }) {
  const items = useConfig().normalizePagesResult.topLevelNavbarItems
  const pathname = useFSRoute()
  const menu = useMenu()
  const isZh = pathname?.startsWith('/zh')
  const searchText = isZh ? '搜索' : 'Search'

  const handleOpenSearch = useCallback(() => {
    emitDocsAIOpen(DOCS_AI_TAB.SEARCH)
  }, [])

  const navClass = cn(
    'x:flex x:gap-4 x:overflow-x-auto nextra-scrollbar x:py-1.5 x:max-md:hidden',
    className
  )

  const navItems = items.map((page, _index, arr) => {
    if ('display' in page && page.display === 'hidden') return null
    if (isMenu(page)) {
      return (
        <NavbarMenu key={page.name} menu={page}>
          {page.title}
        </NavbarMenu>
      )
    }

    const href =
      ('frontMatter' in page ? page.route : page.firstChildRoute) || page.href || page.route
    const isCurrentPage =
      href === pathname ||
      (pathname.startsWith(`${page.route}/`) &&
        arr.every((item) => !('href' in item) || item.href !== pathname))

    return (
      <Anchor
        key={page.name}
        href={href}
        className={cn(
          classes.link,
          'x:aria-[current]:font-medium x:aria-[current]:subpixel-antialiased'
        )}
        aria-current={isCurrentPage || undefined}
        style={{
          color: isCurrentPage ? '#e4e4e7' : '#a1a1aa'
        }}
      >
        {page.title}
      </Anchor>
    )
  })

  const assistActions = (
    <div className={styles.assistActions}>
      <button
        type="button"
        className={`${styles.assistButton} ${styles.searchButton}`}
        onClick={handleOpenSearch}
        aria-label="Open search"
      >
        <SearchIcon size={15} />
        <span className={styles.buttonLabel}>{searchText}</span>
        <span className={styles.searchHotkeyWrap}>
          <kbd className={styles.searchHotkey}>⌘</kbd>
          <kbd className={styles.searchHotkey}>K</kbd>
        </span>
      </button>
    </div>
  )

  const toggleClass = cn({ open: menu })

  return (
    <>
      <div className={navClass}>{navItems}</div>
      {assistActions}
      {children}
      <Button
        aria-label="Menu"
        className={cn('nextra-hamburger x:md:hidden', menu && 'x:bg-gray-400/20')}
        onClick={() => setMenu((prev) => !prev)}
      >
        <MenuIcon height="24" className={toggleClass} />
      </Button>
    </>
  )
}
