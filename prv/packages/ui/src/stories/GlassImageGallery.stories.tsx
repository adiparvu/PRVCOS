import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassImageGallery } from "../components/glass-image-gallery"

const meta: Meta<typeof GlassImageGallery> = {
  title: "Glass Display/GlassImageGallery",
  component: GlassImageGallery,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassImageGallery>

const IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop",
    caption: "Bathroom renovation — Phase 1",
  },
  {
    src: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    caption: "Floor tiling complete",
  },
  {
    src: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=400&fit=crop",
    caption: "Kitchen renovation complete",
  },
  {
    src: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=400&fit=crop",
    caption: "Living room — before",
  },
  {
    src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop",
    caption: "Living room — after",
  },
  {
    src: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=400&h=400&fit=crop",
    caption: "Master bathroom complete",
  },
]

export const Default: Story = {
  name: "Project Gallery",
  args: {
    images: IMAGES,
    columns: 3,
    lightbox: true,
  },
}

export const MaxVisible: Story = {
  name: "With Max Visible (4)",
  args: {
    images: IMAGES,
    columns: 3,
    maxVisible: 4,
    lightbox: true,
  },
}
