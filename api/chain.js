export default async function handler(req, res) {
  const symbol = req.query.symbol || 'NIFTY'

  // SENSEX uses BSE — different NSE endpoint
  // All others use option-chain-indices
  const isSensex = symbol === 'SENSEX'
  const apiUrl = isSensex
    ? `https://www.nseindia.com/api/option-chain-indices?symbol=SENSEX`
    : `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(symbol)}`

  try {
    // Step 1: Hit NSE homepage to get session cookie
    const cookieRes = await fetch('https://www.nseindia.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
      }
    })
    const cookies = cookieRes.headers.get('set-cookie') || ''

    // Step 2: Fetch option chain with cookie
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.nseindia.com/option-chain',
        'Cookie': cookies,
        'Connection': 'keep-alive'
      }
    })

    if (!response.ok) {
      throw new Error(`NSE returned ${response.status} for ${symbol}`)
    }

    const data = await response.json()

    if (!data || !data.records) {
      throw new Error(`No records in NSE response for ${symbol}`)
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30')
    res.status(200).json(data)

  } catch (error) {
    res.status(500).json({ error: error.message, symbol })
  }
}
