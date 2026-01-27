import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
    logo: (
        <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>
            🤖 SylaBot Docs
        </span>
    ),
    project: {
        link: 'https://github.com/SalyyS1/discord-bot',
    },
    chat: {
        link: 'https://discord.gg/sylabot',
    },
    docsRepositoryBase: 'https://github.com/SalyyS1/discord-bot/tree/main/apps/docs',
    footer: {
        content: '© 2026 SylaBot. All rights reserved.',
    },
    head: (
        <>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta property="og:title" content="SylaBot Documentation" />
            <meta property="og:description" content="Complete guide to SylaBot - The Ultimate Discord Bot" />
        </>
    ),
    useNextSeoProps() {
        return {
            titleTemplate: '%s – SylaBot Docs'
        }
    },
    primaryHue: 185, // Cyan
    sidebar: {
        defaultMenuCollapseLevel: 1,
        toggleButton: true,
    },
    toc: {
        backToTop: true,
    },
}

export default config
