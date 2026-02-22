import * as cheerio from 'cheerio';
import fetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';
import { createControl } from '../controls';
import type { SapControl } from '../controls/SapControl';
import { SapDeltaParser } from './delta-parser';
import { SapEventQueue } from './event-queue';
import type { SapEventResult } from './types';

import { BROWSER_DOCUMENT_HEADERS, AJAX_HEADERS } from '../utils/headers';

/**
 * Client for interacting with SAP WebDynpro ABAP (WDA) applications.
 * Maintains session state, cookie jars, and a virtual DOM of the current view.
 */
export class SapWdaClient {
    private readonly baseUrl: string;
    private readonly appName: string;

    public readonly cookieJar: CookieJar;
    private readonly fetch: typeof globalThis.fetch;

    public $: cheerio.CheerioAPI;

    private contextId: string | null = null;
    private secureId: string | null = null;
    private postUrl: string | null = null;

    constructor(baseUrl: string, appName: string, cookieSource?: CookieJar | string) {
        this.baseUrl = baseUrl;
        this.appName = appName;
        this.cookieJar = cookieSource instanceof CookieJar ? cookieSource : new CookieJar();
        this.fetch = fetchCookie(globalThis.fetch, this.cookieJar) as any;
        this.$ = cheerio.load('<html></html>');

        if (typeof cookieSource === 'string') {
            this.setRawCookies(cookieSource);
        }
    }

    /**
     * Initializes the WDA session.
     * Fetches the initial layout and performs the mandatory client handshake.
     * @returns A Promise resolving to SapEventResult.
     */
    async initialize(): Promise<SapEventResult> {
        const url = `${this.baseUrl}/sap/bc/webdynpro/SAP/${this.appName}?sap-language=KO&sap-wd-stableids=X#`;

        const res = await this.fetch(url, {
            method: 'GET',
            headers: BROWSER_DOCUMENT_HEADERS
        });

        const html = await res.text();
        this.$ = cheerio.load(html);

        const form = this.$('form[name="sap.client.SsrClient.form"]');
        const actionUrl = form.attr('action') || '';
        if (actionUrl) {
            this.postUrl = actionUrl.startsWith('http') ? actionUrl : this.baseUrl + actionUrl;
            const match = actionUrl.match(/sap-contextid=([^&]+)/);
            if (match) {
                this.contextId = decodeURIComponent(match[1]);
            }
        }

        this.secureId = this.$('input[name="sap-wd-secure-id"]').attr('value') || null;

        if (!this.contextId || !this.secureId) {
            return { isSuccess: false };
        }

        const queue = new SapEventQueue();
        queue.addEvent('ClientInspector_Notify', {
            Id: 'WD01',
            Data: 'ClientWidth:1920px;ClientHeight:1080px;ScreenWidth:1920px;ScreenHeight:1080px;ScreenOrientation:landscape;ThemedTableRowHeight:33px;ThemedFormLayoutRowHeight:32px;ThemeTags:Fiori_3,Touch;ThemeID:sap_fiori_3;SapThemeID:sap_fiori_3;DeviceType:DESKTOP;DocumentDomain:ssu.ac.kr;IsTopWindow:TRUE;ParentAccessible:TRUE'
        }, {
            ResponseData: 'delta', EnqueueCardinality: 'single'
        });

        queue.addEvent('LoadingPlaceHolder_Load', {
            Id: '_loadingPlaceholder_'
        }, {
            ResponseData: 'delta', ClientAction: 'submit'
        });

        queue.addFormRequest();

        return await this.dispatchEvents(queue);
    }

    /**
     * Parses and sets raw cookie strings into the internal cookie jar.
     * @param cookieString - Raw cookie header string (e.g., 'MYSAPSSO2=...; JSESSIONID=...;')
     */
    public setRawCookies(cookieString: string): void {
        const cookies = cookieString.split(';');
        for (const c of cookies) {
            const trimmed = c.trim();
            if (trimmed) {
                this.cookieJar.setCookieSync(trimmed, this.baseUrl);
            }
        }
    }

    /**
     * Dispatches the populated event queue to the server and applies the DOM delta updates.
     * @param queue - The SapEventQueue instance containing events to dispatch.
     * @returns A Promise resolving to SapEventResult.
     */
    async dispatchEvents(queue: SapEventQueue): Promise<SapEventResult> {
        if (!this.contextId || !this.postUrl) {
            throw new Error("Client not initialized. Cannot dispatch events.");
        }

        const url = this.postUrl;
        const payload = new URLSearchParams();

        payload.append('sap-charset', 'utf-8');
        if (this.secureId) {
            payload.append('sap-wd-secure-id', this.secureId);
        }
        payload.append('fesrAppName', this.appName);
        payload.append('fesrUseBeacon', 'true');
        payload.append('SAPEVENTQUEUE', queue.serialize());

        // Note: SAP ABAP backend crashes if the tilde (~) is URL encoded as %7E.
        const payloadString = payload.toString().replace(/%7E/g, '~').replace(/%7e/g, '~');

        const res = await this.fetch(url, {
            method: 'POST',
            headers: {
                ...AJAX_HEADERS,
                'Origin': this.baseUrl,
                'Referer': `${this.baseUrl}/sap/bc/webdynpro/SAP/${this.appName}?sap-language=KO&sap-wd-stableids=X`,
                'X-XHR-Logon': 'accept',
            },
            body: payloadString
        });

        const xmlResponse = await res.text();
        return SapDeltaParser.applyDeltaUpdates(xmlResponse, this.$);
    }

    /**
     * Retrieves a wrapped UI control by its exact DOM ID.
     * @param id - The ID of the SAP target element.
     * @returns The instantiated SapControl, or null if not found.
     */
    getControlById<T extends SapControl>(id: string): T | null {
        const el = this.$(`[id="${id}"]`);
        if (el.length === 0) return null;

        return createControl(el, this) as T;
    }
}
