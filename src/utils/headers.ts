export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const CHROME_SEC_HEADERS: Record<string, string> = {
  'Sec-CH-UA': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-CH-UA-Mobile': '?0',
  'Sec-CH-UA-Platform': '"Windows"'
};

export const BASE_HEADERS: Record<string, string> = {
  ...CHROME_SEC_HEADERS,
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,ja-JP;q=0.6,ja;q=0.5',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'User-Agent': DEFAULT_USER_AGENT
};

export const BROWSER_DOCUMENT_HEADERS: Record<string, string> = {
  ...BASE_HEADERS,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Connection': 'keep-alive',
  'DNT': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1'
};

export const AJAX_HEADERS: Record<string, string> = {
  ...BASE_HEADERS,
  'Accept': '*/*',
  'Connection': 'keep-alive',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'X-Requested-With': 'XMLHttpRequest'
};
