export default async function handler(req, res) {
  const symbol = req.query.symbol || 'NIFTY'

  // NSE requires a valid session cookie obtained from their main page first
  // Without this, they return 401/403 from API endpoints
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

  try {
    // Step 1: Hit NSE homepage to get session cookies
    const homeRes = await fetch('https://www.nseindia.com', {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })

    // Parse all Set-Cookie headers into one cookie string
    const raw = homeRes.headers.get('set-cookie') || ''
    const cookies = raw.split(/,(?=[^ ])/)
      .map(c => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ')

    // Step 2: Small delay to appear human
    await new Promise(r => setTimeout(r, 800))

    // Step 3: Hit the option chain API with session cookie
    const apiRes = await fetch(
      `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(symbol)}`,
      {
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.nseindia.com/option-chain',
          'Origin': 'https://www.nseindia.com',
          'Cookie': cookies,
          'Connection': 'keep-alive',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin'
        }
      }
    )

    if (!apiRes.ok) {
      throw new Error(`NSE API: ${apiRes.status} ${apiRes.statusText}`)
    }

    const data = await apiRes.json()
    if (!data?.records?.data) {
      throw new Error('NSE response missing records')
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=55, stale-while-revalidate=30')
    return res.status(200).json(data)

  } catch (err) {
    // Fallback: try NSE's alternate option chain page endpoint
    try {
      const alt = await fetch(
        `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(symbol)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': '*/*',
            'Referer': 'https://www.nseindia.com/',
            'Cookie': 'nsit=; nseappid='
          }
        }
      )
      if (alt.ok) {
        const data = await alt.json()
        if (data?.records?.data) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Cache-Control', 's-maxage=55')
          return res.status(200).json(data)
        }
      }
    } catch (_) {}

    return res.status(500).json({
      error: err.message,
      symbol,
      note: 'NSE is blocking this server IP. This is common for cloud providers. The app will show demo data until NSE allows the request.'
    })
  }
}
