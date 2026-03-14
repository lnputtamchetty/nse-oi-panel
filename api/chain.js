export default async function handler(req, res) {
  const symbol = req.query.symbol || 'NIFTY'
  const type   = req.query.type   || 'index'  // 'index' or 'equity'

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

  // Different NSE endpoints for index vs equity options
  const apiPath = type === 'equity'
    ? `https://www.nseindia.com/api/option-chain-equities?symbol=${encodeURIComponent(symbol)}`
    : `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(symbol)}`

  try {
    // Step 1: Get session cookie from NSE homepage
    const homeRes = await fetch('https://www.nseindia.com/option-chain', {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
      }
    })
    const raw = homeRes.headers.get('set-cookie') || ''
    const cookies = raw.split(/,(?=[^ ])/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')

    await new Promise(r => setTimeout(r, 600))

    // Step 2: Fetch option chain
    const apiRes = await fetch(apiPath, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-IN,en;q=0.9',
        'Referer': 'https://www.nseindia.com/option-chain',
        'Cookie': cookies,
        'Connection': 'keep-alive'
      }
    })

    if (!apiRes.ok) throw new Error(`NSE: ${apiRes.status}`)
    const data = await apiRes.json()
    if (!data?.records?.data) throw new Error('No records')

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 's-maxage=55')
    return res.status(200).json(data)

  } catch (err) {
    return res.status(500).json({ error: err.message, symbol, type })
  }
}
