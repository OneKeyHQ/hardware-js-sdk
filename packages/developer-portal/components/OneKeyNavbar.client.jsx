'use client'

import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import cn from 'clsx'
import { Anchor, Button } from 'nextra/components'
import { useFSRoute } from 'nextra/hooks'
import { ArrowRightIcon, MenuIcon } from 'nextra/icons'
import { setMenu, useConfig, useMenu, useThemeConfig } from 'nextra-theme-docs'
import { useTheme } from 'next-themes'

const classes = {
  link: cn(
    'x:text-sm x:contrast-more:text-gray-700 x:contrast-more:dark:text-gray-100 x:whitespace-nowrap',
    'x:text-gray-600 x:hover:text-black x:dark:text-gray-400 x:dark:hover:text-gray-200',
    'x:ring-inset x:transition-colors'
  )
}

const isMenu = (page) => page.type === 'menu'

const sanitizeMenuId = (menu) => {
  const base = menu.name || menu.route || menu.title || 'menu'
  return `onekey-navbar-${base.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`
}

const menuButtonClass = ({ focus }) =>
  cn(classes.link, 'x:items-center x:flex x:gap-1.5 x:cursor-pointer', focus && 'x:nextra-focus')

const menuItemClass = ({ active }) =>
  cn(
    'x:block x:py-1.5 x:transition-colors x:ps-3 x:pe-9',
    active ? 'x:text-gray-900 x:dark:text-zinc-100' : 'x:text-gray-600 x:dark:text-zinc-300'
  )

const menuItemsClass = cn(
  'x:focus-visible:nextra-focus',
  'nextra-scrollbar x:motion-reduce:transition-none',
  'x:origin-top x:transition x:duration-200 x:ease-out x:data-closed:scale-95 x:data-closed:opacity-0',
  'x:border x:border-gray-200 x:dark:border-zinc-800',
  'x:z-30 x:rounded-md x:py-1 x:text-sm x:shadow-lg',
  'x:backdrop-blur-md x:bg-white x:text-gray-800 x:dark:bg-[#0B0F14] x:dark:text-zinc-100 x:dark:shadow-[0_12px_30px_rgba(0,0,0,0.6)]',
  'x:max-h-[min(calc(100vh-5rem),256px)]!'
)

const menuAnchor = {
  to: 'bottom',
  gap: 10,
  padding: 16
}

const NavbarMenu = ({ menu, children }) => {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const routes =
    menu.children?.reduce((acc, child) => {
      if (child?.name) acc[child.name] = child
      return acc
    }, {}) ?? {}

  const menuItems = Object.entries(menu.items || {}).map(([key, item]) => (
    <MenuItem
      as={Anchor}
      href={item.href || routes[key]?.route}
      className={menuItemClass}
      key={key}
    >
      {item.title}
    </MenuItem>
  ))

  return (
    <Menu>
      <MenuButton id={sanitizeMenuId(menu)} className={menuButtonClass}>
        {children}
        <ArrowRightIcon height="14" className="x:*:origin-center x:*:transition-transform x:*:rotate-90" />
      </MenuButton>
      <MenuItems
        transition
        className={menuItemsClass}
        anchor={menuAnchor}
        style={{
          backgroundColor: isDark ? '#0B0F14' : '#FFFFFF',
          color: isDark ? '#E4E4E7' : '#1F2937'
        }}
      >
        {menuItems}
      </MenuItems>
    </Menu>
  )
}

export function OneKeyClientNavbar({ children, className }) {
  const items = useConfig().normalizePagesResult.topLevelNavbarItems
  const themeConfig = useThemeConfig()
  const pathname = useFSRoute()
  const menu = useMenu()

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
          'x:aria-[current]:font-medium x:aria-[current]:subpixel-antialiased x:aria-[current]:text-current'
        )}
        aria-current={isCurrentPage || undefined}
      >
        {page.title}
      </Anchor>
    )
  })

  const search = themeConfig.search && (
    <div className="x:max-md:hidden">{themeConfig.search}</div>
  )

  const toggleClass = cn({ open: menu })

  return (
    <>
      <div className={navClass}>{navItems}</div>
      {search}
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
