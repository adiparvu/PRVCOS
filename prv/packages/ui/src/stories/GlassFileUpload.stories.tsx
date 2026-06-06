import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassFileUpload, type UploadFile } from "../components/glass-file-upload"

const meta: Meta<typeof GlassFileUpload> = {
  title: "Glass Forms/GlassFileUpload",
  component: GlassFileUpload,
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj<typeof GlassFileUpload>

export const Default: Story = {
  name: "Default",
  render: () => {
    const [files, setFiles] = useState<UploadFile[]>([])
    const handleAdd = (newFiles: File[]) => {
      const entries: UploadFile[] = newFiles.map((f) => ({
        id: Math.random().toString(36).slice(2),
        name: f.name,
        size: f.size,
        status: "complete" as const,
      }))
      setFiles((prev) => [...prev, ...entries])
    }
    return (
      <GlassFileUpload
        files={files}
        onAdd={handleAdd}
        onRemove={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
        accept="image/*,.pdf"
        subtitle="Drag documents here"
      />
    )
  },
}

export const WithProgress: Story = {
  name: "With Uploading State",
  render: () => (
    <GlassFileUpload
      files={[
        { id: "1", name: "contract_2024.pdf", size: 142000, status: "complete" },
        { id: "2", name: "blueprint_v3.dwg", size: 5800000, status: "uploading", progress: 62 },
        {
          id: "3",
          name: "photo_site.jpg",
          size: 2400000,
          status: "error",
          error: "File too large",
        },
      ]}
      onRemove={() => {}}
      title="Project Documents"
      maxSize={10_000_000}
      hint="Max 10 MB per file"
    />
  ),
}
