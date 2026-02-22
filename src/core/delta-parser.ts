import * as cheerio from 'cheerio';
import type { SapEventResult } from './types';

/**
 * Parses SAP WDA Delta XML responses and applies the `<content-update>`
 * chunks to the provided Cheerio root instance.
 */
export class SapDeltaParser {
    /**
     * Extracts `<content-update>` and `<control-update>` tags from the raw XML,
     * applies the enclosed HTML to the DOM root, and extracts any script calls.
     *
     * @param xmlString The raw XML response string from SAP.
     * @param $ The Cheerio root instance representing the current full DOM.
     * @returns SapEventResult containing parsed new window URLs and success status.
     */
    static applyDeltaUpdates(xmlString: string, $: cheerio.CheerioAPI): SapEventResult {
        const result: SapEventResult = { isSuccess: true };

        if (!xmlString.includes('<delta-update') && !xmlString.includes('<full-update')) {
            result.isSuccess = false;
            return result;
        }

        let appliedCount = 0;

        // <content-update> applies CDATA directly as innerHTML.
        const contentRegex = /<content-update\s+[^>]*id="([^"]+)"[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/content-update>/g;
        let match;

        while ((match = contentRegex.exec(xmlString)) !== null) {
            const targetId = match[1];
            const htmlContent = match[2];

            const el = this.findElementById($, targetId);
            if (el && el.length > 0) {
                el.html(htmlContent);
                appliedCount++;
            }
        }

        // <control-update> wraps CDATA inside a <content> sub-element and
        // replaces the entire element (outerHTML).
        const controlRegex = /<control-update\s+[^>]*id="([^"]+)"[^>]*>[\s\S]*?<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>[\s\S]*?<\/control-update>/g;

        while ((match = controlRegex.exec(xmlString)) !== null) {
            const targetId = match[1];
            const htmlContent = match[2];

            const el = this.findElementById($, targetId);
            if (el && el.length > 0) {
                el.replaceWith(htmlContent);
                appliedCount++;
            }
        }

        const titleRegex = /<title-update><!\[CDATA\[([\s\S]*?)\]\]><\/title-update>/;
        const titleMatch = titleRegex.exec(xmlString);
        if (titleMatch && titleMatch[1]) {
            $('title').text(titleMatch[1]);
        }

        // Parse <script-call> for window interactions
        const scriptRegex = /<script-call><!\[CDATA\[([\s\S]*?)\]\]><\/script-call>/g;
        while ((match = scriptRegex.exec(xmlString)) !== null) {
            const scriptContent = match[1];

            // e.g. application.exec("openExternalWindow",{"windowId":"...","url":"..."});
            const openWindowMatch = /application\.exec\("openExternalWindow"\s*,\s*(\{.*?\})\)/.exec(scriptContent);
            if (openWindowMatch && openWindowMatch[1]) {
                try {
                    let jsonData = openWindowMatch[1];
                    // Decoder for known hex escapes like \x3a -> : and \x2f -> /
                    jsonData = jsonData.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

                    const parsedUrlJson = JSON.parse(jsonData);
                    if (parsedUrlJson && parsedUrlJson.url) {
                        result.newWindowUrl = parsedUrlJson.url;
                    }
                } catch (e) {
                    console.error("[SapDeltaParser] Failed to parse openExternalWindow script call data", e);
                }
            }
        }

        return result;
    }

    /**
     * Finds a DOM element by its exact ID attribute.
     * Utilizes attribute selector with a manual fallback for IDs containing dots or colons.
     */
    private static findElementById($: cheerio.CheerioAPI, targetId: string): cheerio.Cheerio<any> | null {
        let el: any = $(`[id="${targetId}"]`);
        if (el.length === 0) {
            el = $('*').filter((_, node) => $(node).attr('id') === targetId) as any;
        }
        return el.length > 0 ? el : null;
    }
}
