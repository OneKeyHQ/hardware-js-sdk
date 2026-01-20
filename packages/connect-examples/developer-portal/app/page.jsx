// Root path redirect to default locale
// Uses immediate script redirect for seamless UX

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') || ''

export const metadata = {
  title: 'OneKey Developers',
}

export default function RootPage() {
  const targetUrl = `${basePath}/en/`

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace("${targetUrl}");`
        }}
      />
      <meta httpEquiv="refresh" content={`0;url=${targetUrl}`} />
      <link rel="canonical" href={targetUrl} />
    </>
  )
}
