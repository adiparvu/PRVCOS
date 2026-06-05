import type { Preview } from "@storybook/react"
import React from "react"
import "./preview.css"

export const globalTypes = {
  theme: {
    name: "Theme",
    description: "Global theme for components",
    defaultValue: "dark",
    toolbar: {
      icon: "circlehollow",
      items: [
        { value: "dark", icon: "circle", title: "Dark" },
        { value: "light", icon: "circlehollow", title: "Light" },
      ],
      showName: true,
    },
  },
}

const ThemeDecorator = (Story: React.ComponentType, context: { globals: { theme: string } }) => {
  const theme = context.globals.theme ?? "dark"
  return (
    <div
      data-theme={theme}
      style={{
        minHeight: "100vh",
        padding: "40px",
        background: theme === "dark" ? "#000000" : "#f2f2f7",
        transition: "background 0.4s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <Story />
    </div>
  )
}

const preview: Preview = {
  decorators: [ThemeDecorator],
  parameters: {
    backgrounds: { disable: true },
    layout: "fullscreen",
    docs: {
      theme: {
        base: "dark",
        colorPrimary: "#fff",
        colorSecondary: "rgba(255,255,255,0.65)",
        appBg: "#0a0a0a",
        appContentBg: "#000",
        appBorderColor: "rgba(255,255,255,0.12)",
        textColor: "rgba(255,255,255,0.95)",
        textMutedColor: "rgba(255,255,255,0.45)",
        fontBase: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        fontCode: "SF Mono, monospace",
      },
    },
  },
}

export default preview
