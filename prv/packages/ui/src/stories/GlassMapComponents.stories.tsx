import type { Meta, StoryObj } from "@storybook/react"
import React from "react"
import { GlassMapView } from "../components/glass-map-view"
import { GlassLocationPin } from "../components/glass-location-pin"
import { GlassGeofenceCard } from "../components/glass-geofence-card"
import { GlassRoutePreview } from "../components/glass-route-preview"

const meta: Meta = {
  title: "Glass Maps/MapComponents",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

export const MapView: Story = {
  name: "Map View",
  render: () => (
    <GlassMapView height={320} controls>
      <GlassLocationPin left="35%" top="45%" label="Store #1" pulse color="accent" />
      <GlassLocationPin left="55%" top="35%" label="Store #2" color="accent" />
      <GlassLocationPin left="65%" top="60%" label="Store #4" color="accent" count={3} />
    </GlassMapView>
  ),
}

export const GeofenceCard: Story = {
  name: "Geofence Card",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 340 }}>
      <GlassGeofenceCard
        name="PRV Renovations HQ"
        address="Str. Victoriei 14, Bucharest"
        status="inside"
        statusLabel="Inside zone"
        rows={[
          { label: "Employees inside", value: "12" },
          { label: "Last check-in", value: "2 min ago" },
        ]}
        showMiniMap
        onClick={() => console.log("view geofence")}
      />
      <GlassGeofenceCard
        name="Store #4 — Piata Unirii"
        address="B-dul Unirii 6, Bucharest"
        status="outside"
        statusLabel="Outside zone"
        rows={[
          { label: "Employees inside", value: "0" },
          { label: "Last activity", value: "3 hr ago" },
        ]}
        showMiniMap
      />
    </div>
  ),
}

export const RoutePreview: Story = {
  name: "Route Preview",
  render: () => (
    <GlassRoutePreview
      stats={[
        { label: "Distance", value: "14.2 km" },
        { label: "Duration", value: "28 min" },
        { label: "Via", value: "A1" },
      ]}
      height={220}
    />
  ),
}
