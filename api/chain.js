export default async function handler(req, res) {
  const symbol = req.query.symbol || 'NIFTY'

  try {
    const response = await fetch(
      `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(symbol)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.nseindia.com/',
          'Origin': 'https://www.nseindia.com',
          'Connection': 'keep-alive'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`NSE returned status ${response.status}`)
    }

    const data = await response.json()

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30')
    res.status(200).json(data)

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
