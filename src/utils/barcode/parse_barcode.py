import asyncio
import aiohttp
from bs4 import BeautifulSoup


class BarcodeParser:
    def __init__(self):
        self.session = None
        self._semaphore = asyncio.Semaphore(1)  # Limit: no more than 1 concurrent request
        self._mapping = {}  # Cache for parsing results
        self._headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
            "Content-Type": "application/x-www-form-urlencoded",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Sec-GPC": "1",
            "Priority": "u=0, i"
        }

    async def _ensure_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(headers=self._headers)

    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()

    async def parse_barcode(self, barcode: int):
        # Check cache before request
        if barcode in self._mapping:
            return self._mapping[barcode]
        
        # If not in cache, execute request with semaphore limit
        async with self._semaphore:  # Limit concurrent requests
            await self._ensure_session()
            data = {"search_query": str(barcode)}
            result = None
            async with self.session.post("https://ru.disai.org/", data=data) as response:
                text = await response.text(encoding='utf-8')
                soup = BeautifulSoup(text, 'html.parser')

                # Search for table with required header
                tables = soup.find_all('table')
                for table in tables:
                    # Search for header row (bgcolor=#525252)
                    header_row = table.find('tr', {'bgcolor': '#525252'})
                    if header_row:
                        headers = header_row.find_all('td')
                        # Check if column "Product name variants" exists
                        for i, header in enumerate(headers):
                            if 'Варианты' in header.get_text() and 'наименования' in header.get_text():
                                # Found required table and column
                                # Now search for data rows
                                data_rows = table.find_all('tr', {'bgcolor': '#e0e8f2'})
                                for row in data_rows:
                                    cells = row.find_all('td')
                                    if len(cells) > i:
                                        # Take only cell from "Product name variants" column
                                        result = cells[i].get_text(strip=True)
                                        break
                                if result:
                                    break
            await asyncio.sleep(0.1)  # Delay between requests
            # Save result to cache
            self._mapping[barcode] = result
            return result

_barcode = None

async def init_barcode():
    global _barcode
    _barcode = BarcodeParser()

async def shutdown_barcode():
    global _barcode
    if _barcode:
        await _barcode.close()
    _barcode = None

async def parse_barcode(barcode: int):
    return await _barcode.parse_barcode(barcode)

async def main():
    try:
        for i in range(5):
            print(i, ' ', await parse_barcode(4690228106217))
    finally:
        await _barcode.close()


if __name__ == "__main__":
    asyncio.run(main())

