/**
 * SAP WDA SSO Client
 * 
 * This module provides a standalone way to acquire SAP WDA authentication cookies
 * (`MYSAPSSO2`, `WAF`, `JSESSIONID`, `sToken`, etc.) using the ID and Password.
 */

import { BROWSER_DOCUMENT_HEADERS } from '../utils/headers';

export class SapSsoClient {
  private cookieJar: string[] = [];

  constructor(
    private readonly smartIdUrl: string = 'https://smartid.ssu.ac.kr',
    private readonly saintUrl: string = 'https://saint.ssu.ac.kr'
  ) { }

  /**
   * Extracts and stores cookies from the `Set-Cookie` headers.
   */
  private extractCookies(setCookieHeader: string[] | string | null | undefined) {
    if (!setCookieHeader) return;
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

    for (const c of cookies) {
      // Split by comma if multiple cookies are combined in one string (common in fetch API)
      // But we have to be careful about commas inside the expiry date.
      // A simple reliable way for this specific case is to just grab the key=value part
      // up to the first semi-colon.
      const parts = c.split(/,(?=\s*[a-zA-Z0-9_-]+\s*=)/);
      for (const p of parts) {
        const cookieVal = p.split(';')[0].trim();
        const key = cookieVal.split('=')[0];

        // Replace if already exists in jar
        const existingIndex = this.cookieJar.findIndex(existing => existing.startsWith(key + '='));
        if (existingIndex !== -1) {
          this.cookieJar[existingIndex] = cookieVal;
        } else {
          this.cookieJar.push(cookieVal);
        }
      }
    }
  }

  /**
   * Gets the concatenated cookie string for use in HTTP headers.
   */
  public getCookieString(): string {
    return this.cookieJar.join('; ');
  }

  /**
   * Performs the login sequence and returns the raw cookie string.
   * 
   * @param userid The user's student/employee ID
   * @param pwd The user's password
   * @returns A string containing the acquired cookies (e.g. `MYSAPSSO2=xxx; WAF=yyy`)
   */
  public async login(userid: string, pwd: string): Promise<string> {
    this.cookieJar = [];

    // 1. Authenticate against SmartID to get sToken
    const authData = new URLSearchParams({
      in_tp_bit: '0',
      rqst_caus_cd: '03',
      userid: userid,
      pwd: pwd
    });

    const res1 = await fetch(`${this.smartIdUrl}/Symtra_sso/smln_pcs.asp`, {
      method: 'POST',
      headers: {
        ...BROWSER_DOCUMENT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': this.smartIdUrl,
        'Priority': 'u=0, i',
        'Referer': `${this.smartIdUrl}/Symtra_sso/smln.asp?apiReturnUrl=https%3A%2F%2Fsaint.ssu.ac.kr%2FwebSSO%2Fsso.jsp`,
        'Sec-Fetch-Dest': 'iframe',
      },
      body: authData.toString(),
      redirect: 'manual'
    });

    this.extractCookies(res1.headers.get('set-cookie'));
    const body1 = await res1.text();

    // The sToken might be in the HTML body or returned via cookies
    let sTokenMatch = body1.match(/sToken=([^&"']+)/);
    let sToken = sTokenMatch ? sTokenMatch[1] : null;

    if (!sToken) {
      // Check if it's in the cookies
      const tokenCookie = this.cookieJar.find(c => c.startsWith('sToken='));
      if (tokenCookie) {
        sToken = tokenCookie.split('=')[1];
      } else {
        throw new Error("Failed to acquire sToken from SmartID. Check credentials.");
      }
    }

    // 2. Exchange sToken for SAP Portal Cookies (MYSAPSSO2, WAF)
    const ssoUrl = `${this.saintUrl}/webSSO/sso.jsp?sToken=${sToken}&sIdno=${userid}`;
    const res2 = await fetch(ssoUrl, {
      method: 'GET',
      headers: {
        ...BROWSER_DOCUMENT_HEADERS,
        'Cookie': this.getCookieString(),
        'Referer': `${this.smartIdUrl}/`,
        'Sec-Fetch-Site': 'same-site',
      },
      redirect: 'manual'
    });

    this.extractCookies(res2.headers.get('set-cookie'));

    // Sometimes it does an HTTP 302 redirect, follow it if necessary to get more cookies
    if (res2.status >= 300 && res2.status < 400 && res2.headers.get('location')) {
      const redirectUrl = new URL(res2.headers.get('location')!, this.saintUrl).toString();
      const res2_redirect = await fetch(redirectUrl, {
        method: 'GET',
        headers: {
          ...BROWSER_DOCUMENT_HEADERS,
          'Cookie': this.getCookieString(),
          'Referer': `${this.smartIdUrl}/`,
        },
        redirect: 'manual'
      });
      this.extractCookies(res2_redirect.headers.get('set-cookie'));
    }

    // 3. (Optional but recommended) Hit the actual portal to trigger JSESSIONID if not already provided
    const portalUrl = `${this.saintUrl}/irj/portal`;
    const res3 = await fetch(portalUrl, {
      method: 'GET',
      headers: {
        ...BROWSER_DOCUMENT_HEADERS,
        'Cookie': this.getCookieString(),
        'Referer': ssoUrl,
      },
      redirect: 'manual'
    });

    this.extractCookies(res3.headers.get('set-cookie'));

    // Return the accumulated cookie string ready to be injected into SapWdaClient
    return this.getCookieString();
  }
}
