import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

export function TubelightNavBar({ items, className }: NavBarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(items[0].name)

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const tab = searchParams.get('tab')
    const current = items.find(item => {
      const itemTab = new URLSearchParams(item.url.split('?')[1] || '').get('tab')
      return itemTab ? itemTab === tab : location.pathname === item.url.split('?')[0]
    })
    if (current) setActiveTab(current.name)
  }, [location.pathname, location.search, items])

  return (
    <div className={cn("flex items-center gap-1 overflow-x-auto", className)} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <div className="flex items-center gap-1 bg-background/5 border border-border backdrop-blur-lg py-1 px-1 rounded-full flex-nowrap">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name
          return (
            <button
              key={item.name}
              onClick={() => { setActiveTab(item.name); navigate(item.url) }}
              className={cn(
                "relative cursor-pointer text-sm font-medium px-4 py-2 rounded-full transition-colors",
                "text-foreground/70 hover:text-foreground",
                isActive && "text-primary"
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden"><Icon size={16} strokeWidth={2} /></span>
              {isActive && (
                <motion.div
                  layoutId="tubelight"
                  className="absolute inset-0 w-full bg-primary/10 rounded-full -z-10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-1 bg-primary rounded-t-full">
                    <div className="absolute w-10 h-4 bg-primary/20 rounded-full blur-md -top-1 -left-2" />
                  </div>
                </motion.div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
