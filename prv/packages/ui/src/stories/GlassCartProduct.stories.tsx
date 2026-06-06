import type { Meta, StoryObj } from "@storybook/react"
import React, { useState } from "react"
import { GlassCartLineItem } from "../components/glass-cart-line-item"
import { GlassProductCard } from "../components/glass-product-card"
import { GlassPriceTag } from "../components/glass-price-tag"
import { GlassPricingTable } from "../components/glass-pricing-table"

const meta: Meta = {
  title: "Glass Shop/CartProduct",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

export const CartLineItem: Story = {
  name: "Cart Line Item",
  render: () => {
    const [qty, setQty] = useState(2)
    return (
      <div style={{ maxWidth: 480 }}>
        <GlassCartLineItem
          name="Premium Bathroom Tiles"
          image="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop"
          variant="60x60cm · Marble White"
          price={<GlassPriceTag amount={89.99} />}
          quantity={qty}
          onQuantityChange={setQty}
          onRemove={() => console.log("remove")}
        />
      </div>
    )
  },
}

export const ProductCard: Story = {
  name: "Product Card",
  render: () => {
    const [fav, setFav] = useState(false)
    return (
      <div style={{ width: 220 }}>
        <GlassProductCard
          name="Marble Floor Tile"
          image="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop"
          category="Flooring"
          price={89.99}
          wasPrice={119.99}
          currency="€"
          rating={4.5}
          reviews={127}
          badge={{ label: "Sale", variant: "sale" }}
          favorite={fav}
          onToggleFavorite={() => setFav((v) => !v)}
          onAdd={() => console.log("add to cart")}
          onClick={() => console.log("view product")}
        />
      </div>
    )
  },
}

export const PriceTags: Story = {
  name: "Price Tags",
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <GlassPriceTag amount={89.99} />
      <GlassPriceTag amount={119.99} wasPrice={149.99} />
      <GlassPriceTag amount={0} free />
      <GlassPriceTag amount={299} currency="€" size="lg" />
      <GlassPriceTag amount={9.99} size="sm" />
    </div>
  ),
}

export const PricingTable: Story = {
  name: "Pricing Table",
  render: () => (
    <GlassPricingTable
      plans={[
        {
          name: "Starter",
          price: "€49",
          period: "/month",
          description: "For small teams up to 10 employees",
          features: [
            { label: "Up to 10 employees", included: true },
            { label: "Basic HR module", included: true },
            { label: "Project management", included: false },
            { label: "AI assistant", included: false },
          ],
          cta: "Get Starter",
        },
        {
          name: "Business",
          price: "€149",
          period: "/month",
          description: "For growing companies up to 100 employees",
          features: [
            { label: "Up to 100 employees", included: true },
            { label: "Full HR & Payroll", included: true },
            { label: "Project management", included: true },
            { label: "AI assistant", included: false },
          ],
          featured: true,
          cta: "Get Business",
        },
        {
          name: "Enterprise",
          price: "Custom",
          description: "Unlimited employees, unlimited companies",
          features: [
            { label: "Unlimited employees", included: true },
            { label: "Multi-company support", included: true },
            { label: "Project management", included: true },
            { label: "AI assistant", included: true },
          ],
          cta: "Contact Sales",
        },
      ]}
      onSelect={(plan) => console.log("selected:", plan.name)}
    />
  ),
}
