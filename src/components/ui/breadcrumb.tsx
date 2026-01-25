'use client'

/**
 * Breadcrumb 面包屑导航组件
 * Task 9.5: 全局面包屑导航
 * 
 * 使用方式:
 * <Breadcrumb items={[
 *   { label: '仪表盘', href: '/' },
 *   { label: 'Traces' }
 * ]} />
 */

import { ChevronLeft, ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  showBackButton?: boolean
  backHref?: string
}

export function Breadcrumb({ items, showBackButton = true, backHref }: BreadcrumbProps) {
  const router = useRouter()
  
  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      {showBackButton && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBack}
          className="h-8 px-2 gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          返回
        </Button>
      )}
      
      <nav className="flex items-center gap-1">
        <Link 
          href="/" 
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Home className="h-3.5 w-3.5" />
          <span>首页</span>
        </Link>
        
        {items.map((item, index) => (
          <span key={index} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            {item.href ? (
              <Link 
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  )
}

export default Breadcrumb
