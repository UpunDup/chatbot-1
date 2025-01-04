import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function POST(request: Request) {
  try {
    const { query } = await request.json()
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ]
    })
    
    const page = await browser.newPage()
    
    await page.setDefaultNavigationTimeout(60000)
    await page.setDefaultTimeout(60000)
    
    await page.goto(`https://search.bilibili.com/all?keyword=${encodeURIComponent(query)}&order=pubdate&duration=3`)
    
    await page.waitForSelector('.video-list')
    
    const results = await page.evaluate(() => {
      const items = document.querySelectorAll('.video-item')
      return Array.from(items).slice(0, 5).map(item => {
        const titleElement = item.querySelector('.title')
        const linkElement = item.querySelector('.img-anchor')
        const thumbnailElement = item.querySelector('.lazy-img img')
        const upElement = item.querySelector('.up-name')
        
        return {
          title: titleElement?.textContent?.trim() || '',
          link: (linkElement as HTMLAnchorElement)?.href || '',
          thumbnail: thumbnailElement?.getAttribute('src') || '',
          uploader: upElement?.textContent?.trim() || '',
          views: item.querySelector('.watch-num')?.textContent?.trim() || '',
          date: item.querySelector('.time')?.textContent?.trim() || ''
        }
      })
    })
    
    await browser.close()
    
    return NextResponse.json(results)
  } catch (error) {
    console.error('搜索失败:', error)
    return NextResponse.json({ error: '搜索失败' }, { status: 500 })
  }
} 